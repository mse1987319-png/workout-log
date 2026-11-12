-- Tests for the instructor_emails column (who Zap 1 and Zap 2 email).
--
-- How to run: Supabase → SQL Editor → paste this file → Run.
-- It ALWAYS ends with an error on purpose:
--   "TESTS PASSED (…): rolling back"  → every check passed;
--   "FAIL: …"                         → the first check that failed.
-- Either way the error rolls everything back, so the test rows are never
-- saved and no webhook request (no email) is ever sent.

do $$
declare
  checks int := 0;
  a uuid;
  a_email text;
  a_plan uuid;
  expected text;
  w public.workouts;
  r public.reports;
begin
  -- An athlete who shares with at least one instructor, and one of their plans.
  select l.athlete_id into a
  from public.instructor_links l
  where exists (select 1 from public.plans p where p.user_id = l.athlete_id)
  order by l.created_at limit 1;
  if a is null then
    raise exception 'TESTS PASSED (0 checks; skipped: needs an athlete with a plan who shares with an instructor): rolling back';
  end if;
  select p.id into a_plan from public.plans p where p.user_id = a order by p.created_at limit 1;
  select u.email into a_email from auth.users u where u.id = a;
  select string_agg(p.email, ', ' order by l.created_at, p.email) into expected
  from public.instructor_links l join public.profiles p on p.id = l.instructor_id
  where l.athlete_id = a;

  -- A workout logged by A carries A's instructors' emails.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'email', a_email)::text, true);
  perform set_config('role', 'authenticated', true);
  w := public.log_workout(a_plan, 'Instructor email test', 'other', 30);
  if w.instructor_emails is distinct from expected then
    raise exception 'FAIL: the workout should carry %, got %', expected, w.instructor_emails;
  end if;
  checks := checks + 1;

  -- A value sent by the app is ignored: the trigger decides the recipients.
  insert into public.workouts (plan_id, title, type, duration_min, instructor_emails)
  values (a_plan, 'Forged recipient', 'other', 10, 'someone-else@example.com')
  returning * into w;
  if w.instructor_emails is distinct from expected then
    raise exception 'FAIL: a forged instructor_emails should be overwritten with %, got %', expected, w.instructor_emails;
  end if;
  checks := checks + 1;

  -- An edit can't change who was emailed.
  update public.workouts set title = 'Renamed', instructor_emails = 'someone-else@example.com'
  where id = w.id returning * into w;
  if w.title <> 'Renamed' or w.instructor_emails is distinct from expected then
    raise exception 'FAIL: an update should keep instructor_emails %, got %', expected, w.instructor_emails;
  end if;
  checks := checks + 1;

  -- A report sent by A carries them too.
  r := public.send_report();
  if r.instructor_emails is distinct from expected then
    raise exception 'FAIL: the report should carry %, got %', expected, r.instructor_emails;
  end if;
  checks := checks + 1;

  -- Once A stops sharing, new workouts and reports have no recipient (NULL).
  perform set_config('role', 'postgres', true);
  delete from public.instructor_links where athlete_id = a;
  delete from public.reports where id = r.id;
  perform set_config('role', 'authenticated', true);
  w := public.log_workout(a_plan, 'Not shared', 'other', 20);
  if w.instructor_emails is not null then
    raise exception 'FAIL: with no instructor the workout should carry NULL, got %', w.instructor_emails;
  end if;
  r := public.send_report();
  if r.instructor_emails is not null then
    raise exception 'FAIL: with no instructor the report should carry NULL, got %', r.instructor_emails;
  end if;
  checks := checks + 1;

  perform set_config('role', 'postgres', true);
  raise exception 'TESTS PASSED (% checks): rolling back', checks;
end
$$;
