import { Navigate, Route, Routes } from 'react-router-dom';
import RoleGate from './components/RoleGate';
import TopNav from './components/TopNav';
import { useAuth } from './hooks/useAuth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RoleLandingPage from './pages/RoleLandingPage';

function PrivateShell() {
  return (
    <div className="app-shell">
      <TopNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/teacher"
          element={
            <RoleGate allowedRoles={['teacher']}>
              <RoleLandingPage
                title="Teacher Workspace"
                description="Phase 6 will add mark uploads, assignment workflows, and recent publish activity."
              />
            </RoleGate>
          }
        />
        <Route
          path="/parent"
          element={
            <RoleGate allowedRoles={['parent']}>
              <RoleLandingPage
                title="Parent Workspace"
                description="Phase 7 will add report-card views, progress charts, and polling updates."
              />
            </RoleGate>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleGate allowedRoles={['admin', 'department']}>
              <RoleLandingPage
                title="Admin Analytics Workspace"
                description="Analytics routes are live in backend. Next step is charted frontend visualizations."
              />
            </RoleGate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={isAuthenticated ? <PrivateShell /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
