-- Workout Log: database schema for Supabase (PostgreSQL)
--
-- Table A `plans` → table B `workouts` (workouts.plan_id → plans.id).
-- Row Level Security: every user sees and changes only their own rows
-- (course deck, slide 9). A new row in `workouts` is the event that the
-- Supabase Database Webhook sends to Zapier (see docs/zapier.md).
--
-- How to run: Supabase → SQL Editor → New query → paste this file → Run.
-- Running it again is safe: tables and indexes are created only when
-- missing, and every policy is dropped and created again.

-- ---------------------------------------------------------------------------
-- Table A: plans
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,
  name        text        not null check (char_length(btrim(name)) between 1 and 100),
  goal        text        check (char_length(goal) <= 300),
  created_at  timestamptz not null default now()
);

comment on table public.plans is
  'Table A: workout plans. Each plan belongs to one user (user_id).';

-- ---------------------------------------------------------------------------
-- Table B: workouts (the Database Webhook fires here)
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id            uuid        primary key default gen_random_uuid(),
  plan_id       uuid        not null references public.plans (id) on delete cascade,
  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,
  title         text        not null check (char_length(btrim(title)) between 1 and 100),
  type          text        not null check (type in ('strength', 'other')),
  duration_min  integer     not null check (duration_min between 1 and 1440),
  created_at    timestamptz not null default now()
);

comment on table public.workouts is
  'Table B: logged workouts. type (strength / other) is the routing field for Zapier Paths.';

create index if not exists plans_user_id_idx    on public.plans (user_id);
create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workouts_plan_id_idx on public.workouts (plan_id);

-- The app reaches these tables as the signed-in role `authenticated`.
grant select, insert, update, delete on public.plans    to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security (slide 9): every rule is "user_id = auth.uid()".
-- Visitors who are not signed in (role anon) get no policy, so no rows.
-- ---------------------------------------------------------------------------
alter table public.plans    enable row level security;
alter table public.workouts enable row level security;

-- plans ---------------------------------------------------------------------
drop policy if exists "Read own plans" on public.plans;
create policy "Read own plans" on public.plans
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Add own plans" on public.plans;
create policy "Add own plans" on public.plans
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Edit own plans" on public.plans;
create policy "Edit own plans" on public.plans
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Delete own plans" on public.plans;
create policy "Delete own plans" on public.plans
  for delete to authenticated
  using (user_id = auth.uid());

-- workouts ------------------------------------------------------------------
-- Same rules, plus: a workout can only be filed under one of my own plans.
-- (A foreign key alone would accept any existing plan id, even another
-- user's, because foreign key checks ignore Row Level Security.)
drop policy if exists "Read own workouts" on public.workouts;
create policy "Read own workouts" on public.workouts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Add workouts to own plans" on public.workouts;
create policy "Add workouts to own plans" on public.workouts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.plans p
      where p.id = workouts.plan_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Edit own workouts" on public.workouts;
create policy "Edit own workouts" on public.workouts
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.plans p
      where p.id = workouts.plan_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Delete own workouts" on public.workouts;
create policy "Delete own workouts" on public.workouts
  for delete to authenticated
  using (user_id = auth.uid());

-- ===========================================================================
-- Extended tier: exercises, sets, reps, weights and cardio details
-- (implementation plan §5). Additive: the Core app keeps working without it.
-- ===========================================================================

-- Cardio and other activities: optional details on a workout --------------------
alter table public.workouts
  add column if not exists activity text
    check (activity in ('run', 'bike', 'swim', 'walk', 'row', 'other')),
  add column if not exists distance_km numeric(6, 2)
    check (distance_km > 0 and distance_km <= 1000),
  add column if not exists notes text
    check (char_length(notes) <= 500),
  -- One line about the sets, written by log_workout() into the row it
  -- inserts, so the Database Webhook (and the instructor's email) carries it:
  -- "Squat: 2 × 5 @ 100 kg, 5 @ 102.5 kg; Pull-up: 3 × 8 (bodyweight)".
  add column if not exists sets_summary text;

-- Sets of a strength workout -------------------------------------------------------
create table if not exists public.workout_sets (
  id          uuid          primary key default gen_random_uuid(),
  workout_id  uuid          not null references public.workouts (id) on delete cascade,
  user_id     uuid          not null default auth.uid()
                            references auth.users (id) on delete cascade,
  exercise    text          not null check (char_length(btrim(exercise)) between 1 and 60),
  -- Position of the set within the whole workout (1, 2, 3 …): keeps the order
  -- in which the athlete entered exercises and sets.
  set_no      integer       not null check (set_no between 1 and 100),
  reps        integer       not null check (reps between 1 and 1000),
  weight_kg   numeric(6, 2) not null default 0 check (weight_kg between 0 and 1000),
  -- Copied from the workout, so "last time" lookups need no join.
  created_at  timestamptz   not null default now(),
  unique (workout_id, set_no)
);

comment on table public.workout_sets is
  'Exercises, sets, reps and weights of a strength workout. set_no = order within the workout; weight_kg 0 = bodyweight.';

create index if not exists workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index if not exists workout_sets_user_exercise_idx
  on public.workout_sets (user_id, lower(exercise), created_at desc);

grant select, insert, update, delete on public.workout_sets to authenticated;

alter table public.workout_sets enable row level security;

drop policy if exists "Read own sets" on public.workout_sets;
create policy "Read own sets" on public.workout_sets
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Add sets to own workouts" on public.workout_sets;
create policy "Add sets to own workouts" on public.workout_sets
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "Edit own sets" on public.workout_sets;
create policy "Edit own sets" on public.workout_sets
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "Delete own sets" on public.workout_sets;
create policy "Delete own sets" on public.workout_sets
  for delete to authenticated
  using (user_id = auth.uid());

-- One-line summary of a list of sets (the p_sets payload of log_workout) ----------
-- Exercises in entry order; equal sets in a row are counted ("2 × 5 @ 100 kg");
-- 0 kg reads as bodyweight. Same wording as the app. NULL when there are no sets.
create or replace function public.format_sets(p_sets jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  with s as (
    select row_number() over (order by x.set_no) as n,
           btrim(x.exercise) as exercise,
           lower(btrim(x.exercise)) as exercise_key,
           x.reps,
           coalesce(x.weight_kg, 0) as kg
    from jsonb_to_recordset(coalesce(p_sets, '[]'::jsonb))
      as x(exercise text, set_no integer, reps integer, weight_kg numeric)
  ),
  marked as (
    select s.*,
           case when lag(exercise_key) over w is distinct from exercise_key then 1 else 0 end as new_exercise,
           case when lag(exercise_key) over w is distinct from exercise_key
                  or lag(reps) over w is distinct from reps
                  or lag(kg) over w is distinct from kg then 1 else 0 end as new_run
    from s
    window w as (order by n)
  ),
  grouped as (
    select marked.*,
           sum(new_exercise) over (order by n) as exercise_no,
           sum(new_run) over (order by n) as run_no
    from marked
  ),
  runs as (
    select exercise_no, min(n) as first_n,
           (case when count(*) > 1 then count(*) || ' × ' || min(reps) else min(reps)::text end)
           || (case when min(kg) > 0 then ' @ ' || trim_scale(min(kg))::text || ' kg' else ' (bodyweight)' end) as text
    from grouped
    group by exercise_no, run_no
  ),
  exercises as (
    select g.exercise_no, min(g.n) as first_n, (array_agg(g.exercise order by g.n))[1] as name
    from grouped g
    group by g.exercise_no
  )
  select string_agg(
           e.name || ': ' || (select string_agg(r.text, ', ' order by r.first_n) from runs r where r.exercise_no = e.exercise_no),
           '; ' order by e.first_n)
  from exercises e;
$$;

revoke execute on function public.format_sets(jsonb) from public, anon;
grant execute on function public.format_sets(jsonb) to authenticated;

-- Log a workout and its sets in ONE transaction ----------------------------------
-- The app calls this instead of inserting into workouts directly, so a workout
-- is never saved without its sets. It runs as the caller (security invoker),
-- so every Row Level Security policy above still applies. The INSERT into
-- workouts still fires the Database Webhook once; if anything fails, nothing
-- is saved and no webhook request is sent.
create or replace function public.log_workout(
  p_plan_id      uuid,
  p_title        text,
  p_type         text,
  p_duration_min integer,
  p_activity     text    default null,
  p_distance_km  numeric default null,
  p_notes        text    default null,
  p_sets         jsonb   default '[]'::jsonb
)
returns public.workouts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.workouts;
begin
  if p_type <> 'strength' and jsonb_array_length(coalesce(p_sets, '[]'::jsonb)) > 0 then
    raise exception 'Only strength workouts have sets' using errcode = '22023';
  end if;

  -- The summary goes into the same INSERT, so the webhook payload carries it.
  insert into public.workouts (plan_id, title, type, duration_min, activity, distance_km, notes, sets_summary)
  values (p_plan_id, p_title, p_type, p_duration_min, p_activity, p_distance_km, p_notes,
          public.format_sets(p_sets))
  returning * into saved;

  insert into public.workout_sets (workout_id, exercise, set_no, reps, weight_kg, created_at)
  select saved.id, s.exercise, s.set_no, s.reps, coalesce(s.weight_kg, 0), saved.created_at
  from jsonb_to_recordset(coalesce(p_sets, '[]'::jsonb))
    as s(exercise text, set_no integer, reps integer, weight_kg numeric);

  return saved;
end;
$$;

revoke execute on function public.log_workout(uuid, text, text, integer, text, numeric, text, jsonb)
  from public, anon;
grant execute on function public.log_workout(uuid, text, text, integer, text, numeric, text, jsonb)
  to authenticated;

-- ===========================================================================
-- Extended tier: progress reports for the instructor (Zap 2)
-- ===========================================================================
-- A report is created only by send_report(), from the caller's own data, so
-- its numbers and text can't be forged. Its INSERT fires the second Database
-- Webhook (reports_to_zapier → Zap 2 → Gmail). The recipient lives in
-- Zapier, never in the database.
create table if not exists public.reports (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  athlete_email  text,
  period_start   date        not null,
  period_end     date        not null,
  summary        text        not null,
  stats          jsonb       not null,
  created_at     timestamptz not null default now()
);

comment on table public.reports is
  'Progress reports sent to the instructor. Written only by send_report(); one row = one email (Zap 2).';

create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);

grant select on public.reports to authenticated;

alter table public.reports enable row level security;

-- Read your own reports. There is no insert/update policy: only send_report() writes.
drop policy if exists "Read own reports" on public.reports;
create policy "Read own reports" on public.reports
  for select to authenticated
  using (user_id = auth.uid());

-- The numbers of the last p_days calendar days (today and the days before),
-- for the signed-in user only, plus a one-line summary for the email:
-- "Nov 6 – Nov 12: 4 workouts (3 strength, 1 other), 215 min, 42 sets.
--  Heaviest: Squat 110 kg, Deadlift 120 kg. Distance: 9 km."
-- Filters on auth.uid() itself, so it is also safe inside send_report().
create or replace function public.report_stats(p_days integer default 7)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with period as (
    select current_date - (p_days - 1) as start_day, current_date as end_day
  ),
  w as (
    select w.* from public.workouts w, period
    where w.user_id = auth.uid() and w.created_at >= period.start_day::timestamptz
  ),
  s as (
    select s.* from public.workout_sets s, period
    where s.user_id = auth.uid() and s.created_at >= period.start_day::timestamptz
  ),
  heaviest as (
    select (array_agg(btrim(s.exercise) order by s.created_at desc))[1] as exercise,
           max(s.weight_kg) as kg
    from s
    where s.weight_kg > 0
    group by lower(btrim(s.exercise))
    order by max(s.weight_kg) desc
    limit 3
  ),
  n as (
    select
      (select count(*) from w)::int as workouts,
      (select count(*) from w where w.type = 'strength')::int as strength_workouts,
      (select count(*) from w where w.type = 'other')::int as other_workouts,
      (select coalesce(sum(w.duration_min), 0) from w)::int as minutes,
      (select coalesce(sum(w.duration_min), 0) from w where w.type = 'strength')::int as strength_minutes,
      (select coalesce(sum(w.duration_min), 0) from w where w.type = 'other')::int as other_minutes,
      (select coalesce(sum(w.distance_km), 0) from w) as distance_km,
      (select count(*) from s)::int as sets
  ),
  heaviest_text as (
    select string_agg(h.exercise || ' ' || trim_scale(h.kg)::text || ' kg', ', ' order by h.kg desc) as text,
           coalesce(jsonb_agg(jsonb_build_object('exercise', h.exercise, 'kg', h.kg) order by h.kg desc),
                    '[]'::jsonb) as list
    from heaviest h
  )
  select jsonb_build_object(
    'days', p_days,
    'period_start', to_char(period.start_day, 'YYYY-MM-DD'),
    'period_end', to_char(period.end_day, 'YYYY-MM-DD'),
    'workouts', n.workouts,
    'strength_workouts', n.strength_workouts,
    'other_workouts', n.other_workouts,
    'minutes', n.minutes,
    'strength_minutes', n.strength_minutes,
    'other_minutes', n.other_minutes,
    'distance_km', trim_scale(n.distance_km),
    'sets', n.sets,
    'heaviest', heaviest_text.list,
    'summary',
      to_char(period.start_day, 'Mon FMDD') || ' – ' || to_char(period.end_day, 'Mon FMDD') || ': '
      || case
           when n.workouts = 0 then 'no workouts logged.'
           else n.workouts || case when n.workouts = 1 then ' workout' else ' workouts' end
                || ' (' || n.strength_workouts || ' strength, ' || n.other_workouts || ' other), '
                || n.minutes || ' min'
                || case when n.sets = 0 then '' when n.sets = 1 then ', 1 set' else ', ' || n.sets || ' sets' end
                || '.'
                || coalesce(' Heaviest: ' || heaviest_text.text || '.', '')
                || case when n.distance_km > 0 then ' Distance: ' || trim_scale(n.distance_km)::text || ' km.' else '' end
         end
  )
  from period, n, heaviest_text;
$$;

-- Saves the caller's report (at most one per 5 minutes, so the instructor's
-- inbox can't be flooded). Runs as the table owner because users may not
-- insert into reports themselves; everything it reads is filtered to auth.uid().
create or replace function public.send_report()
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  numbers jsonb;
  saved public.reports;
begin
  if me is null then
    raise exception 'Log in to send a report.' using errcode = '42501';
  end if;
  if exists (select 1 from public.reports r where r.user_id = me and r.created_at > now() - interval '5 minutes') then
    raise exception 'You sent a report a few minutes ago. Wait a little before sending another.';
  end if;

  numbers := public.report_stats(7);
  insert into public.reports (user_id, athlete_email, period_start, period_end, summary, stats)
  values (me, auth.jwt() ->> 'email', (numbers ->> 'period_start')::date, (numbers ->> 'period_end')::date,
          numbers ->> 'summary', numbers - 'summary')
  returning * into saved;
  return saved;
end;
$$;

revoke execute on function public.report_stats(integer) from public, anon;
grant execute on function public.report_stats(integer) to authenticated;
revoke execute on function public.send_report() from public, anon;
grant execute on function public.send_report() to authenticated;

-- Let the REST API see the new tables right away.
notify pgrst, 'reload schema';
