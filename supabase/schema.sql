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

-- Let the REST API see the new tables right away.
notify pgrst, 'reload schema';
