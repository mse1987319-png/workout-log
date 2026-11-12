-- Tests for editing and deleting plans: owners can, assigned athletes can't,
-- and a plan that athletes have logged workouts under can't be deleted.
--
-- How to run: Supabase → SQL Editor → paste this file → Run.
-- It ALWAYS ends with an error on purpose:
--   "TESTS PASSED (…): rolling back"  → every check passed;
--   "FAIL: …"                         → the first check that failed.
-- Either way the error rolls everything back: the test users, plans and
-- workouts are never kept, and the workouts' webhook requests are never sent.

do $$
declare
  checks int := 0;
  coach uuid := gen_random_uuid();       -- a test instructor
  a uuid := gen_random_uuid();           -- a test athlete who shares with them
  own_plan uuid;
  coach_plan uuid;
  own_workout uuid;
  athlete_workout uuid;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (coach, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'sql-test-coach@example.com', '{"role": "instructor"}', '{}', now(), now()),
         (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'sql-test-athlete@example.com', '{}', '{}', now(), now());
  insert into public.instructor_links (instructor_id, athlete_id) values (coach, a);

  -- 1. An owner edits their own plan.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.plans (name, goal) values ('SQL test: mine', 'old goal') returning id into own_plan;
  update public.plans set name = 'SQL test: renamed', goal = null where id = own_plan;
  get diagnostics n = row_count;
  if n <> 1 or not exists (select 1 from public.plans p where p.id = own_plan and p.name = 'SQL test: renamed' and p.goal is null) then
    raise exception 'FAIL: an owner should be able to edit their own plan';
  end if;
  checks := checks + 1;

  -- 2. The instructor assigns their plan to the athlete; the athlete can read it but not edit or delete it.
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);
  insert into public.plans (name) values ('SQL test: coach plan') returning id into coach_plan;
  insert into public.plan_assignments (plan_id, athlete_id) values (coach_plan, a);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.plans p where p.id = coach_plan;
  if n <> 1 then raise exception 'FAIL: the athlete should see the assigned plan'; end if;
  update public.plans set name = 'Hacked' where id = coach_plan;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: an athlete should not be able to edit an assigned plan'; end if;
  delete from public.plans where id = coach_plan;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: an athlete should not be able to delete an assigned plan'; end if;
  checks := checks + 1;

  -- 3. The athlete logs a workout under the assigned plan: the instructor can no longer delete that plan.
  insert into public.workouts (plan_id, title, type, duration_min)
  values (coach_plan, 'SQL test: athlete workout', 'other', 30) returning id into athlete_workout;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);
  begin
    delete from public.plans where id = coach_plan;
    raise exception 'FAIL: a plan athletes logged workouts under should not be deletable';
  exception when foreign_key_violation then
    if sqlerrm not like 'Athletes have logged workouts under this plan%' then raise; end if;
  end;
  if not exists (select 1 from public.plans p where p.id = coach_plan) then
    raise exception 'FAIL: the refused delete should leave the plan in place';
  end if;
  checks := checks + 1;

  -- 4. Once those workouts are gone, the instructor can delete the plan.
  perform set_config('role', 'postgres', true);
  delete from public.workouts where id = athlete_workout;
  perform set_config('role', 'authenticated', true);
  delete from public.plans where id = coach_plan;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the instructor should be able to delete a plan nobody logged under'; end if;
  checks := checks + 1;

  -- 5. An owner deletes their own plan: their workouts and sets go with it.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.workouts (plan_id, title, type, duration_min)
  values (own_plan, 'SQL test: own workout', 'strength', 40) returning id into own_workout;
  insert into public.workout_sets (workout_id, exercise, set_no, reps, weight_kg)
  values (own_workout, 'Squat', 1, 5, 100);
  delete from public.plans where id = own_plan;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: an owner should be able to delete their own plan'; end if;
  perform set_config('role', 'postgres', true);
  if exists (select 1 from public.workouts w where w.id = own_workout)
     or exists (select 1 from public.workout_sets s where s.workout_id = own_workout) then
    raise exception 'FAIL: deleting a plan should delete its workouts and their sets';
  end if;
  checks := checks + 1;

  -- 6. Deleting an ACCOUNT must still work when athletes logged under its plans
  --    (the protection is for people deleting a plan, not for removing a user).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);
  insert into public.plans (name) values ('SQL test: second coach plan') returning id into coach_plan;
  insert into public.plan_assignments (plan_id, athlete_id) values (coach_plan, a);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.workouts (plan_id, title, type, duration_min)
  values (coach_plan, 'SQL test: athlete workout 2', 'other', 20);
  perform set_config('role', 'postgres', true);
  delete from auth.users where id = coach;
  if exists (select 1 from public.plans p where p.id = coach_plan) then
    raise exception 'FAIL: deleting the instructor''s account should delete their plans';
  end if;
  checks := checks + 1;

  raise exception 'TESTS PASSED (% checks): rolling back', checks;
end
$$;
