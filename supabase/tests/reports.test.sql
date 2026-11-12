-- Tests for report_stats() and send_report() (progress reports, Zap 2).
--
-- How to run: Supabase → SQL Editor → paste this file → Run.
-- It ALWAYS ends with an error on purpose:
--   "TESTS PASSED (…): rolling back"  → every check passed;
--   "FAIL: …"                         → the first check that failed.
-- Either way the error rolls everything back, so the test reports it sends
-- are never saved and no webhook request (no email) is ever sent.

do $$
declare
  checks int := 0;
  a uuid;
  b uuid;
  a_email text;
  stats jsonb;
  expected_workouts int;
  expected_minutes int;
  report public.reports;
  n int;
  queued_before bigint;
  payload jsonb;
  has_webhook boolean;
begin
  -- Two different users who have plans.
  select p.user_id into a from public.plans p group by p.user_id order by min(p.created_at) limit 1;
  select p.user_id into b from public.plans p where p.user_id <> a group by p.user_id order by min(p.created_at) limit 1;
  if a is null or b is null then
    raise exception 'TESTS PASSED (0 checks; skipped: needs two users with plans): rolling back';
  end if;
  select u.email into a_email from auth.users u where u.id = a;
  -- The report covers 7 calendar days: today and the 6 before it.
  select count(*), coalesce(sum(w.duration_min), 0) into expected_workouts, expected_minutes
  from public.workouts w where w.user_id = a and w.created_at >= (current_date - 6)::timestamptz;
  has_webhook := exists (select 1 from pg_trigger where tgname = 'reports_to_zapier'
                         and tgrelid = 'public.reports'::regclass);
  select count(*) into queued_before from net.http_request_queue;

  -- report_stats() as A counts exactly A's last 7 days.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'email', a_email)::text, true);
  perform set_config('role', 'authenticated', true);
  stats := public.report_stats(7);
  if (stats ->> 'workouts')::int <> expected_workouts or (stats ->> 'minutes')::int <> expected_minutes then
    raise exception 'FAIL: report_stats should count A''s % workouts / % min, got %', expected_workouts, expected_minutes, stats;
  end if;
  if stats ->> 'summary' is null or stats ->> 'period_end' <> to_char(now(), 'YYYY-MM-DD') then
    raise exception 'FAIL: report_stats should give a summary and end today, got %', stats;
  end if;
  checks := checks + 1;

  -- send_report() stores the report as A, with the same numbers and A's email.
  report := public.send_report();
  if report.user_id <> a or report.athlete_email is distinct from a_email
     or report.summary <> stats ->> 'summary' or (report.stats ->> 'workouts')::int <> expected_workouts then
    raise exception 'FAIL: send_report should store A''s report, got % / %', report.summary, report.stats;
  end if;
  checks := checks + 1;

  -- A second report straight away is refused (no inbox flooding).
  begin
    perform public.send_report();
    raise exception 'FAIL: a second report within 5 minutes should be refused';
  exception when sqlstate 'P0001' then
    if sqlerrm not like 'You sent a report%' then raise; end if;
  end;
  checks := checks + 1;

  -- Reports can't be written directly, only through send_report().
  begin
    insert into public.reports (period_start, period_end, summary, stats)
    values (current_date, current_date, 'Forged', '{}'::jsonb);
    raise exception 'FAIL: a direct insert into reports should be refused';
  exception when insufficient_privilege then
    null;
  end;
  checks := checks + 1;

  -- B sees none of A's reports, and B's stats are B's own.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.reports r where r.user_id = a;
  if n <> 0 then raise exception 'FAIL: B should not see A''s reports, saw %', n; end if;
  stats := public.report_stats(7);
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.workouts w where w.user_id = b and w.created_at >= (current_date - 6)::timestamptz;
  if (stats ->> 'workouts')::int <> n then
    raise exception 'FAIL: B''s report_stats should count B''s % workouts, got %', n, stats ->> 'workouts';
  end if;
  checks := checks + 1;

  -- A visitor who isn't signed in can call neither function.
  perform set_config('role', 'anon', true);
  begin
    perform public.send_report();
    raise exception 'FAIL: anon should not be able to send a report';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.report_stats(7);
    raise exception 'FAIL: anon should not be able to read report stats';
  exception when insufficient_privilege then
    null;
  end;
  perform set_config('role', 'postgres', true);
  checks := checks + 1;

  -- With Zap 2's webhook in place, the report's INSERT queues exactly one request carrying it.
  if has_webhook then
    if (select count(*) from net.http_request_queue) - queued_before <> 1 then
      raise exception 'FAIL: expected exactly one webhook request (one report sent)';
    end if;
    select convert_from(q.body, 'UTF8')::jsonb into payload from net.http_request_queue q order by q.id desc limit 1;
    if payload ->> 'table' <> 'reports' or payload #>> '{record,summary}' is distinct from report.summary then
      raise exception 'FAIL: the webhook payload should carry the report, got %', payload;
    end if;
    checks := checks + 1;
  end if;

  raise exception 'TESTS PASSED (% checks%): rolling back', checks,
    case when has_webhook then '' else '; webhook check skipped: reports_to_zapier not created yet' end;
end
$$;
