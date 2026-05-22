export default function Invoices() {
  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Factures</span>
        <h2>Factures ouvertes</h2>
        <p>
          Ici on preparera les factures ouvertes, les statuts, les lignes de travail,
          les taxes, les paiements et l export PDF.
        </p>
      </div>

      <div className="info-card">
        <h2>Statuts prevus</h2>
        <p>Ouverte, Prete, Envoyee, Partiellement payee, Payee, Annulee.</p>
      </div>
    </section>
  );
}
