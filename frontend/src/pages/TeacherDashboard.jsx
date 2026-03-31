import { useEffect, useMemo, useState } from 'react';
import MarkUploadForm from '../components/MarkUploadForm';
import { useApi } from '../hooks/useApi';

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

export default function TeacherDashboard() {
  const api = useApi();

  const [classId, setClassId] = useState('1');
  const [marks, setMarks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const recentMarks = useMemo(() => marks.slice(0, 8), [marks]);

  const loadClassData = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const [marksResponse, assignmentsResponse] = await Promise.all([
        api.get(`/api/academics/classes/${Number(classId)}/marks`),
        api.get(`/api/academics/assignments/${Number(classId)}`),
      ]);

      setMarks(marksResponse.data.data || []);
      setAssignments(assignmentsResponse.data.data || []);
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Unable to fetch class data for this class ID.';
      setError(message);
      setMarks([]);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClassData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublishMark = async (payload) => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await api.post('/api/academics/marks', payload);
      setSuccess('Mark published successfully. Recent publishes refreshed.');
      setClassId(String(payload.classId));

      const marksResponse = await api.get(`/api/academics/classes/${payload.classId}/marks`);
      setMarks(marksResponse.data.data || []);
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Failed to publish mark.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dashboard-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">Phase 6</p>
        <h2>Teacher Dashboard</h2>
        <p>Publish marks and monitor recent class activity from the live backend APIs.</p>
      </section>

      <section className="panel teacher-grid">
        <article className="teacher-card">
          <h3>Publish New Mark</h3>
          <p>Use numeric IDs from your data seed or database for class, student, and subject mapping.</p>
          <MarkUploadForm onSubmit={handlePublishMark} isSubmitting={isSubmitting} />
        </article>

        <article className="teacher-card">
          <div className="teacher-card-header">
            <h3>Class Activity</h3>
            <div className="class-controls">
              <input
                type="number"
                min="1"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                aria-label="Class ID"
              />
              <button type="button" onClick={loadClassData} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}

          <div className="teacher-lists">
            <div>
              <h4>Recent Publishes</h4>
              <ul className="data-list">
                {recentMarks.length === 0 ? <li>No marks found for this class.</li> : null}
                {recentMarks.map((item) => (
                  <li key={item.id}>
                    <strong>{item.student_name}</strong>
                    <span>{item.subject_name}</span>
                    <span>
                      {item.marks_obtained}/{item.total_marks} ({item.exam_type})
                    </span>
                    <time>{formatDate(item.published_at || item.created_at)}</time>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4>Assignments</h4>
              <ul className="data-list">
                {assignments.length === 0 ? <li>No assignments found for this class.</li> : null}
                {assignments.slice(0, 8).map((assignment) => (
                  <li key={assignment.id}>
                    <strong>{assignment.title}</strong>
                    <span>{assignment.subject_name}</span>
                    <span>Max: {assignment.max_marks}</span>
                    <time>{formatDate(assignment.due_date || assignment.created_at)}</time>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
