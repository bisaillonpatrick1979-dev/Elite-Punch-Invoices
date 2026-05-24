import { useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { formatDate, formatTime, minutesToHours } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

const dayClasses = [
  { id: "tiny", name: "Très petite journée", range: "0 à 2 h", emoji: "🌱", min: 0, max: 2 },
  { id: "small", name: "Petite journée", range: "2 à 4 h", emoji: "🔹", min: 2, max: 4 },
  { id: "short", name: "Demi-journée / journée courte", range: "4 à 6 h", emoji: "◐", min: 4, max: 6 },
  { id: "normal", name: "Journée normale", range: "6 à 8 h", emoji: "✅", min: 6, max: 8 },
  { id: "big", name: "Grosse journée", range: "8 à 10 h", emoji: "💪", min: 8, max: 10 },
  { id: "very-big", name: "Très grosse journée", range: "10 à 12 h", emoji: "🔥", min: 10, max: 12 },
  { id: "explosive", name: "Journée explosive", range: "12 h et +", emoji: "⚡", min: 12, max: Infinity }
];

function toISODate(date) { return date.toISOString().slice(0, 10); }
function getMonthDays(date) { const year = date.getFullYear(); const month = date.getMonth(); const firstDate = new Date(year, month, 1); const lastDate = new Date(year, month + 1, 0); const days = []; for (let index = 0; index < firstDate.getDay(); index += 1) days.push(null); for (let day = 1; day <= lastDate.getDate(); day += 1) days.push(toISODate(new Date(year, month, day))); return days; }
function getDayClass(hours) { if (!hours || hours <= 0) return "empty"; const match = dayClasses.find((item) => hours > item.min && hours <= item.max); return match?.id || "explosive"; }
function getDayClassInfo(hours) { if (!hours || hours <= 0) return { id: "empty", name: "Congé / aucune session", range: "0 h", emoji: "○" }; return dayClasses.find((item) => hours > item.min && hours <= item.max) || dayClasses[dayClasses.length - 1]; }
function getDayLabel(hours) { const info = getDayClassInfo(hours); return info.id === "empty" ? info.name : `${info.name} · ${info.range}`; }
function groupPunchesByDate(punches = []) { return punches.reduce((groups, punch) => { const key = punch.startedAt?.slice(0, 10); if (!key) return groups; if (!groups[key]) groups[key] = []; groups[key].push(punch); groups[key].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()); return groups; }, {}); }
function getMonthSummary(monthDays, punchesByDate) { const workedDays = monthDays.filter(Boolean).filter((day) => (punchesByDate[day] || []).length > 0); const punches = workedDays.flatMap((day) => punchesByDate[day] || []); const workedHours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0); const breakHours = punches.reduce((total, punch) => total + minutesToHours(punch.breakMinutes || 0), 0); const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0); return { workedDays: workedDays.length, punchCount: punches.length, workedHours, breakHours, amount }; }
function getDaySummary(punches = []) { const workedHours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0); const breakHours = punches.reduce((total, punch) => total + minutesToHours(punch.breakMinutes || 0), 0); const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0); const clients = [...new Set(punches.map((punch) => punch.clientName || punch.jobName || "No client"))]; const invoices = [...new Set(punches.map((punch) => punch.linkedInvoiceId).filter(Boolean))]; return { workedHours, breakHours, amount, clients, invoices, sessionCount: punches.length }; }
function payTypeLabel(payType) { if (payType === "square-foot") return "Pied carré / pi²"; if (payType === "fixed") return "À la job / forfait"; return "À l’heure"; }
function getInvoiceLabel(punch, invoices = []) { const invoice = invoices.find((item) => item.id === punch.linkedInvoiceId); if (!invoice) return punch.invoiceStatus || "Non facturé"; return `${invoice.invoiceNumber} · ${invoice.status}`; }
function paymentDetails(punch, money) { if (punch.payType === "hourly") return [{ label: "Taux horaire", value: `${money(punch.hourlyRate || 0)} / h` }]; if (punch.payType === "square-foot") return [{ label: "Quantité", value: `${Number(punch.squareFeet || 0).toFixed(2)} pi²` }, { label: "Taux", value: `${money(punch.squareFootRate || 0)} / pi²` }]; if (punch.payType === "fixed") return [{ label: "Forfait / job", value: money(punch.fixedAmount || 0) }]; return []; }

function DetailItem({ label, value, strong = false }) {
  return <div className={strong ? "day-detail-item strong" : "day-detail-item"}><span>{label}</span><strong>{value}</strong></div>;
}

function BreakDetails({ breaks = [], settings }) {
  if (!breaks.length) return <div className="day-empty-note">Aucune pause enregistrée.</div>;
  return <div className="day-break-list">{breaks.map((item, index) => <div className="day-break-row" key={item.id || `${item.startedAt}-${index}`}><span>Pause {index + 1}</span><strong>{formatTime(item.startedAt, settings.locale, settings.timeZone)} → {formatTime(item.endedAt, settings.locale, settings.timeZone)}</strong><em>{minutesToHours(item.minutes || 0).toFixed(2)} h</em></div>)}</div>;
}

function SessionCard({ punch, index, invoices, money, settings }) {
  const invoiceText = getInvoiceLabel(punch, invoices);
  return (
    <article className="day-session-card">
      <div className="day-session-header"><div><span className="day-session-kicker">Session {index + 1}</span><h3>{punch.workerName || "Travailleur"}</h3></div><span className="day-pay-badge">{payTypeLabel(punch.payType)}</span></div>
      <div className="day-section"><h4>📍 Chantier</h4><div className="day-detail-grid"><DetailItem label="Client / job" value={punch.clientName || punch.jobName || "Aucun client"} strong /><DetailItem label="Adresse" value={punch.jobAddress || "Aucune adresse"} /></div></div>
      <div className="day-section"><h4>⏰ Horaire</h4><div className="day-detail-grid three"><DetailItem label="Départ" value={formatTime(punch.startedAt, settings.locale, settings.timeZone)} /><DetailItem label="Fin" value={formatTime(punch.endedAt, settings.locale, settings.timeZone)} /><DetailItem label="Temps net" value={`${Number(punch.workedHours || 0).toFixed(2)} h`} strong /></div></div>
      <div className="day-section"><h4>☕ Pauses</h4><BreakDetails breaks={punch.breaks || []} settings={settings} /><div className="day-total-line"><span>Total pauses</span><strong>{minutesToHours(punch.breakMinutes || 0).toFixed(2)} h</strong></div></div>
      <div className="day-section"><h4>💰 Paiement</h4><div className="day-detail-grid">{paymentDetails(punch, money).map((item) => <DetailItem key={item.label} label={item.label} value={item.value} />)}<DetailItem label="Temps brut" value={`${minutesToHours(punch.grossMinutes || 0).toFixed(2)} h`} /><DetailItem label="Valeur horaire" value={`${money(punch.effectiveHourly || 0)} / h`} /></div><div className="day-money-box"><span>Montant de la session</span><strong>{money(punch.amount || 0)}</strong></div></div>
      <div className="day-section"><h4>📄 Facture et paye</h4><div className="day-detail-grid"><DetailItem label="Facture" value={invoiceText} strong /><DetailItem label="Paye" value={punch.payrollStatus === "paid" ? "Payée" : "Non payée"} /></div></div>
      {punch.notes && <div className="day-section"><h4>📝 Notes</h4><p className="day-note-text">{punch.notes}</p></div>}
    </article>
  );
}

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
      <div className="hero-card"><span className="status-pill">Calendrier</span><h2>{isOwner ? "Calendrier administrateur" : "Calendrier employé"}</h2><p>{isOwner ? "Vue complète des journées, sessions, pauses, montants et factures liées pour tous les travailleurs." : "Vue personnelle de tes journées, heures, pauses, montants et statuts de facture."}</p><div className="action-row"><button className="secondary-action" type="button" onClick={() => moveMonth(-1)}>Mois précédent</button><button className="secondary-action" type="button" onClick={() => moveMonth(1)}>Mois suivant</button></div></div>
      <div className="info-card"><h2>{monthTitle}</h2><div className="mini-stats"><span>{monthSummary.workedDays} jours travaillés</span><span>{monthSummary.punchCount} sessions</span><span>{monthSummary.workedHours.toFixed(2)} h travaillées</span><span>{monthSummary.breakHours.toFixed(2)} h pauses</span><span>{money(monthSummary.amount)}</span></div></div>
      <div className="info-card calendar-legend-card"><h2>Légende des journées</h2><p className="calendar-legend-note">La journée normale est basée sur un quart standard de 8 heures. Les couleurs sont les mêmes pour le calendrier admin et le calendrier employé.</p><div className="legend-grid calendar-legend-grid">{dayClasses.map((item) => <span className={`legend-pill day-${item.id}`} key={item.id}><span className="legend-emoji">{item.emoji}</span><strong>{item.name}</strong><small>{item.range}</small></span>)}</div></div>
      <div className="calendar-grid">{monthDays.map((day, index) => { if (!day) return <div className="calendar-cell muted-cell" key={`empty-${index}`} />; const punches = punchesByDate[day] || []; const hours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0); const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0); const dayClass = getDayClass(hours); const dayInfo = getDayClassInfo(hours); return <button className={`calendar-cell day-${dayClass}`} key={day} type="button" onClick={() => setSelectedDate(day)} aria-label={`${day} · ${getDayLabel(hours)}`}><strong>{Number(day.slice(-2))} <span aria-hidden="true">{dayInfo.emoji}</span></strong>{hours > 0 ? <span>{hours.toFixed(1)} h</span> : <span>Congé</span>}{punches.length > 1 && <small>{punches.length} sessions</small>}{amount > 0 && <small>{money(amount)}</small>}</button>; })}</div>
      {selectedDate && <div className="modal-backdrop"><div className="modal-card wide-modal day-detail-modal"><div className="day-modal-header"><div><span className={`status-pill day-${selectedDayInfo.id}`}>{selectedDayInfo.emoji} {selectedDayInfo.name} · {selectedDayInfo.range}</span><h2>{formatDate(selectedDate, settings.locale, settings.timeZone)}</h2></div><button className="secondary-action" type="button" onClick={() => setSelectedDate(null)}>Fermer</button></div>{selectedPunches.length === 0 ? <p className="day-empty-note">Aucun punch sauvegardé pour cette journée.</p> : <><div className="day-summary-strip"><div><span>Sessions</span><strong>{selectedSummary.sessionCount}</strong></div><div><span>Temps net</span><strong>{selectedSummary.workedHours.toFixed(2)} h</strong></div><div><span>Pauses</span><strong>{selectedSummary.breakHours.toFixed(2)} h</strong></div><div><span>Montant</span><strong>{money(selectedSummary.amount)}</strong></div></div><div className="day-session-list">{selectedPunches.map((punch, index) => <SessionCard key={punch.id} punch={punch} index={index} invoices={invoices} money={money} settings={settings} />)}</div></>}</div></div>}
    </section>
  );
}
