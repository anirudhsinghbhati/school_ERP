import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { isAuthenticated, login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const user = await login(form.email.trim(), form.password);

      if (user.role === 'teacher') {
        navigate('/teacher');
        return;
      }

      if (user.role === 'parent') {
        navigate('/parent');
        return;
      }

      navigate('/admin');
    } catch (requestError) {
      const nextError = requestError.response?.data?.error || 'Login failed. Please check credentials.';
      setError(nextError);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Phase 5 Frontend Setup</p>
        <h2>Sign in to continue</h2>
        <p className="subtext">Use your role account to access teacher, parent, or admin views.</p>

        <form onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="teacher@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Enter password"
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}
