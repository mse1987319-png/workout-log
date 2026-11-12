-- Tests for instructor sharing: profiles and roles, linking with an
-- instructor's code, what a linked instructor can read (only through the
-- functions, never the tables), plan assignment, and ending a link.
--
-- How to run: Supabase → SQL Editor → paste this file → Run.
-- It ALWAYS ends with an error on purpose:
--   "TESTS PASSED (…): rolling back"  → every check passed;
--   "FAIL: …"                         → the first check that failed.
-- Either way the error rolls everything back: the test instructor and user,
-- links, assignments and the test workout are never kept, and the workout's
-- webhook request (its email) is never sent.

do $$
declare
  checks int := 0;
  a uuid;                                -- demo athlete A (has plans)
  b uuid;                                -- demo athlete B (has plans)
  i uuid := gen_random_uuid();           -- a test instructor, created below
  newcomer uuid := gen_random_uuid();    -- a test user who picks no role
  code text;
  linked jsonb;
  progress jsonb;
  assigned_plan uuid;
  saved public.workouts;
  n int;
begin
  select p.user_id into a from public.plans p group by p.user_id order by min(p.created_at) limit 1;
  select p.user_id into b from public.plans p where p.user_id <> a group by p.user_id order by min(p.created_at) limit 1;
  if a is null or b is null then
    raise exception 'TESTS PASSED (0 checks; skipped: needs two users with plans): rolling back';
  end if;

  -- 1. Signing up creates a profile with the role chosen at sign-up; only
  --    instructors get a code. Everyone who signed up earlier has a profile.
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (i, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'sql-test-instructor@example.com', '{"role": "instructor"}', '{}', now(), now()),
         (newcomer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'sql-test-newcomer@example.com', '{}', '{}', now(), now());
  select p.invite_code into code from public.profiles p where p.id = i and p.role = 'instructor';
  if code is null or code !~ '^[A-HJ-NP-Z2-9]{6}$' then
    raise exception 'FAIL: a new instructor should get a profile with a 6-character code, got %', code;
  end if;
  if not exists (select 1 from public.profiles p where p.id = newcomer and p.role = 'athlete' and p.invite_code is null) then
    raise exception 'FAIL: a user who picked no role should be an athlete without a code';
  end if;
  if exists (select 1 from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)) then
    raise exception 'FAIL: every user should have a profile';
  end if;
  checks := checks + 1;

  -- 2. A links with the code (spaces and lower case are fine); linking again
  --    keeps one link; a wrong code is refused.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  linked := public.link_instructor(' ' || lower(code) || ' ');
  if (linked ->> 'instructor_id')::uuid is distinct from i or linked ->> 'email' <> 'sql-test-instructor@example.com' then
    raise exception 'FAIL: link_instructor should return the instructor, got %', linked;
  end if;
  perform public.link_instructor(code);
  select count(*) into n from public.instructor_links l where l.athlete_id = a and l.instructor_id = i;
  if n <> 1 then raise exception 'FAIL: linking twice should keep one link, found %', n; end if;
  begin
    perform public.link_instructor('not a code');
    raise exception 'FAIL: a wrong code should be refused';
  exception when sqlstate 'P0002' then
    null;
  end;
  checks := checks + 1;

  -- 3. An instructor can't link to their own code.
  perform set_config('request.jwt.claims', json_build_object('sub', i, 'role', 'authenticated')::text, true);
  begin
    perform public.link_instructor(code);
    raise exception 'FAIL: linking to your own code should be refused';
  exception when sqlstate '22023' then
    null;
  end;
  checks := checks + 1;

  -- 4. The instructor reads A through the functions...
  select count(*) into n from public.my_athletes() m where m.athlete_id = a and m.email is not null;
  if n <> 1 then raise exception 'FAIL: my_athletes should list A with an email'; end if;
  progress := public.athlete_progress(a);
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.workouts w where w.user_id = a;
  if jsonb_array_length(progress -> 'workouts') <> n then
    raise exception 'FAIL: athlete_progress should return A''s % workouts, got %', n, jsonb_array_length(progress -> 'workouts');
  end if;
  select count(*) into n from public.workout_sets s where s.user_id = a;
  if jsonb_array_length(progress -> 'sets') <> n then
    raise exception 'FAIL: athlete_progress should return A''s % sets, got %', n, jsonb_array_length(progress -> 'sets');
  end if;
  perform set_config('role', 'authenticated', true);
  -- ...but never through the tables: they stay "own rows only".
  select (select count(*) from public.workouts w where w.user_id = a)
       + (select count(*) from public.workout_sets s where s.user_id = a)
       + (select count(*) from public.goals g where g.user_id = a)
       + (select count(*) from public.reports r where r.user_id = a)
       + (select count(*) from public.plans p where p.user_id = a)
    into n;
  if n <> 0 then raise exception 'FAIL: the instructor should not read A''s tables directly, saw % rows', n; end if;
  checks := checks + 1;

  -- 5. Someone who isn't linked gets nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  begin
    perform public.athlete_progress(a);
    raise exception 'FAIL: B should not get A''s progress';
  exception when insufficient_privilege then
    null;
  end;
  select count(*) into n from public.my_athletes();
  if n <> 0 then raise exception 'FAIL: B has no athletes, got %', n; end if;
  checks := checks + 1;

  -- 6. A sees who they share with; profiles are private and roles can't be changed.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.my_instructors() m where m.instructor_id = i and m.email = 'sql-test-instructor@example.com';
  if n <> 1 then raise exception 'FAIL: my_instructors should list the instructor'; end if;
  select count(*) into n from public.profiles p where p.id <> a;
  if n <> 0 then raise exception 'FAIL: A should read only their own profile, saw % others', n; end if;
  begin
    update public.profiles set role = 'instructor' where id = a;
    get diagnostics n = row_count;
  exception when insufficient_privilege then
    n := 0;
  end;
  if n <> 0 then raise exception 'FAIL: A should not be able to change their role'; end if;
  checks := checks + 1;

  -- 7. The instructor assigns their own plan to A, but not to someone who isn't linked.
  perform set_config('request.jwt.claims', json_build_object('sub', i, 'role', 'authenticated')::text, true);
  insert into public.plans (name) values ('SQL test: 5 × 5') returning id into assigned_plan;
  insert into public.plan_assignments (plan_id, athlete_id) values (assigned_plan, a);
  begin
    insert into public.plan_assignments (plan_id, athlete_id) values (assigned_plan, b);
    raise exception 'FAIL: assigning to an athlete who is not linked should be refused';
  exception when insufficient_privilege then
    null;
  end;
  checks := checks + 1;

  -- 8. A reads the assigned plan and logs a workout under it; B can do neither.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.plans p where p.id = assigned_plan;
  if n <> 1 then raise exception 'FAIL: A should see the plan assigned to them'; end if;
  saved := public.log_workout(assigned_plan, 'SQL test: assigned plan', 'other', 30);
  if saved.user_id is distinct from a then raise exception 'FAIL: the workout should be A''s own'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.plans p where p.id = assigned_plan;
  if n <> 0 then raise exception 'FAIL: B should not see a plan assigned to A'; end if;
  begin
    perform public.log_workout(assigned_plan, 'SQL test: not assigned', 'other', 30);
    raise exception 'FAIL: B should not log a workout under a plan assigned to A';
  exception when insufficient_privilege then
    null;
  end;
  checks := checks + 1;

  -- 9. A stops sharing: the instructor loses access at once.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from public.instructor_links l where l.instructor_id = i;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A should be able to end the link, deleted %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', i, 'role', 'authenticated')::text, true);
  begin
    perform public.athlete_progress(a);
    raise exception 'FAIL: after A stops sharing, the instructor should lose access';
  exception when insufficient_privilege then
    null;
  end;
  checks := checks + 1;

  -- 10. A visitor who isn't signed in can call none of the functions.
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
  begin
    perform public.link_instructor(code);
    raise exception 'FAIL: anon should not be able to link';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.my_athletes();
    raise exception 'FAIL: anon should not be able to list athletes';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.athlete_progress(a);
    raise exception 'FAIL: anon should not be able to read progress';
  exception when insufficient_privilege then
    null;
  end;
  perform set_config('role', 'postgres', true);
  checks := checks + 1;

  raise exception 'TESTS PASSED (% checks): rolling back', checks;
end
$$;
