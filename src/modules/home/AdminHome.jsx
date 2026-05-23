import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { formatDate } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminHome() {
  const { appData } = useAppData();
  const settings = appData.settings || {};
  const punches = appData.punches || [];
  const invoices = appData.invoices || [];
  const workers = (appData.workers || []).filter((worker) => worker.active !== false);
  const activePunch = appData.activePunch || null;
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  const summary = useMemo(() => {
    const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
    const openInvoices = activeInvoices.filter((invoice) => invoice.status === "open" || invoice.status === "ready");
    const sentInvoices = activeInvoices.filter((invoice) => invoice.status === "sent" || invoice.status === "partial");
    const invoiceTotals = activeInvoices.map((invoice) => invoice.totals || {});
    const todayPunches = punches.filter((punch) => punch.startedAt?.slice(0, 10) === todayKey());
    return {
      earned: sum(punches.map((punch) => punch.amount)),
      todayAmount: sum(todayPunches.map((punch) => punch.amount)),
      todayHours: sum(todayPunches.map((punch) => punch.workedHours)),
      balanceDue: sum(invoiceTotals.map((total) => total.balanceDue)),
      openInvoiceCount: openInvoices.length,
      sentInvoiceCount: sentInvoices.length,
      activeWorkerCount: workers.length,
      punchCount: punches.length,
      todayPunchCount: todayPunches.length
    };
  }, [invoices, punches, workers]);

  const recentPunches = punches.slice(0, 4);
  const recentInvoices = invoices.slice(0, 4);

  return (
    <section className="module-page home-workspace premium-home">
      <div className="hero-card home-hero-premium">
        <div>
          <span className="status-pill">Admin Command Center</span>
          <h2>Accueil admin</h2>
          <p>Vue rapide du chantier : punch actif, revenus, factures ouvertes, employés et activité récente.</p>
        </div>
        <div className="home-orb-panel">
          <span className="orb-label">Aujourd’hui</span>
          <strong>{money(summary.todayAmount)}</strong>
          <small>{summary.todayHours.toFixed(2)} h · {summary.todayPunchCount} session(s)</small>
        </div>
      </div>

      <div className="home-command-grid">
        <div className="info-card command-card punch-command">
          <span className="status-pill">Punch</span>
          <h2>{activePunch ? "Punch actif" : "Prêt à puncher"}</h2>
          <p>{activePunch ? `${activePunch.workerName} · ${activePunch.clientName || activePunch.jobName || "Job"}` : "Utilise l’onglet Punch pour ouvrir la fenêtre de départ et choisir le type de paye."}</p>
          <div className="action-row"><button className="primary-action punch-orb mini-orb" type="button">⏱</button></div>
        </div>
        <div className="info-card command-card"><h2>À collecter</h2><p className="dashboard-number">{money(summary.balanceDue)}</p><div className="mini-stats"><span>{summary.openInvoiceCount} ouvertes</span><span>{summary.sentInvoiceCount} envoyées</span></div></div>
        <div className="info-card command-card"><h2>Équipe</h2><p className="dashboard-number">{summary.activeWorkerCount}</p><div className="mini-stats"><span>travailleurs actifs</span><span>{summary.punchCount} punches</span></div></div>
      </div>

      <div className="section-divider" />

      <div className="card-grid">
        <div className="stat-card"><h3>Total punches</h3><p>{money(summary.earned)}</p></div>
        <div className="stat-card"><h3>Balance due</h3><p>{money(summary.balanceDue)}</p></div>
        <div className="stat-card"><h3>Open invoices</h3><p>{summary.openInvoiceCount}</p></div>
        <div className="stat-card"><h3>Workers</h3><p>{summary.activeWorkerCount}</p></div>
      </div>

      <div className="home-split-grid">
        <div className="info-card"><h2>Activité récente</h2>{recentPunches.length === 0 ? <p>No punch yet.</p> : <div className="simple-list">{recentPunches.map((punch) => <div className="list-item" key={punch.id}><strong>{punch.workerName} · {punch.clientName || "No client"}</strong><span>{formatDate(punch.startedAt, settings.locale, settings.timeZone)} · {Number(punch.workedHours || 0).toFixed(2)} h · {money(punch.amount || 0)}</span><span>{punch.invoiceStatus || "not_invoiced"}</span></div>)}</div>}</div>
        <div className="info-card"><h2>Factures récentes</h2>{recentInvoices.length === 0 ? <p>No invoice yet.</p> : <div className="simple-list">{recentInvoices.map((invoice) => <div className="list-item" key={invoice.id}><strong>{invoice.invoiceNumber}</strong><span>{invoice.clientName} · {invoice.workerName || "Worker"} · {invoice.status}</span><span>{money(invoice.totals?.total || 0)}</span></div>)}</div>}</div>
      </div>
    </section>
  );
}
