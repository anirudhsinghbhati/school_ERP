import axios from 'axios';
import { useMemo } from 'react';
import { useAuth } from './useAuth';

export function useApi() {
  const { token, apiBaseUrl } = useAuth();

  const client = useMemo(() => {
    const instance = axios.create({
      baseURL: apiBaseUrl,
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });

    return instance;
  }, [apiBaseUrl, token]);

  return client;
}
