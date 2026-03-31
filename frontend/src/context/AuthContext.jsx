import { createContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ea_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ea_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    localStorage.setItem('ea_token', token);
    localStorage.setItem('ea_user', JSON.stringify(user));
  }, [token, user]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const nextToken = response.data.token;
      const nextUser = response.data.user;

      setToken(nextToken);
      setUser(nextUser);

      return nextUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, payload);

      const nextToken = response.data.token;
      const nextUser = response.data.user;

      setToken(nextToken);
      setUser(nextUser);

      return nextUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ea_token');
    localStorage.removeItem('ea_user');
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      apiBaseUrl: API_BASE_URL,
    }),
    [token, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
