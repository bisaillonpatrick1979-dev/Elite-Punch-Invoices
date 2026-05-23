import { useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { formatDate, formatTime, minutesToHours } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

const dayClasses = [
  { id: "tiny", label: "0-2 h", emoji: "🌱", min: 0, max: 2 },
  { id: "small", label: "2-4 h", emoji: "🔹", min: 2, max: 4 },
  { id: "short", label: "4-6 h", emoji: "◐", min: 4, max: 6 },
  { id: "normal", label: "6-8 h", emoji: "✅", min: 6, max: 8 },
  { id: "big", label: "8-10 h", emoji: "💪", min: 8, max: 10 },
  { id: "very-big", label: "10-12 h", emoji: "🔥", min: 10, max: 12 },
  { id: "explosive", label: "12 h+", emoji: "⚡", min: 12, max: Infinity }
];

function toISODate(date) { return date.toISOString().slice(0, 10); }
function getMonthDays(date) { const year = date.getFullYear(); const month = date.getMonth(); const firstDate = new Date(year, month, 1); const lastDate = new Date(year, month + 1, 0); const days = []; for (let index = 0; index < firstDate.getDay(); index += 1) days.push(null); for (let day = 1; day <= lastDate.getDate(); day += 1) days.push(toISODate(new Date(year, month, day))); return days; }
function getDayClass(hours) { if (!hours || hours <= 0) return "empty"; const match = dayClasses.find((item) => hours > item.min && hours <= item.max); return match?.id || "explosive"; }
function getDayClassInfo(hours) { if (!hours || hours <= 0) return { id: "empty", label: "Congé / aucune session", emoji: "○" }; return dayClasses.find((item) => hours > item.min && hours <= item.max) || dayClasses[dayClasses.length - 1]; }
function groupPunchesByDate(punches = []) { return punches.reduce((groups, punch) => { const key = punch.startedAt?.slice(0, 10); if (!key) return groups; if (!groups[key]) groups[key] = []; groups[key].push(punch); groups[key].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()); return groups; }, {}); }
function getMonthSummary(monthDays, punchesByDate) { const workedDays = monthDays.filter(Boolean).filter((day) => (punchesByDate[day] || []).length > 0); const punches = workedDays.flatMap((day) => punchesByDate[day] || []); const workedHours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0); const breakHours = punches.reduce((total, punch) => total + minutesToHours(punch.breakMinutes || 0), 0); const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0); return { workedDays: workedDays.length, punchCount: punches.length, workedHours, breakHours, amount }; }
function getDaySummary(punches = []) { const workedHours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0); const breakHours = punches.reduce((total, punch) => total + minutesToHours(punch.breakMinutes || 0), 0); const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0); const clients = [...new Set(punches.map((punch) => punch.clientName || punch.jobName || "No client"))]; const invoices = [...new Set(punches.map((punch) => punch.linkedInvoiceId).filter(Boolean))]; return { workedHours, breakHours, amount, clients, invoices, sessionCount: punches.length }; }
function payTypeLabel(payType) { if (payType === "square-foot") return "Pied carré / pi²"; if (payType === "fixed") return "À la job / forfait"; return "À l’heure"; }
function getInvoiceLabel(punch, invoices = []) { const invoice = invoices.find((item) => item.id === punch.linkedInvoiceId); if (!invoice) return punch.invoiceStatus || "not_invoiced"; return `${invoice.invoiceNumber} · ${invoice.status}`; }
function BreakDetails({ breaks = [] }) { if (!breaks.length) return <span>Breaks: aucun break punché</span>; return <div className="simple-list compact-list">{breaks.map((item, index) => <div className="list-item" key={item.id || `${item.startedAt}-${index}`}><strong>Break {index + 1}</strong><span>{formatTime(item.startedAt)} → {formatTime(item.endedAt)} · {minutesToHours(item.minutes || 0).toFixed(2)} h</span></div>)}</div>; }

export default function Calendar() {
  const { appData } = useAppData();
  const { isOwner, workerId } = useSession();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const settings = appData.settings || {};
  const invoices = appData.invoices || [];
  const visiblePunches = useMemo(() => isOwner ? (appData.punches || []) : (appData.punches || []).filter((punch) => punch.workerId === workerId), [appData.punches, isOwner, workerId]);
  const punchesByDate = useMemo(() => groupPunchesByDate(visiblePunches), [visiblePunches]);
  const monthDays = useMemo(() => getMonthDays(viewDate), [viewDate]);
  const monthSummary = useMemo(() => getMonthSummary(monthDays, punchesByDate), [monthDays, punchesByDate]);
  const selectedPunches = selectedDate ? punchesByDate[selectedDate] || [] : [];
  const selectedSummary = useMemo(() => getDaySummary(selectedPunches), [selectedPunches]);
  const selectedDayInfo = getDayClassInfo(selectedSummary.workedHours);
  const monthTitle = viewDate.toLocaleDateString(settings.locale || "fr-CA", { month: "long", year: "numeric" });
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");
  const moveMonth = (direction) => { setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1)); setSelectedDate(null); };

  return (
    <section className="module-page">
      <div className="hero-card"><span className="status-pill">Calendar</span><h2>{isOwner ? "Work calendar" : "My calendar"}</h2><p>{isOwner ? "All worker punch details, sessions, breaks and linked invoices." : "Only your punches, hours, pay, breaks and invoice status."}</p><div className="action-row"><button className="secondary-action" type="button" onClick={() => moveMonth(-1)}>Previous</button><button className="secondary-action" type="button" onClick={() => moveMonth(1)}>Next</button></div></div>
      <div className="info-card"><h2>{monthTitle}</h2><div className="mini-stats"><span>{monthSummary.workedDays} worked days</span><span>{monthSummary.punchCount} sessions</span><span>{monthSummary.workedHours.toFixed(2)} h worked</span><span>{monthSummary.breakHours.toFixed(2)} h break</span><span>{money(monthSummary.amount)}</span></div></div>
      <div className="info-card"><h2>Legend</h2><div className="legend-grid">{dayClasses.map((item) => <span className={`legend-pill day-${item.id}`} key={item.id}>{item.emoji} {item.label}</span>)}</div></div>
      <div className="calendar-grid">{monthDays.map((day, index) => { if (!day) return <div className="calendar-cell muted-cell" key={`empty-${index}`} />; const punches = punchesByDate[day] || []; const hours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0); const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0); const dayClass = getDayClass(hours); const dayInfo = getDayClassInfo(hours); return <button className={`calendar-cell day-${dayClass}`} key={day} type="button" onClick={() => setSelectedDate(day)}><strong>{Number(day.slice(-2))} <span aria-hidden="true">{dayInfo.emoji}</span></strong>{hours > 0 ? <span>{hours.toFixed(1)} h</span> : <span>Congé</span>}{punches.length > 1 && <small>{punches.length} sessions</small>}{amount > 0 && <small>{money(amount)}</small>}</button>; })}</div>

      {selectedDate && <div className="modal-backdrop"><div className="modal-card wide-modal"><div className="invoice-card-header"><div><span className={`status-pill day-${selectedDayInfo.id}`}>{selectedDayInfo.emoji} {selectedDayInfo.label}</span><h2>{formatDate(selectedDate, settings.locale, settings.timeZone)}</h2></div><button className="secondary-action" type="button" onClick={() => setSelectedDate(null)}>Fermer</button></div>{selectedPunches.length === 0 ? <p>No punch saved for this day.</p> : <><div className="mini-stats"><span>{selectedSummary.sessionCount} session(s)</span><span>{selectedSummary.workedHours.toFixed(2)} h worked</span><span>{selectedSummary.breakHours.toFixed(2)} h break</span><span>{money(selectedSummary.amount)}</span><span>{selectedSummary.clients.length} client/job</span><span>{selectedSummary.invoices.length} facture(s)</span></div><div className="simple-list">{selectedPunches.map((punch, index) => <div className="list-item" key={punch.id}><strong>Session {index + 1} · {punch.workerName}</strong><span>Client/job: {punch.clientName || punch.jobName || "No client"}</span><span>Adresse: {punch.jobAddress || "No job address"}</span><span>Heures: {formatTime(punch.startedAt)} → {formatTime(punch.endedAt)}</span><span>Type de paye: {payTypeLabel(punch.payType)}</span>{punch.payType === "hourly" && <span>Taux horaire: {money(punch.hourlyRate || 0)} / h</span>}{punch.payType === "square-foot" && <span>Pi²: {Number(punch.squareFeet || 0).toFixed(2)} · Taux: {money(punch.squareFootRate || 0)} / pi²</span>}{punch.payType === "fixed" && <span>Forfait/job: {money(punch.fixedAmount || 0)}</span>}<span>Temps brut: {minutesToHours(punch.grossMinutes || 0).toFixed(2)} h</span><span>Total breaks: {minutesToHours(punch.breakMinutes || 0).toFixed(2)} h</span><span>Temps travaillé net: {Number(punch.workedHours || 0).toFixed(2)} h</span><span>Montant: {money(punch.amount || 0)}</span><span>Valeur horaire effective: {money(punch.effectiveHourly || 0)} / h</span><span>Facture: {getInvoiceLabel(punch, invoices)}</span><span>Paye: {punch.payrollStatus === "paid" ? "paid" : "unpaid"}</span>{punch.notes && <span>Notes: {punch.notes}</span>}<BreakDetails breaks={punch.breaks || []} /></div>)}</div></>}</div></div>}
    </section>
  );
}
