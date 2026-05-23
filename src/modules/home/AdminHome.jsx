import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import Punch from "../punch/Punch.jsx";
import Calendar from "../calendar/Calendar.jsx";
import { formatMoney } from "../../utils/money.js";

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export default function AdminHome() {
  const { appData } = useAppData();
  const settings = appData.settings || {};
  const punches = appData.punches || [];
  const invoices = appData.invoices || [];
  const workers = (appData.workers || []).filter((worker) => worker.active !== false);
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  const summary = useMemo(() => {
    const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
    const openInvoices = activeInvoices.filter((invoice) => invoice.status !== "paid");
    const invoiceTotals = activeInvoices.map((invoice) => invoice.totals || {});
    return {
      earned: sum(punches.map((punch) => punch.amount)),
      balanceDue: sum(invoiceTotals.map((total) => total.balanceDue)),
      openInvoiceCount: openInvoices.length,
      activeWorkerCount: workers.length,
      punchCount: punches.length
    };
  }, [invoices, punches, workers]);

  return (
    <section className="module-page home-workspace">
      <div className="hero-card"><span className="status-pill">Admin</span><h2>Accueil admin</h2><p>Vue complète : punch, calendrier, factures, employés, payes, catalogue, comptabilité et réglages.</p></div>
      <Punch />
      <div className="card-grid"><div className="stat-card"><h3>Earned from punches</h3><p>{money(summary.earned)}</p></div><div className="stat-card"><h3>Balance to collect</h3><p>{money(summary.balanceDue)}</p></div><div className="stat-card"><h3>Open invoices</h3><p>{summary.openInvoiceCount}</p></div><div className="stat-card"><h3>Active workers</h3><p>{summary.activeWorkerCount}</p></div><div className="stat-card"><h3>Punches</h3><p>{summary.punchCount}</p></div></div>
      <Calendar />
      <div className="info-card"><h2>Recent invoices</h2>{invoices.length === 0 ? <p>No invoice yet.</p> : <div className="simple-list">{invoices.slice(0, 5).map((invoice) => <div className="list-item" key={invoice.id}><strong>{invoice.invoiceNumber}</strong><span>{invoice.clientName} | {invoice.workerName || "Worker"} | {invoice.status}</span><span>{money(invoice.totals?.total || 0)}</span></div>)}</div>}</div>
    </section>
  );
}
