import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { isAuthenticated, login, register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('login');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'teacher',
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const navigateByRole = (user) => {
    if (user.role === 'teacher') {
      navigate('/teacher');
      return;
    }

    if (user.role === 'parent') {
      navigate('/parent');
      return;
    }

    navigate('/admin');
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginForm.email.trim()) {
      setErrorMessage('Email is required.');
      return;
    }

    if (!EMAIL_REGEX.test(loginForm.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!loginForm.password) {
      setErrorMessage('Password is required.');
      return;
    }

    try {
      const user = await login(loginForm.email.trim(), loginForm.password);
      setLoginForm({ email: '', password: '' });
      setSuccessMessage('Login successful. Redirecting...');
      setTimeout(() => navigateByRole(user), 450);
    } catch (requestError) {
      const nextError = requestError.response?.data?.error || 'Login failed. Please check your credentials.';
      setErrorMessage(nextError);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!registerForm.firstName.trim()) {
      setErrorMessage('First name is required.');
      return;
    }

    if (!registerForm.lastName.trim()) {
      setErrorMessage('Last name is required.');
      return;
    }

    if (!registerForm.email.trim()) {
      setErrorMessage('Email is required.');
      return;
    }

    if (!EMAIL_REGEX.test(registerForm.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!registerForm.password) {
      setErrorMessage('Password is required.');
      return;
    }

    if (registerForm.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!registerForm.confirmPassword) {
      setErrorMessage('Please confirm your password.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      const user = await register({
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        role: registerForm.role,
      });

      setRegisterForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'teacher',
      });
      setSuccessMessage('Registration successful. Redirecting...');
      setTimeout(() => navigateByRole(user), 450);
    } catch (requestError) {
      const nextError = requestError.response?.data?.error || 'Registration failed. Please try again.';
      setErrorMessage(nextError);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Secure Access</p>
        <h2>Welcome to Education Analytics</h2>
        <p className="subtext">Sign in or create your role account to continue.</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-button ${activeTab === 'login' ? 'auth-tab-active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            disabled={isLoading}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab-button ${activeTab === 'register' ? 'auth-tab-active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            disabled={isLoading}
          >
            Register
          </button>
        </div>

        {successMessage ? <div className="auth-banner auth-success">{successMessage}</div> : null}
        {errorMessage ? <div className="auth-banner auth-error">{errorMessage}</div> : null}

        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <label>
              Email
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </label>

            <div className="auth-password-field">
              <label>
                Password
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </label>
              <button
                type="button"
                className="auth-visibility-toggle"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                disabled={isLoading}
              >
                {showLoginPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div className="auth-form-row">
              <label>
                First Name
                <input
                  type="text"
                  required
                  value={registerForm.firstName}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  placeholder="First name"
                  disabled={isLoading}
                />
              </label>
              <label>
                Last Name
                <input
                  type="text"
                  required
                  value={registerForm.lastName}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, lastName: event.target.value }))}
                  placeholder="Last name"
                  disabled={isLoading}
                />
              </label>
            </div>

            <label>
              Email
              <input
                type="email"
                required
                value={registerForm.email}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </label>

            <label>
              Role
              <select
                value={registerForm.role}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, role: event.target.value }))}
                disabled={isLoading}
              >
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
                <option value="admin">Admin</option>
                <option value="department">Department</option>
              </select>
            </label>

            <div className="auth-password-field">
              <label>
                Password
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  required
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                />
              </label>
              <button
                type="button"
                className="auth-visibility-toggle"
                onClick={() => setShowRegisterPassword((prev) => !prev)}
                disabled={isLoading}
              >
                {showRegisterPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="auth-password-field">
              <label>
                Confirm Password
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={registerForm.confirmPassword}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  placeholder="Re-enter password"
                  disabled={isLoading}
                />
              </label>
              <button
                type="button"
                className="auth-visibility-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={isLoading}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
