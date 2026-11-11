import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import { ErrorState, Loading } from './components/States'
import { configError } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import LogWorkoutPage from './pages/LogWorkoutPage'
import PlansPage from './pages/PlansPage'

// Screens that are never the first one shown load on demand, keeping the
// first download small (the Progress screen carries the charts library).
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const WorkoutDetailPage = lazy(() => import('./pages/WorkoutDetailPage'))

function OnDemand({ loading, children }) {
  return <Suspense fallback={<Loading>{loading}</Loading>}>{children}</Suspense>
}

export default function App() {
  if (configError) {
    return (
      <main className="page page-narrow">
        <p className="brand">Workout Log</p>
        <ErrorState
          message={`The app is not set up yet. ${configError}`}
          onRetry={() => window.location.reload()}
        />
      </main>
    )
  }

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<PlansPage />} />
          <Route path="log" element={<LogWorkoutPage />} />
          <Route
            path="workouts/:id"
            element={
              <OnDemand loading="Loading the workout…">
                <WorkoutDetailPage />
              </OnDemand>
            }
          />
          <Route
            path="progress"
            element={
              <OnDemand loading="Loading your progress…">
                <ProgressPage />
              </OnDemand>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
