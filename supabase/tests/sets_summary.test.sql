-- Tests for format_sets() and the sets_summary that log_workout() writes for
-- the instructor's email.
--
-- How to run: Supabase → SQL Editor → paste this file → Run.
-- It ALWAYS ends with an error on purpose:
--   "TESTS PASSED (…): rolling back"  → every check passed;
--   "FAIL: …"                         → the first check that failed.
-- Either way the error rolls everything back, so the test workouts it logs
-- are never saved and no webhook request (no email) is ever sent.

do $$
declare
  got text;
  checks int := 0;
  athlete uuid;
  plan uuid;
  saved public.workouts;
  queued_before bigint;
  payload jsonb;
begin
  -- format_sets(): equal sets in a row are counted; exercises in entry order.
  got := public.format_sets('[
    {"exercise": "Squat",   "set_no": 1, "reps": 5, "weight_kg": 100},
    {"exercise": "Squat",   "set_no": 2, "reps": 5, "weight_kg": 100},
    {"exercise": "Squat",   "set_no": 3, "reps": 5, "weight_kg": 102.5},
    {"exercise": "Pull-up", "set_no": 4, "reps": 8, "weight_kg": 0},
    {"exercise": "Pull-up", "set_no": 5, "reps": 8},
    {"exercise": "Pull-up", "set_no": 6, "reps": 6}
  ]'::jsonb);
  if got is distinct from 'Squat: 2 × 5 @ 100 kg, 5 @ 102.5 kg; Pull-up: 2 × 8 (bodyweight), 6 (bodyweight)' then
    raise exception 'FAIL: counted runs and exercise order, got %', got;
  end if;
  checks := checks + 1;

  -- Sets are read in set_no order, whatever the order in the payload.
  got := public.format_sets('[
    {"exercise": "Bench press", "set_no": 2, "reps": 8, "weight_kg": 62.5},
    {"exercise": "Bench press", "set_no": 1, "reps": 8, "weight_kg": 60}
  ]'::jsonb);
  if got is distinct from 'Bench press: 8 @ 60 kg, 8 @ 62.5 kg' then
    raise exception 'FAIL: set_no order, got %', got;
  end if;
  checks := checks + 1;

  -- Equal sets that are not next to each other are not merged.
  got := public.format_sets('[
    {"exercise": "Squat", "set_no": 1, "reps": 5, "weight_kg": 100},
    {"exercise": "Squat", "set_no": 2, "reps": 3, "weight_kg": 110},
    {"exercise": "Squat", "set_no": 3, "reps": 5, "weight_kg": 100}
  ]'::jsonb);
  if got is distinct from 'Squat: 5 @ 100 kg, 3 @ 110 kg, 5 @ 100 kg' then
    raise exception 'FAIL: non-adjacent equal sets, got %', got;
  end if;
  checks := checks + 1;

  -- The same exercise in another case continues the group, keeping the first spelling.
  got := public.format_sets('[
    {"exercise": "Squat", "set_no": 1, "reps": 5, "weight_kg": 100},
    {"exercise": "squat", "set_no": 2, "reps": 5, "weight_kg": 100}
  ]'::jsonb);
  if got is distinct from 'Squat: 2 × 5 @ 100 kg' then
    raise exception 'FAIL: case-insensitive exercise, got %', got;
  end if;
  checks := checks + 1;

  -- No sets: no summary.
  if public.format_sets('[]'::jsonb) is not null or public.format_sets(null) is not null then
    raise exception 'FAIL: empty sets should give null';
  end if;
  checks := checks + 1;

  -- log_workout(), as a real user (any user with a plan), with RLS applied.
  select p.user_id, p.id into athlete, plan from public.plans p order by p.created_at limit 1;
  if athlete is null then
    raise exception 'TESTS PASSED (% checks; log_workout skipped: no user with a plan yet): rolling back', checks;
  end if;
  select count(*) into queued_before from net.http_request_queue;

  perform set_config('request.jwt.claims', json_build_object('sub', athlete, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  saved := public.log_workout(plan, 'Summary test', 'strength', 30, null, null, null,
    '[{"exercise": "Deadlift", "set_no": 1, "reps": 5, "weight_kg": 120},
      {"exercise": "Deadlift", "set_no": 2, "reps": 5, "weight_kg": 120}]'::jsonb);
  if saved.sets_summary is distinct from 'Deadlift: 2 × 5 @ 120 kg' then
    raise exception 'FAIL: log_workout should store the summary, got %', saved.sets_summary;
  end if;
  checks := checks + 1;

  saved := public.log_workout(plan, 'Summary test run', 'other', 25, 'run', 4, null, '[]'::jsonb);
  if saved.sets_summary is not null then
    raise exception 'FAIL: an Other workout should have no summary, got %', saved.sets_summary;
  end if;
  checks := checks + 1;

  -- The webhook request queued for the strength workout carries the summary.
  perform set_config('role', 'postgres', true);
  if exists (select 1 from pg_trigger where tgname = 'workouts_to_zapier' and tgrelid = 'public.workouts'::regclass) then
    select convert_from(q.body, 'UTF8')::jsonb into payload
    from net.http_request_queue q
    order by q.id desc offset 1 limit 1; -- the newest is the Other workout's
    if payload #>> '{record,sets_summary}' is distinct from 'Deadlift: 2 × 5 @ 120 kg'
       or payload ->> 'type' is distinct from 'INSERT' then
      raise exception 'FAIL: webhook payload should carry record.sets_summary, got %', payload;
    end if;
    if (select count(*) from net.http_request_queue) - queued_before <> 2 then
      raise exception 'FAIL: expected one webhook request per workout';
    end if;
    checks := checks + 1;
  end if;

  raise exception 'TESTS PASSED (% checks): rolling back', checks;
end
$$;
