import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RoleGate({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuth();

  // When not logged in, allow rendering so you can browse pages without auth.
  // Role enforcement only applies when a user exists.
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
