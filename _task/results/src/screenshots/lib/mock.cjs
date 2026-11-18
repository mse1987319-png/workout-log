'use strict'
// A stateful stand-in for the whole Supabase project, answering what the real
// app asks (see supabase/schema.sql): sign-in (GoTrue), the tables through
// PostgREST (select with embedded tables, order, limit, ilike, lt, single,
// insert, update, delete) and the database functions (rpc).
//
// It keeps the data in plain arrays (the "world", see personas.cjs), so a plan
// created or a workout logged in one step shows up in the next. Row Level
// Security is imitated by looking at who the request's bearer token belongs to.
// Anything it does not know is NOT answered with a made-up reply: it is
// refused and listed in `unmatched`, and a run must end with that list empty.

const { parseSelect, parseFilters, applyFilters, parseOrder, sortRows } = require('./postgrest.cjs')
const { pgTimestamp, utcDay } = require('./time.cjs')

const FAR = 4102444800 // 2100-01-01: the fake sessions never need refreshing
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': 'Content-Range, Content-Type',
}

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** A JWT-shaped token for a user (the signature is fake; nothing checks it). */
function tokenFor(user) {
  const payload = { sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp: FAR }
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.fake-signature`
}

/** The auth user object GoTrue returns. */
function authUser(user) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_metadata: {},
    user_metadata: { role: user.role },
    created_at: user.createdAt ?? '2026-10-01T10:00:00Z',
  }
}

/** The session supabase-js keeps under localStorage "sb-<ref>-auth-token". */
function sessionFor(user) {
  return {
    access_token: tokenFor(user),
    refresh_token: `fake-refresh-${user.id}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: FAR,
    user: authUser(user),
  }
}

// The same wording as the SQL function format_sets (supabase/schema.sql).
const trimScale = (value) => String(Number(value))
function formatSets(sets) {
  const ordered = [...sets].sort((a, b) => a.set_no - b.set_no)
  const exercises = []
  for (const set of ordered) {
    const key = set.exercise.trim().toLowerCase()
    let exercise = exercises.at(-1)
    if (!exercise || exercise.key !== key) {
      exercise = { key, name: set.exercise.trim(), runs: [] }
      exercises.push(exercise)
    }
    const kg = Number(set.weight_kg ?? 0)
    const run = exercise.runs.at(-1)
    if (run && run.reps === set.reps && run.kg === kg) run.count += 1
    else exercise.runs.push({ reps: set.reps, kg, count: 1 })
  }
  if (exercises.length === 0) return null
  return exercises
    .map(({ name, runs }) => {
      const text = runs
        .map(({ reps, kg, count }) => `${count > 1 ? `${count} × ${reps}` : reps}${kg > 0 ? ` @ ${trimScale(kg)} kg` : ' (bodyweight)'}`)
        .join(', ')
      return `${name}: ${text}`
    })
    .join('; ')
}

// What the database answers when a function or row is refused.
const pgError = (status, code, message, details = null, hint = null) => ({
  status,
  body: { code, details, hint, message },
})

class Refused extends Error {
  constructor(status, code, message) {
    super(message)
    Object.assign(this, { status, code })
  }
}

// How embedded tables hang together: relations[parent][embedded table].
const RELATIONS = {
  plans: { workouts: { many: true, match: (plan, row) => row.plan_id === plan.id } },
  workouts: {
    plans: { many: false, match: (workout, row) => row.id === workout.plan_id },
    workout_sets: { many: true, match: (workout, row) => row.workout_id === workout.id },
  },
  plan_assignments: { plans: { many: false, match: (assignment, row) => row.id === assignment.plan_id } },
}

/**
 * @param {object} options
 * @param {object} options.world  the data (see personas.cjs); changed in place
 * @param {() => Date} options.now  "now" for new rows and for report_stats
 */
function createMock({ world, now }) {
  const state = {
    offline: false,
    // 'current' answers rpc/schema_version with 5; 'missing' answers like a
    // database from before v5 (PostgREST: 404 PGRST202).
    schemaVersion: 'current',
  }
  const requests = [] // every request that reached the mock: { method, path, query, body }
  const unmatched = [] // what the mock could not answer
  const calls = {} // rpc name -> [bodies], for assertions in scenes
  let counter = 0

  // New rows get ids of their own kind (9999…), so they never meet a fixture id.
  const newId = () => {
    counter += 1
    return `99999999-0000-4000-8000-${String(counter).padStart(12, '0')}`
  }
  const stamp = () => pgTimestamp(now())
  const userById = (id) => world.users.find((user) => user.id === id)

  // ---- Row Level Security: what each table shows the signed-in user ----
  function assignedToMe(planId, me) {
    return world.plan_assignments.some((a) => a.plan_id === planId && a.athlete_id === me)
  }
  function visible(table, me) {
    switch (table) {
      case 'profiles':
        return world.users
          .filter((user) => user.id === me)
          .map((user) => ({ id: user.id, email: user.email, role: user.role, invite_code: user.inviteCode ?? null, created_at: user.createdAt }))
      case 'plans':
        return world.plans.filter((plan) => plan.user_id === me || assignedToMe(plan.id, me))
      case 'workouts':
      case 'workout_sets':
      case 'goals':
      case 'reports':
        return world[table].filter((row) => row.user_id === me)
      case 'plan_assignments':
        return world.plan_assignments.filter((a) => a.athlete_id === me || a.assigned_by === me)
      case 'instructor_links':
        return world.instructor_links.filter((l) => l.athlete_id === me || l.instructor_id === me)
      default:
        throw new Error(`unknown table ${table}`)
    }
  }

  // ---- select: columns and embedded tables ----
  function project(table, row, columns, me, params) {
    const out = {}
    for (const spec of columns) {
      if (spec.kind === 'column') {
        if (spec.name === '*') Object.assign(out, row)
        else if (spec.name in row) out[spec.name] = row[spec.name]
        else throw new Error(`no column ${table}.${spec.name}`)
      } else {
        const relation = RELATIONS[table]?.[spec.table]
        if (!relation) throw new Error(`no relation ${table} -> ${spec.table}`)
        let related = visible(spec.table, me).filter((candidate) => relation.match(row, candidate))
        const order = [...params.getAll(`${spec.alias}.order`), ...params.getAll(`${spec.table}.order`)]
        related = sortRows(related, parseOrder(order))
        const rendered = related.map((candidate) => project(spec.table, candidate, spec.columns, me, params))
        out[spec.alias] = relation.many ? rendered : (rendered[0] ?? null)
      }
    }
    return out
  }

  function select(table, rows, params, me) {
    let result = applyFilters(rows, parseFilters(params))
    result = sortRows(result, parseOrder(params.getAll('order')))
    if (params.has('limit')) result = result.slice(0, Number(params.get('limit')))
    const columns = parseSelect(params.get('select') ?? '*')
    return result.map((row) => project(table, row, columns, me, params))
  }

  // ---- HTTP replies ----
  const reply = (status, body, headers = {}) => ({
    status,
    contentType: 'application/json',
    headers: { ...CORS, ...headers },
    body: body === undefined ? '' : JSON.stringify(body),
  })
  const rowsReply = (status, rows, asObject) => {
    if (asObject) {
      if (rows.length !== 1) {
        const error = pgError(406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned', `The result contains ${rows.length} rows`)
        return reply(error.status, error.body)
      }
      return reply(status, rows[0])
    }
    return reply(status, rows, { 'content-range': rows.length ? `0-${rows.length - 1}/*` : '*/*' })
  }
  const refusal = (error) => reply(error.status, { code: error.code, details: null, hint: null, message: error.message })

  // ---- the tables: insert, update, delete ----
  function insertRow(table, input, me) {
    switch (table) {
      case 'plans': {
        const row = { id: newId('a'), user_id: me, name: input.name, goal: input.goal ?? null, created_at: stamp() }
        world.plans.push(row)
        return row
      }
      case 'goals': {
        const row = {
          id: newId('c'),
          user_id: me,
          exercise: input.exercise,
          target_kg: input.target_kg,
          target_date: input.target_date,
          created_at: stamp(),
        }
        world.goals.push(row)
        return row
      }
      case 'plan_assignments': {
        const mine = world.plans.some((plan) => plan.id === input.plan_id && plan.user_id === me)
        const linked = world.instructor_links.some((l) => l.instructor_id === me && l.athlete_id === input.athlete_id)
        if (!mine || !linked) throw new Refused(403, '42501', 'new row violates row-level security policy for table "plan_assignments"')
        const row = { plan_id: input.plan_id, athlete_id: input.athlete_id, assigned_by: me, created_at: stamp() }
        world.plan_assignments.push(row)
        return row
      }
      default:
        throw new Error(`insert into ${table} is not mocked`)
    }
  }

  function updateRows(table, rows, input, me) {
    if (table !== 'workouts' && table !== 'plans') throw new Error(`update of ${table} is not mocked`)
    const mine = rows.filter((row) => row.user_id === me)
    for (const row of mine) {
      if (table === 'workouts') Object.assign(row, { title: input.title ?? row.title })
      else Object.assign(row, { name: input.name ?? row.name, goal: 'goal' in input ? input.goal : row.goal })
    }
    return mine
  }

  function deleteRows(table, rows, me) {
    const removed = []
    for (const row of rows) {
      if (table === 'plans') {
        if (row.user_id !== me) continue
        if (world.workouts.some((w) => w.plan_id === row.id && w.user_id !== row.user_id)) {
          throw new Refused(409, '23503', "Athletes have logged workouts under this plan, so it can't be deleted.")
        }
        const gone = new Set(world.workouts.filter((w) => w.plan_id === row.id).map((w) => w.id))
        world.workouts = world.workouts.filter((w) => !gone.has(w.id))
        world.workout_sets = world.workout_sets.filter((s) => !gone.has(s.workout_id))
        world.plan_assignments = world.plan_assignments.filter((a) => a.plan_id !== row.id)
        world.plans = world.plans.filter((plan) => plan !== row)
      } else if (table === 'goals') {
        world.goals = world.goals.filter((goal) => goal !== row)
      } else if (table === 'plan_assignments') {
        world.plan_assignments = world.plan_assignments.filter((a) => a !== row)
      } else if (table === 'instructor_links') {
        world.instructor_links = world.instructor_links.filter((l) => l !== row)
      } else {
        throw new Error(`delete from ${table} is not mocked`)
      }
      removed.push(row)
    }
    return removed
  }

  // ---- the database functions ----
  const rpc = {
    schema_version() {
      if (state.schemaVersion === 'missing') {
        const error = pgError(
          404,
          'PGRST202',
          'Could not find the function public.schema_version without parameters in the schema cache',
          'Searched for the function public.schema_version without parameters, but no matches were found in the schema cache.',
          null,
        )
        return reply(error.status, error.body)
      }
      return reply(200, 5)
    },

    log_workout(me, p) {
      const found = p.p_id ? world.workouts.find((w) => w.id === p.p_id) : null
      if (found) return reply(200, found) // sent again: nothing is saved twice
      if (p.p_type !== 'strength' && (p.p_sets ?? []).length > 0) throw new Refused(400, '22023', 'Only strength workouts have sets')
      // A workout goes under one of my own plans or one assigned to me (the policies in schema.sql).
      if (!visible('plans', me).some((plan) => plan.id === p.p_plan_id)) {
        throw new Refused(403, '42501', 'new row violates row-level security policy for table "workouts"')
      }
      // A logged time in the future or older than 30 days is ignored (as in the database).
      const at = p.p_logged_at ? new Date(p.p_logged_at) : null
      const usable = at && at <= now() && at >= new Date(now().getTime() - 30 * 24 * 3600 * 1000)
      const createdAt = usable ? pgTimestamp(at) : stamp()
      const row = {
        id: p.p_id ?? newId('b'),
        user_id: me,
        plan_id: p.p_plan_id,
        title: p.p_title,
        type: p.p_type,
        duration_min: p.p_duration_min,
        activity: p.p_activity ?? null,
        distance_km: p.p_distance_km ?? null,
        notes: p.p_notes ?? null,
        sets_summary: formatSets(p.p_sets ?? []),
        created_at: createdAt,
      }
      world.workouts.push(row)
      for (const set of p.p_sets ?? []) {
        world.workout_sets.push({
          id: newId('d'),
          workout_id: row.id,
          user_id: me,
          exercise: set.exercise,
          set_no: set.set_no,
          reps: set.reps,
          weight_kg: set.weight_kg ?? 0,
          created_at: createdAt,
        })
      }
      return reply(200, row)
    },

    report_stats(me, p) {
      return reply(200, reportStats(me, p.p_days ?? 7))
    },

    send_report(me) {
      const fiveMinutesAgo = now().getTime() - 5 * 60 * 1000
      if (world.reports.some((r) => r.user_id === me && Date.parse(r.created_at) > fiveMinutesAgo)) {
        throw new Refused(400, 'P0001', 'You sent a report a few minutes ago. Wait a little before sending another.')
      }
      const numbers = reportStats(me, 7)
      const { summary, ...stats } = numbers
      const row = {
        id: newId('e'),
        user_id: me,
        athlete_email: userById(me).email,
        period_start: numbers.period_start,
        period_end: numbers.period_end,
        summary,
        stats,
        created_at: stamp(),
      }
      world.reports.push(row)
      return reply(200, row)
    },

    link_instructor(me, p) {
      const wanted = String(p.p_code ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      const instructor = world.users.find((user) => user.role === 'instructor' && user.inviteCode === wanted)
      if (!instructor) throw new Refused(400, 'P0002', 'No instructor has that code. Check it and try again.')
      if (instructor.id === me) throw new Refused(400, '22023', 'That is your own code: give it to your athletes.')
      let link = world.instructor_links.find((l) => l.instructor_id === instructor.id && l.athlete_id === me)
      if (!link) {
        link = { instructor_id: instructor.id, athlete_id: me, created_at: stamp() }
        world.instructor_links.push(link)
      }
      return reply(200, { instructor_id: instructor.id, email: instructor.email, linked_at: link.created_at })
    },

    my_instructors(me) {
      const rows = world.instructor_links
        .filter((l) => l.athlete_id === me)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        .map((l) => ({ instructor_id: l.instructor_id, email: userById(l.instructor_id).email, linked_at: l.created_at }))
      return rowsReply(200, rows, false)
    },

    my_athletes(me) {
      const since = Date.parse(`${utcDay(new Date(now().getTime() - 6 * 24 * 3600 * 1000))}T00:00:00Z`)
      const rows = world.instructor_links
        .filter((l) => l.instructor_id === me)
        .map((l) => {
          const workouts = world.workouts.filter((w) => w.user_id === l.athlete_id)
          const reports = world.reports.filter((r) => r.user_id === l.athlete_id)
          const latest = (list) => (list.length ? list.map((x) => x.created_at).sort().at(-1) : null)
          return {
            athlete_id: l.athlete_id,
            email: userById(l.athlete_id).email,
            linked_at: l.created_at,
            last_workout_at: latest(workouts),
            workouts_last_7_days: workouts.filter((w) => Date.parse(w.created_at) >= since).length,
            last_report_at: latest(reports),
          }
        })
        .sort((a, b) => a.email.localeCompare(b.email))
      return rowsReply(200, rows, false)
    },

    athlete_progress(me, p) {
      const link = world.instructor_links.find((l) => l.instructor_id === me && l.athlete_id === p.p_athlete)
      if (!link) throw new Refused(403, '42501', 'This athlete is not sharing with you.')
      const athlete = userById(p.p_athlete)
      const plans = new Map(world.plans.map((plan) => [plan.id, plan.name]))
      const mine = (table) => world[table].filter((row) => row.user_id === p.p_athlete)
      const byDate = (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
      return reply(200, {
        athlete: { id: athlete.id, email: athlete.email },
        linked_at: link.created_at,
        workouts: mine('workouts')
          .sort(byDate)
          .map((w) => ({
            id: w.id,
            type: w.type,
            title: w.title,
            duration_min: w.duration_min,
            activity: w.activity,
            distance_km: w.distance_km,
            notes: w.notes,
            sets_summary: w.sets_summary,
            plan_name: plans.get(w.plan_id) ?? null,
            created_at: w.created_at,
          })),
        sets: mine('workout_sets')
          .sort((a, b) => byDate(a, b) || a.set_no - b.set_no)
          .map(({ workout_id, exercise, reps, weight_kg, created_at }) => ({ workout_id, exercise, reps, weight_kg, created_at })),
        // The old manual screenshots list the goals in the order they were
        // added, not by date as the SQL function does; kept so the retaken
        // image shows the same screen.
        goals: mine('goals').map(({ id, exercise, target_kg, target_date, created_at }) => ({ id, exercise, target_kg, target_date, created_at })),
        reports: mine('reports')
          .sort((a, b) => byDate(b, a))
          .slice(0, 5)
          .map(({ created_at, summary }) => ({ created_at, summary })),
      })
    },
  }

  // report_stats(p_days): the numbers and one-line summary of the last days, as the SQL function writes them.
  function reportStats(me, days) {
    const startDay = utcDay(new Date(now().getTime() - (days - 1) * 24 * 3600 * 1000))
    const endDay = utcDay(now())
    const from = Date.parse(`${startDay}T00:00:00Z`)
    const workouts = world.workouts.filter((w) => w.user_id === me && Date.parse(w.created_at) >= from)
    const sets = world.workout_sets.filter((s) => s.user_id === me && Date.parse(s.created_at) >= from)
    const sum = (list, field) => list.reduce((total, item) => total + Number(item[field] ?? 0), 0)
    const strength = workouts.filter((w) => w.type === 'strength')
    const other = workouts.filter((w) => w.type === 'other')

    const byExercise = new Map()
    for (const set of [...sets].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
      if (!(Number(set.weight_kg) > 0)) continue
      const key = set.exercise.trim().toLowerCase()
      const entry = byExercise.get(key) ?? { exercise: set.exercise.trim(), kg: 0 }
      entry.kg = Math.max(entry.kg, Number(set.weight_kg))
      byExercise.set(key, entry)
    }
    const heaviest = [...byExercise.values()].sort((a, b) => b.kg - a.kg).slice(0, 3)
    const heaviestText = heaviest.map((h) => `${h.exercise} ${trimScale(h.kg)} kg`).join(', ')
    const distance = sum(workouts, 'distance_km')
    const day = (ymd) => `${MONTHS[Number(ymd.slice(5, 7)) - 1]} ${Number(ymd.slice(8, 10))}`
    const plural = workouts.length === 1 ? 'workout' : 'workouts'
    const setsText = sets.length === 0 ? '' : sets.length === 1 ? ', 1 set' : `, ${sets.length} sets`
    const summary =
      `${day(startDay)} – ${day(endDay)}: ` +
      (workouts.length === 0
        ? 'no workouts logged.'
        : `${workouts.length} ${plural} (${strength.length} strength, ${other.length} other), ${sum(workouts, 'duration_min')} min${setsText}.` +
          (heaviestText ? ` Heaviest: ${heaviestText}.` : '') +
          (distance > 0 ? ` Distance: ${trimScale(distance)} km.` : ''))
    return {
      days,
      period_start: startDay,
      period_end: endDay,
      workouts: workouts.length,
      strength_workouts: strength.length,
      other_workouts: other.length,
      minutes: sum(workouts, 'duration_min'),
      strength_minutes: sum(strength, 'duration_min'),
      other_minutes: sum(other, 'duration_min'),
      distance_km: distance,
      sets: sets.length,
      heaviest,
      summary,
    }
  }

  // ---- sign-in (GoTrue) ----
  function auth(method, path, query, body, me) {
    if (path === '/auth/v1/token' && method === 'POST') {
      if (query.get('grant_type') === 'password') {
        const user = world.users.find((u) => u.email === String(body.email).toLowerCase())
        if (!user || user.password !== body.password) {
          return reply(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
        }
        return reply(200, sessionFor(user))
      }
      if (query.get('grant_type') === 'refresh_token') {
        const user = world.users.find((u) => `fake-refresh-${u.id}` === body.refresh_token)
        if (user) return reply(200, sessionFor(user))
      }
    }
    if (path === '/auth/v1/user' && method === 'GET' && me) return reply(200, authUser(userById(me)))
    if (path === '/auth/v1/logout' && method === 'POST') return reply(204, undefined)
    return null
  }

  // The user a request is made as: the "sub" of its bearer token (the project key is not a user).
  function userOf(headers) {
    const token = String(headers.authorization ?? '').replace(/^Bearer /, '')
    const payload = token.split('.')[1]
    if (!payload) return null
    try {
      const sub = JSON.parse(Buffer.from(payload, 'base64url').toString()).sub
      return sub && userById(sub) ? sub : null
    } catch {
      return null
    }
  }

  // The reply for one request, or null when the mock does not know it.
  function answer({ method, url, headers, body }) {
    const me = userOf(headers)
    const query = url.searchParams
    if (url.pathname.startsWith('/auth/v1/')) return auth(method, url.pathname, query, body ?? {}, me)

    const rest = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([a-z_]+)$/)
    if (!rest) return null
    const [, isRpc, name] = rest

    if (isRpc) {
      if (!rpc[name] || method !== 'POST') return null
      calls[name] = [...(calls[name] ?? []), body]
      if (name === 'schema_version') return rpc.schema_version()
      if (!me) return null // functions that need a user are never answered for the project key alone
      try {
        return rpc[name](me, body ?? {})
      } catch (error) {
        if (error instanceof Refused) return refusal(error)
        throw error
      }
    }

    if (!me) return null
    const asObject = /vnd\.pgrst\.object\+json/.test(headers.accept ?? '')
    const wantsRows = /return=representation/.test(headers.prefer ?? '')
    try {
      if (method === 'GET') return rowsReply(200, select(name, visible(name, me), query, me), asObject)

      if (method === 'POST') {
        const inputs = Array.isArray(body) ? body : [body]
        const created = inputs.map((input) => insertRow(name, input, me))
        if (!wantsRows) return reply(201, undefined)
        return rowsReply(201, select(name, created, new URLSearchParams([['select', query.get('select') ?? '*']]), me), asObject)
      }

      if (method === 'PATCH' || method === 'DELETE') {
        const matching = applyFilters(visible(name, me), parseFilters(query))
        const changed = method === 'PATCH' ? updateRows(name, matching, body, me) : deleteRows(name, matching, me)
        if (!wantsRows) return reply(204, undefined)
        const params = new URLSearchParams([['select', query.get('select') ?? '*']])
        return rowsReply(200, changed.map((row) => project(name, row, parseSelect(params.get('select')), me, params)), asObject)
      }
    } catch (error) {
      if (error instanceof Refused) return refusal(error)
      throw error
    }
    return null
  }

  /** The Playwright route handler for every request to the Supabase project. */
  async function handle(route) {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    if (method === 'OPTIONS') {
      return state.offline ? route.abort('internetdisconnected') : route.fulfill({ status: 204, headers: CORS })
    }
    // context.setOffline() keeps the browser offline, but a fulfilled request
    // would still get its answer; this makes the project truly unreachable.
    if (state.offline) return route.abort('internetdisconnected')

    let body
    const text = request.postData()
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }
    requests.push({ method, path: url.pathname, query: url.search, body })
    const label = `${method} ${url.pathname}${url.search}`
    let result = null
    try {
      result = answer({ method, url, headers: request.headers(), body })
    } catch (error) {
      unmatched.push(`${label} (${error.message})`)
      return route.abort('failed')
    }
    if (!result) {
      unmatched.push(label)
      return route.abort('failed')
    }
    return route.fulfill(result)
  }

  return { handle, state, world, requests, unmatched, calls, sessionFor, newId }
}

module.exports = { createMock, sessionFor, tokenFor, authUser, formatSets, FAR }
