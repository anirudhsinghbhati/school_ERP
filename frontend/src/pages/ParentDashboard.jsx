import { useEffect, useMemo, useState } from 'react';
import ProgressChart from '../components/ProgressChart';
import { useApi } from '../hooks/useApi';
import { useStudentUpdates } from '../hooks/useStudentUpdates';
import { useAuth } from '../hooks/useAuth';

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

export default function ParentDashboard() {
  const api = useApi();
  const { token } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { updates, isPolling, pollingError } = useStudentUpdates(selectedStudentId || null, 30000);

  const selectedStudent = useMemo(() => {
    const students = dashboard?.students || [];
    return students.find((student) => String(student.id) === String(selectedStudentId)) || null;
  }, [dashboard, selectedStudentId]);

  const loadDashboard = async () => {
    // If there is no auth token (logged out), skip hitting protected endpoints
    // and just show the empty state without any error.
    if (!token) {
      setDashboard(null);
      setSelectedStudentId('');
      setProgress(null);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/api/parents/dashboard');
      const data = response.data?.data;
      setDashboard(data);

      const firstStudent = data?.students?.[0];
      if (firstStudent) {
        setSelectedStudentId(String(firstStudent.id));
      }
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Unable to load parent dashboard.';
      setError(message);
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async (studentId) => {
    if (!studentId || !token) {
      setProgress(null);
      return;
    }

    try {
      const response = await api.get(`/api/parents/students/${studentId}/progress`);
      setProgress(response.data?.data || null);
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Unable to load progress for selected student.';
      setError(message);
      setProgress(null);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }
    loadProgress(selectedStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]);

  const latestReport = selectedStudent?.latestReportCard || null;

  return (
    <main className="dashboard-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">Parent Dashboard</p>
        <h2>Parent Dashboard</h2>
        <p>Review progress, the latest report card, and live updates for your selected student.</p>
      </section>

      <section className="panel parent-grid">
        <article className="parent-card">
          <div className="parent-header-row">
            <h3>Student Selector</h3>
            <button type="button" onClick={loadDashboard} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <label className="inline-label">
            Student
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              disabled={!dashboard?.students?.length}
            >
              {(dashboard?.students || []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} (Roll: {student.roll_number || '-'})
                </option>
              ))}
            </select>
          </label>

          <div className="parent-summary-grid">
            <div>
              <strong>Total Students</strong>
              <span>{dashboard?.summary?.totalStudents ?? 0}</span>
            </div>
            <div>
              <strong>Recent Updates</strong>
              <span>{dashboard?.summary?.recentUpdates ?? 0}</span>
            </div>
            <div>
              <strong>Attendance</strong>
              <span>{selectedStudent?.attendance_percentage ?? '-'}%</span>
            </div>
            <div>
              <strong>Average Score</strong>
              <span>{progress?.overallAverage ?? 0}%</span>
            </div>
          </div>
        </article>

        <article className="parent-card">
          <h3>Progress Chart</h3>
          <ProgressChart points={progress?.points || []} />
        </article>
      </section>

      <section className="panel parent-grid parent-grid-bottom">
        <article className="parent-card">
          <h3>Latest Report Card</h3>
          {!latestReport ? (
            <p className="muted-text">No report card available yet.</p>
          ) : (
            <ul className="data-list">
              <li>
                <strong>Term</strong>
                <span>{latestReport.term_id || '-'}</span>
                <span>Published: {latestReport.is_published ? 'Yes' : 'No'}</span>
                <time>{formatDate(latestReport.generated_at)}</time>
              </li>
              <li>
                <strong>Metadata</strong>
                <span>{JSON.stringify(latestReport.metadata || {})}</span>
              </li>
            </ul>
          )}
        </article>

        <article className="parent-card">
          <div className="parent-header-row">
            <h3>Live Updates</h3>
            <span className="polling-chip">{isPolling ? 'Polling...' : 'Idle'}</span>
          </div>
          {pollingError ? <p className="error-text">{pollingError}</p> : null}
          <ul className="data-list">
            {updates.length === 0 ? <li>No updates received yet.</li> : null}
            {updates.slice(0, 10).map((item) => (
              <li key={item.id}>
                <strong>{item.entity}</strong>
                <span>Action: {item.action}</span>
                <span>Entity ID: {item.entity_id}</span>
                <time>{formatDate(item.timestamp)}</time>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
