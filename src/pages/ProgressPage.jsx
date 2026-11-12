import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { listProgress } from '../api/progress'
import GoalsCard from '../components/GoalsCard'
import { MinutesSection, WeightSection } from '../components/ProgressCharts'
import ReportCard from '../components/ReportCard'
import { EmptyState, ErrorState, Loading } from '../components/States'
import Suggestions from '../components/Suggestions'
import { friendlyError } from '../lib/errors'
import { sortGoals } from '../lib/goals'
import { suggest } from '../lib/recommendations'
import { useLoad } from '../lib/useLoad'

// Progress: suggestions, goals and the report to the instructor, then the
// heaviest set per session of one exercise and minutes per week.
export default function ProgressPage() {
  const { status, data, error, reload, setData } = useLoad(listProgress)
  const suggestions = useMemo(() => (data ? suggest(data) : []), [data])

  function addGoal(goal) {
    setData((current) => ({ ...current, goals: sortGoals([...current.goals, goal]) }))
  }

  function removeGoal(id) {
    setData((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }))
  }

  return (
    <section className="progress">
      <h1>Progress</h1>

      {status === 'loading' && <Loading>Loading your progress…</Loading>}

      {status === 'error' && <ErrorState message={friendlyError(error)} onRetry={reload} />}

      {status === 'success' && data.workouts.length === 0 && (
        <EmptyState
          action={
            <Link className="button" to="/log">
              Log a workout
            </Link>
          }
        >
          No workouts yet — log one to see your progress.
        </EmptyState>
      )}

      {status === 'success' && data.workouts.length > 0 && (
        <div className="stack">
          <Suggestions items={suggestions} />
          <GoalsCard goals={data.goals} sets={data.sets} onAdded={addGoal} onRemoved={removeGoal} />
          <ReportCard />
          <WeightSection sets={data.sets} />
          <MinutesSection workouts={data.workouts} />
        </div>
      )}
    </section>
  )
}
