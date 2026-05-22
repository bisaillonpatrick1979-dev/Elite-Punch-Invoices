export default function Punch() {
  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Module Punch</span>
        <h2>Punch in / Punch out</h2>
        <p>
          Base visuelle seulement. Les boutons et calculs seront ajoutes dans une prochaine etape.
        </p>

        <div className="money-preview">$0.00</div>

        <div className="action-row">
          <button className="primary-action" type="button">
            Punch In
          </button>
          <button className="secondary-action" type="button">
            Pause
          </button>
        </div>
      </div>
    </section>
  );
}
