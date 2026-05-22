import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { formatMoney } from "../../utils/money.js";
import { formatDate } from "../../utils/dates.js";

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export default function Dashboard() {
  const { appData } = useAppData();
  const settings = appData.settings || {};
  const punches = appData.punches || [];
  const invoices = appData.invoices || [];
  const activePunch = appData.activePunch || null;
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  const summary = useMemo(() => {
    const invoiceTotals = invoices.map((invoice) => invoice.totals || {});
    const openInvoices = invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled");
    const balanceDue = sum(invoiceTotals.map((total) => total.balanceDue));
    const payrollUnpaid = sum(punches.filter((punch) => punch.payrollStatus !== "paid").map((punch) => punch.amount));
    const earned = sum(punches.map((punch) => punch.amount));

    return {
      openInvoiceCount: openInvoices.length,
      balanceDue,
      payrollUnpaid,
      earned,
      punchCount: punches.length
    };
  }, [invoices, punches]);

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">{activePunch ? "Punch active" : "Dashboard"}</span>
        <h2>Elite Punch Invoice</h2>
        <p>Mobile-first job tracking, invoices, payroll, calendar and accounting for exterior work.</p>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <h3>Earned from punches</h3>
          <p>{money(summary.earned)}</p>
        </div>

        <div className="stat-card">
          <h3>Balance to collect</h3>
          <p>{money(summary.balanceDue)}</p>
        </div>

        <div className="stat-card">
          <h3>Payroll unpaid</h3>
          <p>{money(summary.payrollUnpaid)}</p>
        </div>

        <div className="stat-card">
          <h3>Open invoices</h3>
          <p>{summary.openInvoiceCount}</p>
        </div>
      </div>

      {activePunch && (
        <div className="info-card">
          <h2>Active punch</h2>
          <p>{activePunch.workerName} | {activePunch.clientName || "No client"} | Started {formatDate(activePunch.startedAt)}</p>
        </div>
      )}

      <div className="info-card">
        <h2>Recent punches</h2>
        {punches.length === 0 ? <p>No punch yet.</p> : (
          <div className="simple-list">
            {punches.slice(0, 5).map((punch) => (
              <div className="list-item" key={punch.id}>
                <strong>{punch.workerName}</strong>
                <span>{punch.clientName || "No client"} | {formatDate(punch.startedAt)}</span>
                <span>{Number(punch.workedHours || 0).toFixed(2)} h | {money(punch.amount || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="info-card">
        <h2>Recent invoices</h2>
        {invoices.length === 0 ? <p>No invoice yet.</p> : (
          <div className="simple-list">
            {invoices.slice(0, 5).map((invoice) => (
              <div className="list-item" key={invoice.id}>
                <strong>{invoice.invoiceNumber}</strong>
                <span>{invoice.clientName} | {invoice.status}</span>
                <span>{money(invoice.totals?.total || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
