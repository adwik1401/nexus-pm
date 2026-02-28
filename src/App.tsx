import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import Sidebar from './components/Sidebar/Sidebar'
import Header from './components/Header/Header'
import KanbanBoard from './components/KanbanBoard/KanbanBoard'
import GanttChart from './components/GanttChart/GanttChart'
import TaskModal from './components/TaskModal/TaskModal'
import MeetingModal from './components/MeetingModal/MeetingModal'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AllProjectsPage from './pages/AllProjectsPage'
import AdminPage from './pages/AdminPage'
import MeetingsPage from './pages/MeetingsPage'

// ── Protected wrapper ────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
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
      <MeetingModal />
    </AppProvider>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
