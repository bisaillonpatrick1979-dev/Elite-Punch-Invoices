export default function Dashboard() {
  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Base prete</span>
        <h2>Tableau de bord</h2>
        <p>
          Base mobile-first pour Elite Punch Invoice. Les modules sont separes,
          les onglets sont prets, et les themes premium sont branches.
        </p>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <h3>Region</h3>
          <p>Alberta, Canada. CAD par defaut.</p>
        </div>

        <div className="stat-card">
          <h3>Mesures</h3>
          <p>Pieds, pouces, pieds carres et pieds lineaires.</p>
        </div>
      </div>
    </section>
  );
}
