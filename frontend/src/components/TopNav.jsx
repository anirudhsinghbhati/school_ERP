import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function TopNav() {
  const { user, logout } = useAuth();

  return (
    <header className="top-nav">
      <div className="brand">
        <div className="brand-mark">PIET</div>
        <div>
          <h1>Education Analytics</h1>
          <p>Academic insights for teachers, parents, and admins</p>
        </div>
      </div>

      <nav>
        <Link to="/">Home</Link>
        <Link to="/teacher">Teacher</Link>
        <Link to="/parent">Parent</Link>
        <Link to="/admin">Admin</Link>
      </nav>

      <div className="auth-chip">
        <span>{user?.email}</span>
        <strong>{user?.role}</strong>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
