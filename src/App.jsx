import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import { ErrorState, Loading } from './components/States'
import { configError } from './lib/supabase'
import AthletesPage from './pages/AthletesPage'
import LoginPage from './pages/LoginPage'
import LogWorkoutPage from './pages/LogWorkoutPage'
import PlansPage from './pages/PlansPage'
import SharingPage from './pages/SharingPage'

// Screens that are never the first one shown load on demand, keeping the
// first download small (Progress and an athlete's page carry the charts library).
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const WorkoutDetailPage = lazy(() => import('./pages/WorkoutDetailPage'))
const AthletePage = lazy(() => import('./pages/AthletePage'))

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
          <Route path="sharing" element={<SharingPage />} />
          <Route path="athletes" element={<AthletesPage />} />
          <Route
            path="athletes/:id"
            element={
              <OnDemand loading="Loading the athlete…">
                <AthletePage />
              </OnDemand>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
