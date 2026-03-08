import { lazy, Suspense } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import Sidebar from './components/Sidebar/Sidebar'
import Header from './components/Header/Header'
import KanbanBoard from './components/KanbanBoard/KanbanBoard'
import GanttChart from './components/GanttChart/GanttChart'
import TaskModal from './components/TaskModal/TaskModal'
import MeetingModal from './components/MeetingModal/MeetingModal'

// ── Lazy-loaded pages (code-split per route) ──────────────────────────────────
// Each page loads only when first visited — keeps the initial bundle small.
const LoginPage           = lazy(() => import('./pages/LoginPage'))
const RegisterPage        = lazy(() => import('./pages/RegisterPage'))
const AcceptInvitePage    = lazy(() => import('./pages/AcceptInvitePage'))
const ForgotPasswordPage  = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage   = lazy(() => import('./pages/ResetPasswordPage'))
const AllProjectsPage     = lazy(() => import('./pages/AllProjectsPage'))
const AdminPage           = lazy(() => import('./pages/AdminPage'))
const MeetingsPage        = lazy(() => import('./pages/MeetingsPage'))
const MyTasksPage         = lazy(() => import('./pages/MyTasksPage'))
const AllTasksPage        = lazy(() => import('./pages/AllTasksPage'))
const ProfilePage         = lazy(() => import('./pages/ProfilePage'))
const SelectWorkspacePage = lazy(() => import('./pages/SelectWorkspacePage'))

// ── Protected wrapper ────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  // Use AuthContext.isAdmin (admin in ANY workspace) — avoids the race condition
  // where AppContext.isAdmin is false on first render because activeWorkspaceId
  // hasn't been validated yet from the memberships useEffect.
  const { session, loading, isAdmin } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Main app shell ───────────────────────────────────────────────────────────
function MainBoard() {
  const { viewMode } = useApp()
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex-1 overflow-hidden">
        {viewMode === 'kanban' ? <KanbanBoard /> : <GanttChart />}
      </div>
      <TaskModal />
      <MeetingModal />
    </div>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
      <TaskModal />
      <MeetingModal />
    </AppProvider>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/invite/:token"   element={<AcceptInvitePage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password"  element={<ResetPasswordPage />} />

            {/* Protected */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppProvider>
                  <div className="flex h-screen w-screen overflow-hidden">
                    <Sidebar />
                    <MainBoard />
                  </div>
                </AppProvider>
              </ProtectedRoute>
            } />

            <Route path="/projects" element={
              <ProtectedRoute>
                <AppShell>
                  <AllProjectsPage />
                </AppShell>
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <AdminRoute>
                <AppShell>
                  <AdminPage />
                </AppShell>
              </AdminRoute>
            } />

            <Route path="/meetings" element={
              <ProtectedRoute>
                <AppShell>
                  <MeetingsPage />
                </AppShell>
              </ProtectedRoute>
            } />

            <Route path="/my-tasks" element={
              <ProtectedRoute>
                <AppShell>
                  <MyTasksPage />
                </AppShell>
              </ProtectedRoute>
            } />

            <Route path="/all-tasks" element={
              <ProtectedRoute>
                <AppShell>
                  <AllTasksPage />
                </AppShell>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            } />

            <Route path="/profile/:id" element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            } />

            {/* Workspace selection */}
            <Route path="/select-workspace" element={
              <ProtectedRoute>
                <AppShell>
                  <SelectWorkspacePage />
                </AppShell>
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  )
}
