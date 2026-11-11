import { Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import { ErrorState } from './components/States'
import { configError } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import PlansPage from './pages/PlansPage'

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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
