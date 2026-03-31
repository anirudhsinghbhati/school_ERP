import { useEffect, useRef, useState } from 'react';
import { useApi } from './useApi';

export function useStudentUpdates(studentId, pollIntervalMs = 15000) {
  const api = useApi();
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
  }, [api, studentId, pollIntervalMs]);

  return {
    updates,
    isPolling,
    pollingError: error,
  };
}
