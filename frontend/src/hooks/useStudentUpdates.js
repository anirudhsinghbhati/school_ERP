import { useEffect, useRef, useState } from 'react';
import { useApi } from './useApi';
import { useAuth } from './useAuth';

export function useStudentUpdates(studentId, pollIntervalMs = 15000) {
  const api = useApi();
  const { token } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');
  const sinceRef = useRef(null);

  useEffect(() => {
    setUpdates([]);
    setError('');
    sinceRef.current = null;

    if (!studentId) {
      return undefined;
    }

    // If the user isn't logged in yet, skip polling protected endpoints silently.
    if (!token) {
      setUpdates([]);
      setIsPolling(false);
      setError('');
      return undefined;
    }

    let active = true;

    const fetchUpdates = async () => {
      setIsPolling(true);
      try {
        const response = await api.get(`/api/parents/updates/${studentId}`, {
          params: sinceRef.current ? { since: sinceRef.current } : {},
        });

        const payload = response.data?.data;
        const incoming = payload?.updates || [];

        if (!active) {
          return;
        }

        if (incoming.length > 0) {
          setUpdates((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const merged = [...incoming.filter((item) => !existingIds.has(item.id)), ...prev];
            return merged.slice(0, 30);
          });
        }

        sinceRef.current = payload?.fetchedAt || new Date().toISOString();
        setError('');
      } catch (requestError) {
        if (!active) {
          return;
        }

        const message = requestError.response?.data?.error || 'Polling updates failed.';
        setError(message);
      } finally {
        if (active) {
          setIsPolling(false);
        }
      }
    };

    fetchUpdates();
    const timerId = setInterval(fetchUpdates, pollIntervalMs);

    return () => {
      active = false;
      clearInterval(timerId);
    };
  }, [api, token, studentId, pollIntervalMs]);

  return {
    updates,
    isPolling,
    pollingError: error,
  };
}
