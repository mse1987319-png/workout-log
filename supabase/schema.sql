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
    check (char_length(notes) <= 500);

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

  insert into public.workouts (plan_id, title, type, duration_min, activity, distance_km, notes)
  values (p_plan_id, p_title, p_type, p_duration_min, p_activity, p_distance_km, p_notes)
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

-- Let the REST API see the new tables right away.
notify pgrst, 'reload schema';
