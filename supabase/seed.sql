-- Workout Log: demo data for a new, empty project
--
-- How to run: right after schema.sql, Supabase → SQL Editor → New query →
-- paste this file → Run. It does nothing if the project already has users,
-- so it never touches real data and running it again is safe.
--
-- It creates three demo accounts that can log in straight away, all with
-- the password  WorkoutLog-demo-2026  (README, "Demo accounts"):
--   demo.athlete.a@example.com   athlete: 8 weeks of strength training and running
--   demo.athlete.b@example.com   athlete: a beginner, with nothing logged for 8 days
--   demo.instructor@example.com  instructor with the code GYM234; both athletes share with them
-- plus plans, workouts with sets, goals, a progress report and plan
-- assignments. Dates count back from today, so charts and suggestions look current.
-- If the Zapier webhooks already exist, they are off while the seed runs (and
-- back on after it), so seeding sends no emails.

-- Temporary helper (gone when the session ends): logs one workout and its sets.
-- Sets are written as 'Squat 3x5@100; Bench press 8,7,6@60; Push-up 3x12@0':
-- 3x5@100 = 3 sets of 5 reps at 100 kg; 8,7,6@60 = one set per number; @0 = bodyweight.
create or replace function pg_temp.seed_workout(
  p_user      uuid,
  p_plan      uuid,
  p_title     text,
  p_type      text,
  p_minutes   integer,
  p_days_ago  integer,
  p_hour      integer,
  p_sets      text    default '',
  p_activity  text    default null,
  p_km        numeric default null,
  p_notes     text    default null
)
returns void
language plpgsql
as $$
declare
  logged_at timestamptz := date_trunc('day', now()) - make_interval(days => p_days_ago) + make_interval(hours => p_hour);
  sets jsonb := '[]';
  item text;
  reps text;
  m text[];
  set_no integer := 0;
  saved uuid;
begin
  foreach item in array string_to_array(coalesce(p_sets, ''), ';') loop
    item := btrim(item);
    continue when item = '';
    m := regexp_match(item, '^(.+?)\s+(\d+)x(\d+)@([0-9.]+)$');
    if m is not null then
      for k in 1..m[2]::integer loop
        set_no := set_no + 1;
        sets := sets || jsonb_build_object('exercise', m[1], 'set_no', set_no, 'reps', m[3]::integer, 'weight_kg', m[4]::numeric);
      end loop;
    else
      m := regexp_match(item, '^(.+?)\s+([0-9,]+)@([0-9.]+)$');
      if m is null then
        raise exception 'seed: can''t read the sets "%"', item;
      end if;
      foreach reps in array string_to_array(m[2], ',') loop
        set_no := set_no + 1;
        sets := sets || jsonb_build_object('exercise', m[1], 'set_no', set_no, 'reps', reps::integer, 'weight_kg', m[3]::numeric);
      end loop;
    end if;
  end loop;

  insert into public.workouts (plan_id, user_id, title, type, duration_min, activity, distance_km, notes, sets_summary, created_at)
  values (p_plan, p_user, p_title, p_type, p_minutes, p_activity, p_km, p_notes, public.format_sets(sets), logged_at)
  returning id into saved;

  insert into public.workout_sets (workout_id, user_id, exercise, set_no, reps, weight_kg, created_at)
  select saved, p_user, s.exercise, s.set_no, s.reps, s.weight_kg, logged_at
  from jsonb_to_recordset(sets) as s(exercise text, set_no integer, reps integer, weight_kg numeric);
end;
$$;

do $seed$
declare
  demo_password constant text := 'WorkoutLog-demo-2026';
  a     uuid := gen_random_uuid();   -- demo.athlete.a@example.com
  b     uuid := gen_random_uuid();   -- demo.athlete.b@example.com
  coach uuid := gen_random_uuid();   -- demo.instructor@example.com
  has_workout_hook boolean := exists (select 1 from pg_trigger t
    where t.tgname = 'workouts_to_zapier' and t.tgrelid = 'public.workouts'::regclass);
  has_report_hook boolean := exists (select 1 from pg_trigger t
    where t.tgname = 'reports_to_zapier' and t.tgrelid = 'public.reports'::regclass);
  account record;
  a_strength uuid;
  a_5k uuid;
  b_strength uuid;
  b_cardio uuid;
  c_5x5 uuid;
  c_full uuid;
  c_run uuid;
  i integer;
  -- Athlete A, week by week (oldest first).
  squat text[] := array['Squat 3x5@90', 'Squat 3x5@92.5', 'Squat 3x5@95', 'Squat 3x5@97.5',
                        'Squat 3x5@100', 'Squat 3x5@102.5', 'Squat 5x5@105', 'Squat 5x5@105'];
  rdl numeric[] := array[50, 52.5, 55, 57.5, 60, 62.5, 65, 67.5];
  bench text[] := array['Bench press 3x8@50', 'Bench press 3x8@52.5', 'Bench press 3x8@55', 'Bench press 3x8@57.5',
                        'Bench press 3x8@57.5', 'Bench press 3x8@60', 'Bench press 8,7,6@60', 'Bench press 7,6,5@60'];
  row_kg numeric[] := array[40, 42.5, 42.5, 45, 45, 47.5, 47.5, 50];
  press numeric[] := array[30, 30, 32.5, 32.5, 35, 35, 35, 37.5];
  run_title text[] := array['Easy run', 'Easy run', 'Intervals 6 × 400 m', 'Easy run',
                            '5 km time trial', 'Easy run', 'Easy run', 'Easy run'];
  run_min integer[] := array[27, 29, 35, 32, 30, 31, 33, 29];
  run_km numeric[] := array[4, 4.5, 5, 5, 5, 5, 5.5, 5];
  run_notes text[] := array[null, null, null, null, 'New best: 30:05.', null, null, 'Felt easy.'];
begin
  if exists (select 1 from auth.users) then
    raise notice 'Seed skipped: this project already has users, so no demo data was added.';
  else
    -- No emails while seeding.
    if has_workout_hook then
      alter table public.workouts disable trigger workouts_to_zapier;
    end if;
    if has_report_hook then
      alter table public.reports disable trigger reports_to_zapier;
    end if;

    -- 1. Three accounts, as if they had signed up (email already confirmed).
    --    The on_auth_user_created trigger gives each a profile with its role.
    for account in
      select * from (values (a, 'demo.athlete.a@example.com', 'athlete'),
                            (b, 'demo.athlete.b@example.com', 'athlete'),
                            (coach, 'demo.instructor@example.com', 'instructor')) as v(id, email, role)
    loop
      -- [account]
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              confirmation_token, recovery_token, email_change_token_new, email_change,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000000000', account.id, 'authenticated', 'authenticated', account.email,
              extensions.crypt(demo_password, extensions.gen_salt('bf')), now(), '', '', '', '',
              '{"provider": "email", "providers": ["email"]}', jsonb_build_object('role', account.role),
              now() - interval '60 days', now());
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (account.id::text, account.id,
              jsonb_build_object('sub', account.id::text, 'email', account.email,
                                 'email_verified', true, 'phone_verified', false),
              'email', now(), now() - interval '60 days', now());
      -- [/account]
    end loop;
    update public.profiles set invite_code = 'GYM234' where id = coach;

    -- 2. Plans: each athlete's own, and the instructor's.
    insert into public.plans (user_id, name, goal, created_at)
    values (a, 'Strength block', 'Squat 120 kg this winter', now() - interval '57 days') returning id into a_strength;
    insert into public.plans (user_id, name, goal, created_at)
    values (a, '5K plan', 'Run 5 km under 30 min', now() - interval '57 days') returning id into a_5k;
    insert into public.plans (user_id, name, goal, created_at)
    values (b, 'Beginner strength', 'Train three times a week', now() - interval '38 days') returning id into b_strength;
    insert into public.plans (user_id, name, goal, created_at)
    values (b, 'Mobility and cardio', 'Move every day', now() - interval '38 days') returning id into b_cardio;
    insert into public.plans (user_id, name, goal, created_at)
    values (coach, 'Strength 5 × 5', 'Squat, bench and row, 5 × 5, three times a week; add 2.5 kg when every set is done',
            now() - interval '30 days') returning id into c_5x5;
    insert into public.plans (user_id, name, goal, created_at)
    values (coach, 'Full body for beginners', 'Three full-body sessions a week: 3 × 10, then add weight',
            now() - interval '30 days') returning id into c_full;
    insert into public.plans (user_id, name, goal, created_at)
    values (coach, 'Running base', 'Three easy runs a week, 25–40 minutes', now() - interval '30 days') returning id into c_run;

    -- 3. Sharing: both athletes typed the instructor's code, and the instructor
    --    assigned plans (one plan → many athletes: Running base goes to both).
    insert into public.instructor_links (instructor_id, athlete_id, created_at)
    values (coach, a, now() - interval '21 days'), (coach, b, now() - interval '14 days');
    insert into public.plan_assignments (plan_id, athlete_id, assigned_by, created_at)
    values (c_5x5, a, coach, now() - interval '20 days'),
           (c_run, a, coach, now() - interval '20 days'),
           (c_full, b, coach, now() - interval '13 days'),
           (c_run, b, coach, now() - interval '13 days');

    -- 4. Athlete A: 8 weeks of a leg day, an upper-body day and a run.
    --    Squat climbs 2.5 kg a week, then 5 × 5 at 105 kg twice (suggestion: add 2.5 kg);
    --    bench reps at 60 kg drop twice (suggestion: hold the weight).
    for week in reverse 7..0 loop
      i := 8 - week;
      perform pg_temp.seed_workout(a, case when week <= 2 then c_run else a_5k end, run_title[i], 'other',
                                   run_min[i], week * 7 + 1, 7, p_activity => 'run', p_km => run_km[i],
                                   p_notes => run_notes[i]);
      perform pg_temp.seed_workout(a, case when week <= 1 then c_5x5 else a_strength end, 'Leg day', 'strength',
                                   55, week * 7 + 3, 18, squat[i] || '; Romanian deadlift 3x8@' || rdl[i]);
      perform pg_temp.seed_workout(a, a_strength, 'Upper body', 'strength', 50, week * 7 + 5, 18,
                                   bench[i] || '; Barbell row 3x8@' || row_kg[i] || '; Overhead press 3x8@' || press[i]);
    end loop;

    -- 5. Athlete B: a beginner, 5 weeks, nothing logged for the last 8 days
    --    (suggestion: pick up where you left off); deadlift 3 × 5 at 60 kg twice.
    perform pg_temp.seed_workout(b, b_strength, 'Full body A', 'strength', 40, 36, 17, 'Goblet squat 3x10@16; Dumbbell row 3x10@10; Push-up 3x8@0');
    perform pg_temp.seed_workout(b, b_cardio, 'Bike ride', 'other', 35, 34, 8, p_activity => 'bike', p_km => 12);
    perform pg_temp.seed_workout(b, b_strength, 'Full body B', 'strength', 40, 33, 17, 'Deadlift 3x5@50; Dead bug 3x10@0; Push-up 3x8@0');
    perform pg_temp.seed_workout(b, b_cardio, 'Morning mobility flow', 'other', 20, 31, 7, p_activity => 'other');
    perform pg_temp.seed_workout(b, b_strength, 'Full body A', 'strength', 45, 29, 17, 'Goblet squat 3x10@18; Dumbbell row 3x10@12; Push-up 3x10@0');
    perform pg_temp.seed_workout(b, b_strength, 'Full body B', 'strength', 45, 26, 17, 'Deadlift 3x5@55; Hanging knee raise 3x8@0; Push-up 3x10@0');
    perform pg_temp.seed_workout(b, b_cardio, 'Bike ride', 'other', 40, 24, 8, p_activity => 'bike', p_km => 15);
    perform pg_temp.seed_workout(b, b_strength, 'Full body A', 'strength', 45, 22, 17, 'Goblet squat 3x10@20; Dumbbell row 3x10@12; Push-up 3x12@0');
    perform pg_temp.seed_workout(b, b_strength, 'Full body B', 'strength', 45, 19, 17, 'Deadlift 3x5@60; Dead bug 3x10@0; Push-up 3x12@0');
    perform pg_temp.seed_workout(b, b_cardio, 'Morning mobility flow', 'other', 20, 17, 7, p_activity => 'other');
    perform pg_temp.seed_workout(b, c_full, 'Full body A', 'strength', 45, 11, 17, 'Goblet squat 3x10@22; Dumbbell row 3x10@14; Push-up 3x12@0');
    perform pg_temp.seed_workout(b, c_run, 'Easy run', 'other', 22, 10, 7, p_activity => 'run', p_km => 3);
    perform pg_temp.seed_workout(b, c_full, 'Full body B', 'strength', 45, 8, 17,
                                 'Deadlift 3x5@60; Hanging knee raise 3x10@0; Push-up 3x15@0',
                                 p_notes => 'Back a bit sore; taking it easy.');

    -- 6. A goal each, both needing more per week than lately (suggestion: goal pace).
    insert into public.goals (user_id, exercise, target_kg, target_date, created_at)
    values (a, 'Squat', 120, current_date + 42, now() - interval '20 days'),
           (b, 'Deadlift', 80, current_date + 56, now() - interval '12 days');

    -- 7. Athlete A sent a progress report: send_report() builds it from their last 7 days.
    perform set_config('request.jwt.claims',
                       json_build_object('sub', a, 'email', 'demo.athlete.a@example.com', 'role', 'authenticated')::text, true);
    perform public.send_report();
    perform set_config('request.jwt.claims', '', true);

    if has_workout_hook then
      alter table public.workouts enable trigger workouts_to_zapier;
    end if;
    if has_report_hook then
      alter table public.reports enable trigger reports_to_zapier;
    end if;

    raise notice 'Seeded 3 demo accounts (password %), % workouts and % sets. See README, "Demo accounts".',
      demo_password, (select count(*) from public.workouts), (select count(*) from public.workout_sets);
  end if;
end
$seed$;

drop function pg_temp.seed_workout(uuid, uuid, text, text, integer, integer, integer, text, text, numeric, text);
