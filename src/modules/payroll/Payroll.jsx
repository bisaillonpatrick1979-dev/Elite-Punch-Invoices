import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { minutesToHours } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

function buildSummaries(punches = []) {
  const groups = {};
  punches.forEach((punch) => {
    const workerId = punch.workerId || "unknown";
    if (!groups[workerId]) groups[workerId] = { workerId, workerName: punch.workerName || "Unknown worker", punches: [], workedMinutes: 0, breakMinutes: 0, amount: 0, paidAmount: 0, unpaidAmount: 0 };
    const amount = Number(punch.amount || 0);
    const isPaid = punch.payrollStatus === "paid";
    groups[workerId].punches.push(punch);
    groups[workerId].workedMinutes += Number(punch.workedMinutes || 0);
    groups[workerId].breakMinutes += Number(punch.breakMinutes || 0);
    groups[workerId].amount += amount;
    if (isPaid) groups[workerId].paidAmount += amount;
    else groups[workerId].unpaidAmount += amount;
  });
  return Object.values(groups);
}

export default function Payroll() {
  const { appData, updateAppData } = useAppData();
  const { isOwner, workerId } = useSession();
  const settings = appData.settings || {};
  const visiblePunches = useMemo(() => isOwner ? (appData.punches || []) : (appData.punches || []).filter((punch) => punch.workerId === workerId), [appData.punches, isOwner, workerId]);
  const summaries = useMemo(() => buildSummaries(visiblePunches), [visiblePunches]);
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  const markWorkerPunchesPaid = (targetWorkerId) => {
    if (!isOwner) return;
    updateAppData((currentData) => ({ ...currentData, punches: (currentData.punches || []).map((punch) => punch.workerId === targetWorkerId ? { ...punch, payrollStatus: "paid", paidAt: new Date().toISOString() } : punch) }));
  };

  const markPunchUnpaid = (punchId) => {
    if (!isOwner) return;
    updateAppData((currentData) => ({ ...currentData, punches: (currentData.punches || []).map((punch) => punch.id === punchId ? { ...punch, payrollStatus: "unpaid", paidAt: "" } : punch) }));
  };

  return <section className="module-page"><div className="hero-card"><span className="status-pill">Payroll</span><h2>{isOwner ? "Payroll summary" : "My pay"}</h2><p>{isOwner ? "Review worked time, breaks, earned amount and payroll status by worker." : "Your hours, earned amount and payroll status."}</p></div>{summaries.length === 0 ? <div className="info-card"><h2>No payroll data yet</h2><p>Complete punches first, then payroll summaries will appear here.</p></div> : <div className="simple-list">{summaries.map((summary) => <div className="info-card" key={summary.workerId}><span className="status-pill">{summary.workerName}</span><h2>{money(summary.unpaidAmount)} unpaid</h2><div className="mini-stats"><span>{minutesToHours(summary.workedMinutes).toFixed(2)} h worked</span><span>{minutesToHours(summary.breakMinutes).toFixed(2)} h break</span><span>Total {money(summary.amount)}</span><span>Paid {money(summary.paidAmount)}</span></div>{isOwner && <div className="action-row"><button className="primary-action" type="button" onClick={() => markWorkerPunchesPaid(summary.workerId)}>Mark worker paid</button></div>}<div className="simple-list">{summary.punches.map((punch) => <div className="list-item" key={punch.id}><strong>{punch.clientName || "No client"}</strong><span>{Number(punch.workedHours || 0).toFixed(2)} h | {money(punch.amount || 0)}</span><span>Status: {punch.payrollStatus === "paid" ? "Paid" : "Unpaid"}</span>{isOwner && punch.payrollStatus === "paid" && <button className="secondary-action" type="button" onClick={() => markPunchUnpaid(punch.id)}>Mark unpaid</button>}</div>)}</div></div>)}</div>}</section>;
}
