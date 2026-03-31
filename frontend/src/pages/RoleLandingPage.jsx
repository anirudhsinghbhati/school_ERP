export default function RoleLandingPage({ title, description }) {
  return (
    <main className="dashboard-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">Phase-ready</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </section>
    </main>
  );
}
