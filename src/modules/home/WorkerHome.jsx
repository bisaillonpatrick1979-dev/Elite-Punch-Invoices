import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import Punch from "../punch/Punch.jsx";
import Calendar from "../calendar/Calendar.jsx";
import { formatMoney } from "../../utils/money.js";

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export default function WorkerHome() {
  const { appData } = useAppData();
  const { workerId } = useSession();
  const settings = appData.settings || {};
  const worker = (appData.workers || []).find((item) => item.id === workerId);
  const punches = useMemo(() => (appData.punches || []).filter((punch) => punch.workerId === workerId), [appData.punches, workerId]);
  const invoices = useMemo(() => (appData.invoices || []).filter((invoice) => invoice.workerId === workerId), [appData.invoices, workerId]);
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  const summary = useMemo(() => {
    const unpaidPunches = punches.filter((punch) => punch.payrollStatus !== "paid");
    return {
      earned: sum(punches.map((punch) => punch.amount)),
      unpaid: sum(unpaidPunches.map((punch) => punch.amount)),
      punchCount: punches.length,
      invoiceCount: invoices.length,
      workedHours: sum(punches.map((punch) => punch.workedHours))
    };
  }, [punches, invoices]);

  return (
    <section className="module-page home-workspace">
      <div className="hero-card"><span className="status-pill">Employé</span><h2>{worker?.name || "Accueil employé"}</h2><p>Ton espace : punch, calendrier, statistiques, paye, factures et options personnelles.</p></div>
      <Punch />
      <div className="card-grid"><div className="stat-card"><h3>Mes gains</h3><p>{money(summary.earned)}</p></div><div className="stat-card"><h3>Ma paye impayée</h3><p>{money(summary.unpaid)}</p></div><div className="stat-card"><h3>Mes heures</h3><p>{summary.workedHours.toFixed(2)} h</p></div><div className="stat-card"><h3>Mes factures</h3><p>{summary.invoiceCount}</p></div><div className="stat-card"><h3>Mes punches</h3><p>{summary.punchCount}</p></div></div>
      <Calendar />
      <div className="info-card"><h2>Mes factures récentes</h2>{invoices.length === 0 ? <p>Aucune facture à ton nom pour l’instant.</p> : <div className="simple-list">{invoices.slice(0, 4).map((invoice) => <div className="list-item" key={invoice.id}><strong>{invoice.invoiceNumber}</strong><span>{invoice.clientName || "No client"} | {invoice.status}</span><span>{money(invoice.totals?.total || 0)}</span></div>)}</div>}</div>
    </section>
  );
}
