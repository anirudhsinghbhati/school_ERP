import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="dashboard-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">Welcome</p>
        <h2>Role-aware frontend is active</h2>
        <p>
          Auth context, API hook, and role-gated routes are configured. Continue with Phase 6 and Phase 7 to
          connect teacher and parent workflows to live endpoints.
        </p>
      </section>

      <section className="panel grid-panel">
        <article>
          <h3>Current Session</h3>
          <ul>
            <li>User ID: {user?.id}</li>
            <li>Email: {user?.email}</li>
            <li>Role: {user?.role}</li>
          </ul>
        </article>

        <article>
          <h3>Next Milestones</h3>
          <ul>
            <li>Teacher dashboard with mark upload</li>
            <li>Parent chart view with polling updates</li>
            <li>Admin analytics charts</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
