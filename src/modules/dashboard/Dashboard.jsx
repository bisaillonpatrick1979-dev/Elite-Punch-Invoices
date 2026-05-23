import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { formatDate } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

import Punch from "../punch/Punch.jsx";
import Calendar from "../calendar/Calendar.jsx";

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export default function Dashboard() {
  const { appData } = useAppData();
  const { mode, workerId, setMode, setWorkerId, isOwner } = useSession();
  const settings = appData.settings || {};
  const workers = appData.workers || [];
  const punches = useMemo(() => isOwner ? (appData.punches || []) : (appData.punches || []).filter((punch) => punch.workerId === workerId), [appData.punches, isOwner, workerId]);
  const invoices = isOwner ? (appData.invoices || []) : [];
  const activePunch = appData.activePunch && (isOwner || appData.activePunch.workerId === workerId) ? appData.activePunch : null;
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  const summary = useMemo(() => {
    const invoiceTotals = invoices.map((invoice) => invoice.totals || {});
    const openInvoices = invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled");
    const balanceDue = sum(invoiceTotals.map((total) => total.balanceDue));
    const payrollUnpaid = sum(punches.filter((punch) => punch.payrollStatus !== "paid").map((punch) => punch.amount));
    const earned = sum(punches.map((punch) => punch.amount));
    return { openInvoiceCount: openInvoices.length, balanceDue, payrollUnpaid, earned, punchCount: punches.length };
  }, [invoices, punches]);

  return (
    <section className="module-page home-workspace">
      <div className="hero-card">
        <span className="status-pill">{activePunch ? "Punch active" : isOwner ? "Owner" : "Worker"}</span>
        <h2>Accueil chantier</h2>
        <p>Punch, connexion employé, calendrier et résumé principal au même endroit.</p>
        <div className="form-grid home-login-grid">
          <label className="field">
            <span>Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="owner">Owner / Propriétaire</option>
              <option value="worker">Worker / Employé</option>
            </select>
          </label>
          {mode === "worker" && (
            <label className="field">
              <span>Employé connecté</span>
              <select value={workerId} onChange={(event) => setWorkerId(event.target.value)}>
                {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <Punch />

      <div className="card-grid">
        <div className="stat-card"><h3>{isOwner ? "Earned from punches" : "My earned amount"}</h3><p>{money(summary.earned)}</p></div>
        {isOwner && <div className="stat-card"><h3>Balance to collect</h3><p>{money(summary.balanceDue)}</p></div>}
        <div className="stat-card"><h3>{isOwner ? "Payroll unpaid" : "My unpaid pay"}</h3><p>{money(summary.payrollUnpaid)}</p></div>
        {isOwner && <div className="stat-card"><h3>Open invoices</h3><p>{summary.openInvoiceCount}</p></div>}
        <div className="stat-card"><h3>Punches</h3><p>{summary.punchCount}</p></div>
      </div>

      {activePunch && <div className="info-card"><h2>Active punch</h2><p>{activePunch.workerName} | {activePunch.clientName || "No client"} | Started {formatDate(activePunch.startedAt)}</p></div>}

      <Calendar />

      <div className="info-card"><h2>{isOwner ? "Recent punches" : "My recent punches"}</h2>{punches.length === 0 ? <p>No punch yet.</p> : <div className="simple-list">{punches.slice(0, 5).map((punch) => <div className="list-item" key={punch.id}><strong>{punch.workerName}</strong><span>{punch.clientName || "No client"} | {formatDate(punch.startedAt)}</span><span>{Number(punch.workedHours || 0).toFixed(2)} h | {money(punch.amount || 0)}</span></div>)}</div>}</div>

      {isOwner && <div className="info-card"><h2>Recent invoices</h2>{invoices.length === 0 ? <p>No invoice yet.</p> : <div className="simple-list">{invoices.slice(0, 5).map((invoice) => <div className="list-item" key={invoice.id}><strong>{invoice.invoiceNumber}</strong><span>{invoice.clientName} | {invoice.status}</span><span>{money(invoice.totals?.total || 0)}</span></div>)}</div>}</div>}
    </section>
  );
}
