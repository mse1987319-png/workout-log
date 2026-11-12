-- Tests for the goals table: Row Level Security (owners only) and its checks.
--
-- How to run: Supabase → SQL Editor → paste this file → Run.
-- It ALWAYS ends with an error on purpose:
--   "TESTS PASSED (…): rolling back"  → every check passed;
--   "FAIL: …"                         → the first check that failed.
-- Either way the error rolls everything back, so no test goal is kept.

do $$
declare
  checks int := 0;
  a uuid;
  b uuid;
  goal public.goals;
  n int;
begin
  -- Two different users who have plans.
  select p.user_id into a from public.plans p group by p.user_id order by min(p.created_at) limit 1;
  select p.user_id into b from public.plans p where p.user_id <> a group by p.user_id order by min(p.created_at) limit 1;
  if a is null or b is null then
    raise exception 'TESTS PASSED (0 checks; skipped: needs two users with plans): rolling back';
  end if;

  -- A adds a goal; the database fills in A as its owner.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.goals (exercise, target_kg, target_date)
  values ('Squat', 120, current_date + 49)
  returning * into goal;
  if goal.user_id is distinct from a then
    raise exception 'FAIL: a new goal should belong to A, got %', goal.user_id;
  end if;
  checks := checks + 1;

  -- The checks refuse a goal of 0 kg, without an exercise, or without a date.
  begin
    insert into public.goals (exercise, target_kg, target_date) values ('Squat', 0, current_date);
    raise exception 'FAIL: a 0 kg goal should be refused';
  exception when check_violation then
    null;
  end;
  begin
    insert into public.goals (exercise, target_kg, target_date) values ('   ', 100, current_date);
    raise exception 'FAIL: a goal without an exercise should be refused';
  exception when check_violation then
    null;
  end;
  begin
    insert into public.goals (exercise, target_kg, target_date) values ('Squat', 100, null);
    raise exception 'FAIL: a goal without a date should be refused';
  exception when not_null_violation then
    null;
  end;
  checks := checks + 1;

  -- A can't add a goal in B's name.
  begin
    insert into public.goals (user_id, exercise, target_kg, target_date) values (b, 'Squat', 100, current_date);
    raise exception 'FAIL: A should not be able to add a goal for B';
  exception when insufficient_privilege then
    null;
  end;
  checks := checks + 1;

  -- B can't see, change or delete A's goal.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.goals g where g.id = goal.id;
  if n <> 0 then raise exception 'FAIL: B should not see A''s goal'; end if;
  update public.goals set target_kg = 1 where id = goal.id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B should not be able to change A''s goal'; end if;
  delete from public.goals where id = goal.id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B should not be able to delete A''s goal'; end if;
  checks := checks + 1;

  -- A visitor who isn't signed in sees no goals (no policy for anon means no rows).
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
  begin
    select count(*) into n from public.goals;
  exception when insufficient_privilege then
    n := 0;
  end;
  if n <> 0 then raise exception 'FAIL: anon should see no goals, saw %', n; end if;
  perform set_config('role', 'authenticated', true);
  checks := checks + 1;

  -- A can change and delete their own goal.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  update public.goals set target_kg = 125 where id = goal.id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A should be able to change their own goal'; end if;
  delete from public.goals where id = goal.id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A should be able to delete their own goal'; end if;
  perform set_config('role', 'postgres', true);
  checks := checks + 1;

  raise exception 'TESTS PASSED (% checks): rolling back', checks;
end
$$;
