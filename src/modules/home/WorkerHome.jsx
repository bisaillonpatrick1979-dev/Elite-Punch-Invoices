import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { formatDate } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

function sum(values = []) { return values.reduce((total, value) => total + Number(value || 0), 0); }
function todayKey() { return new Date().toISOString().slice(0, 10); }

export default function WorkerHome({ onNavigate }) {
  const { appData } = useAppData();
  const { workerId } = useSession();
  const settings = appData.settings || {};
  const worker = (appData.workers || []).find((item) => item.id === workerId);
  const activePunch = appData.activePunch?.workerId === workerId ? appData.activePunch : null;
  const punches = useMemo(() => (appData.punches || []).filter((punch) => punch.workerId === workerId), [appData.punches, workerId]);
  const invoices = useMemo(() => (appData.invoices || []).filter((invoice) => invoice.workerId === workerId), [appData.invoices, workerId]);
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  const summary = useMemo(() => {
    const unpaidPunches = punches.filter((punch) => punch.payrollStatus !== "paid");
    const todayPunches = punches.filter((punch) => punch.startedAt?.slice(0, 10) === todayKey());
    return { earned: sum(punches.map((punch) => punch.amount)), todayAmount: sum(todayPunches.map((punch) => punch.amount)), unpaid: sum(unpaidPunches.map((punch) => punch.amount)), punchCount: punches.length, todayPunchCount: todayPunches.length, invoiceCount: invoices.length, workedHours: sum(punches.map((punch) => punch.workedHours)), todayHours: sum(todayPunches.map((punch) => punch.workedHours)), openInvoices: invoices.filter((invoice) => invoice.status === "open" || invoice.status === "ready").length };
  }, [punches, invoices]);

  const recentPunches = punches.slice(0, 4);
  const recentInvoices = invoices.slice(0, 4);

  return (
    <section className="module-page home-workspace premium-home worker-premium-home">
      <div className="hero-card home-hero-premium"><div><span className="status-pill">Employé</span><h2>{worker?.name || "Accueil employé"}</h2><p>Ton espace rapide : punch, heures, paye, factures et dernières sessions.</p><div className="action-row"><button className="secondary-action" type="button" onClick={() => onNavigate?.("punch")}>Ouvrir Punch</button><button className="secondary-action" type="button" onClick={() => onNavigate?.("calendar")}>Mon calendrier</button><button className="secondary-action" type="button" onClick={() => onNavigate?.("workerInvoices")}>Mes factures</button></div></div><div className="home-orb-panel"><span className="orb-label">Aujourd’hui</span><strong>{money(summary.todayAmount)}</strong><small>{summary.todayHours.toFixed(2)} h · {summary.todayPunchCount} session(s)</small></div></div>
      <div className="home-command-grid"><div className="info-card command-card punch-command"><span className="status-pill">Punch</span><h2>{activePunch ? "Punch actif" : "Prêt à travailler"}</h2><p>{activePunch ? `${activePunch.clientName || activePunch.jobName || "Job"} · ${activePunch.payType}` : "Ouvre l’onglet Punch pour commencer, choisir heure/pi²/job et entrer le taux."}</p><div className="action-row"><button className="primary-action punch-orb mini-orb" type="button" onClick={() => onNavigate?.("punch")}>⏱</button></div></div><div className="info-card command-card"><h2>Paye impayée</h2><p className="dashboard-number">{money(summary.unpaid)}</p><div className="mini-stats"><span>{summary.workedHours.toFixed(2)} h total</span><span>{summary.punchCount} punches</span></div><div className="action-row"><button className="secondary-action" type="button" onClick={() => onNavigate?.("payroll")}>Voir paye</button></div></div><div className="info-card command-card"><h2>Mes factures</h2><p className="dashboard-number">{summary.invoiceCount}</p><div className="mini-stats"><span>{summary.openInvoices} ouvertes</span><span>signature par facture</span></div><div className="action-row"><button className="secondary-action" type="button" onClick={() => onNavigate?.("workerInvoices")}>Ouvrir factures</button></div></div></div>
      <div className="section-divider" />
      <div className="card-grid"><div className="stat-card"><h3>Mes gains</h3><p>{money(summary.earned)}</p></div><div className="stat-card"><h3>Ma paye impayée</h3><p>{money(summary.unpaid)}</p></div><div className="stat-card"><h3>Mes heures</h3><p>{summary.workedHours.toFixed(2)} h</p></div><div className="stat-card"><h3>Mes factures</h3><p>{summary.invoiceCount}</p></div></div>
      <div className="home-split-grid"><div className="info-card"><h2>Mes dernières sessions</h2>{recentPunches.length === 0 ? <p>Aucune session encore.</p> : <div className="simple-list">{recentPunches.map((punch) => <button className="list-item clickable-list-item" type="button" onClick={() => onNavigate?.("calendar")} key={punch.id}><strong>{punch.clientName || "No client"}</strong><span>{formatDate(punch.startedAt, settings.locale, settings.timeZone)} · {Number(punch.workedHours || 0).toFixed(2)} h · {money(punch.amount || 0)}</span><span>{punch.invoiceStatus || "not_invoiced"}</span></button>)}</div>}</div><div className="info-card"><h2>Mes factures récentes</h2>{recentInvoices.length === 0 ? <p>Aucune facture à ton nom pour l’instant.</p> : <div className="simple-list">{recentInvoices.map((invoice) => <button className="list-item clickable-list-item" type="button" onClick={() => onNavigate?.("workerInvoices")} key={invoice.id}><strong>{invoice.invoiceNumber}</strong><span>{invoice.clientName || "No client"} · {invoice.status}</span><span>{money(invoice.totals?.total || 0)}</span></button>)}</div>}</div></div>
    </section>
  );
}
