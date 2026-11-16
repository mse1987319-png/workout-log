-- Extended tier: offline logging (v5)
-- Tests for log_workout() with the id and time from the phone (p_id,
-- p_logged_at) and for schema_version().
--
-- How to run: Supabase → SQL Editor → paste this file → Run.
-- It ALWAYS ends with an error on purpose:
--   "TESTS PASSED (…): rolling back"  → every check passed;
--   "FAIL: …"                         → the first check that failed.
-- Either way the error rolls everything back, so the test workouts it logs
-- are never saved and no webhook request (no email) is ever sent.

do $$
declare
  checks int := 0;
  athlete uuid;
  plan uuid;
  saved public.workouts;
  wid uuid := gen_random_uuid();
  logged timestamptz := now() - interval '2 hours';
  n int;
  queued_before bigint;
begin
  if public.schema_version() is distinct from 5 then
    raise exception 'FAIL: schema_version() should be 5';
  end if;
  checks := checks + 1;

  select p.user_id, p.id into athlete, plan from public.plans p order by p.created_at limit 1;
  if athlete is null then
    raise exception 'TESTS PASSED (% checks; log_workout skipped: no user with a plan yet): rolling back', checks;
  end if;
  select count(*) into queued_before from net.http_request_queue;
  perform set_config('request.jwt.claims', json_build_object('sub', athlete, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- The id made on the phone and the time Save was pressed are kept (sets too).
  saved := public.log_workout(plan, 'Offline test', 'strength', 30, null, null, null,
    '[{"exercise": "Squat", "set_no": 1, "reps": 5, "weight_kg": 100}]'::jsonb, wid, logged);
  if saved.id is distinct from wid then raise exception 'FAIL: the workout should keep the id from the phone'; end if;
  if saved.created_at is distinct from logged then raise exception 'FAIL: created_at should be the logged time, got %', saved.created_at; end if;
  if (select min(created_at) from public.workout_sets where workout_id = wid) is distinct from logged then
    raise exception 'FAIL: the sets should get the logged time';
  end if;
  checks := checks + 3;

  -- Sent again: the saved workout comes back, nothing is saved twice.
  saved := public.log_workout(plan, 'Offline test', 'strength', 30, null, null, null,
    '[{"exercise": "Squat", "set_no": 1, "reps": 5, "weight_kg": 100}]'::jsonb, wid, logged);
  select count(*) into n from public.workouts where id = wid;
  if saved.id is distinct from wid or n <> 1 then raise exception 'FAIL: a resend should return the saved workout, rows: %', n; end if;
  select count(*) into n from public.workout_sets where workout_id = wid;
  if n <> 1 then raise exception 'FAIL: a resend should not save the sets again, sets: %', n; end if;
  checks := checks + 2;

  -- A time in the future or older than 30 days is replaced by the server's time.
  saved := public.log_workout(plan, 'Future', 'other', 20, null, null, null, '[]'::jsonb, gen_random_uuid(), now() + interval '1 hour');
  if saved.created_at is distinct from now() then raise exception 'FAIL: a future time should become now()'; end if;
  saved := public.log_workout(plan, 'Too old', 'other', 20, null, null, null, '[]'::jsonb, gen_random_uuid(), now() - interval '31 days');
  if saved.created_at is distinct from now() then raise exception 'FAIL: a time older than 30 days should become now()'; end if;
  checks := checks + 2;

  -- The call the live app on main sends (no p_id, no p_logged_at) still works.
  saved := public.log_workout(plan, 'Old style', 'other', 25, null, null, null, '[]'::jsonb);
  if saved.id is null or saved.created_at is distinct from now() then raise exception 'FAIL: the old-style call should still work'; end if;
  checks := checks + 1;

  -- One webhook request per saved workout (4), none for the resend.
  perform set_config('role', 'postgres', true);
  if exists (select 1 from pg_trigger where tgname = 'workouts_to_zapier' and tgrelid = 'public.workouts'::regclass) then
    if (select count(*) from net.http_request_queue) - queued_before <> 4 then
      raise exception 'FAIL: expected 4 webhook requests (one per saved workout, none for the resend)';
    end if;
    checks := checks + 1;
  end if;

  raise exception 'TESTS PASSED (% checks): rolling back', checks;
end
$$;
