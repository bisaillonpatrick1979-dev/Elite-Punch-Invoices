import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { formatMoney } from "../../utils/money.js";

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function getAccountingSummary({ invoices = [], punches = [] }) {
  const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
  const paidInvoices = activeInvoices.filter((invoice) => invoice.status === "paid");
  const openInvoices = activeInvoices.filter((invoice) => invoice.status !== "paid");
  const invoiceTotals = activeInvoices.map((invoice) => invoice.totals || {});
  const totalRevenue = sum(invoiceTotals.map((total) => total.total));
  const totalPaid = sum(invoiceTotals.map((total) => total.paidAmount));
  const totalTax = sum(invoiceTotals.map((total) => total.taxAmount));
  const totalBalanceDue = sum(invoiceTotals.map((total) => total.balanceDue));
  const payrollTotal = sum(punches.map((punch) => punch.amount));
  const payrollPaid = sum(punches.filter((punch) => punch.payrollStatus === "paid").map((punch) => punch.amount));
  const payrollUnpaid = payrollTotal - payrollPaid;
  const grossProfitBeforeMaterials = totalRevenue - payrollTotal;

  return { totalRevenue, totalPaid, totalTax, totalBalanceDue, paidInvoiceCount: paidInvoices.length, openInvoiceCount: openInvoices.length, payrollTotal, payrollPaid, payrollUnpaid, grossProfitBeforeMaterials };
}

export default function Accounting() {
  const { appData } = useAppData();
  const settings = appData.settings || {};
  const invoices = appData.invoices || [];
  const punches = appData.punches || [];
  const summary = useMemo(() => getAccountingSummary({ invoices, punches }), [invoices, punches]);
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  return (
    <section className="module-page">
      <div className="hero-card"><span className="status-pill">Accounting</span><h2>Accounting summary</h2><p>Quick view of invoice revenue, balances, taxes, payroll and rough profit.</p></div>
      <div className="card-grid"><div className="stat-card"><h3>Total invoiced</h3><p>{money(summary.totalRevenue)}</p></div><div className="stat-card"><h3>Total paid</h3><p>{money(summary.totalPaid)}</p></div><div className="stat-card"><h3>Balance to collect</h3><p>{money(summary.totalBalanceDue)}</p></div><div className="stat-card"><h3>Taxes collected</h3><p>{money(summary.totalTax)}</p></div><div className="stat-card"><h3>Payroll unpaid</h3><p>{money(summary.payrollUnpaid)}</p></div><div className="stat-card"><h3>Rough profit</h3><p>{money(summary.grossProfitBeforeMaterials)}</p></div></div>
      <div className="info-card"><h2>Status</h2><div className="mini-stats"><span>{summary.openInvoiceCount} open invoices</span><span>{summary.paidInvoiceCount} paid invoices</span><span>{punches.length} punches</span><span>Payroll paid {money(summary.payrollPaid)}</span></div></div>
      <div className="info-card"><h2>Invoice snapshot</h2>{invoices.length === 0 ? <p>No invoice yet.</p> : <div className="simple-list">{invoices.slice(0, 8).map((invoice) => { const totals = invoice.totals || {}; return <div className="list-item" key={invoice.id}><strong>{invoice.invoiceNumber} - {invoice.clientName}</strong><span>Status: {invoice.status}</span><span>Total: {money(totals.total || 0)} | Paid: {money(totals.paidAmount || 0)} | Balance: {money(totals.balanceDue || 0)}</span></div>; })}</div>}</div>
    </section>
  );
}
