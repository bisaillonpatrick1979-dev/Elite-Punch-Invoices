import { useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { formatDate, formatTime, minutesToHours } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

const dayClasses = [
  { id: "tiny", label: "0-2 h", min: 0, max: 2 },
  { id: "small", label: "2-4 h", min: 2, max: 4 },
  { id: "short", label: "4-6 h", min: 4, max: 6 },
  { id: "normal", label: "6-8 h", min: 6, max: 8 },
  { id: "big", label: "8-10 h", min: 8, max: 10 },
  { id: "very-big", label: "10-12 h", min: 10, max: 12 },
  { id: "explosive", label: "12 h+", min: 12, max: Infinity }
];

function toISODate(date) { return date.toISOString().slice(0, 10); }

function getMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);
  const days = [];
  for (let index = 0; index < firstDate.getDay(); index += 1) days.push(null);
  for (let day = 1; day <= lastDate.getDate(); day += 1) days.push(toISODate(new Date(year, month, day)));
  return days;
}

function getDayClass(hours) {
  if (!hours || hours <= 0) return "empty";
  const match = dayClasses.find((item) => hours > item.min && hours <= item.max);
  return match?.id || "explosive";
}

function groupPunchesByDate(punches = []) {
  return punches.reduce((groups, punch) => {
    const key = punch.startedAt?.slice(0, 10);
    if (!key) return groups;
    if (!groups[key]) groups[key] = [];
    groups[key].push(punch);
    return groups;
  }, {});
}

function getMonthSummary(monthDays, punchesByDate) {
  const workedDays = monthDays.filter(Boolean).filter((day) => (punchesByDate[day] || []).length > 0);
  const punches = workedDays.flatMap((day) => punchesByDate[day] || []);
  const workedHours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0);
  const breakHours = punches.reduce((total, punch) => total + minutesToHours(punch.breakMinutes || 0), 0);
  const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0);
  return { workedDays: workedDays.length, punchCount: punches.length, workedHours, breakHours, amount };
}

export default function Calendar() {
  const { appData } = useAppData();
  const { isOwner, workerId } = useSession();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const settings = appData.settings || {};
  const visiblePunches = useMemo(() => isOwner ? (appData.punches || []) : (appData.punches || []).filter((punch) => punch.workerId === workerId), [appData.punches, isOwner, workerId]);
  const punchesByDate = useMemo(() => groupPunchesByDate(visiblePunches), [visiblePunches]);
  const monthDays = useMemo(() => getMonthDays(viewDate), [viewDate]);
  const monthSummary = useMemo(() => getMonthSummary(monthDays, punchesByDate), [monthDays, punchesByDate]);
  const selectedPunches = selectedDate ? punchesByDate[selectedDate] || [] : [];
  const monthTitle = viewDate.toLocaleDateString(settings.locale || "fr-CA", { month: "long", year: "numeric" });
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");
  const moveMonth = (direction) => { setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1)); setSelectedDate(null); };

  return <section className="module-page"><div className="hero-card"><span className="status-pill">Calendar</span><h2>{isOwner ? "Work calendar" : "My calendar"}</h2><p>{isOwner ? "All worker punch details." : "Only your punches, hours, pay and stats."}</p><div className="action-row"><button className="secondary-action" type="button" onClick={() => moveMonth(-1)}>Previous</button><button className="secondary-action" type="button" onClick={() => moveMonth(1)}>Next</button></div></div><div className="info-card"><h2>{monthTitle}</h2><div className="mini-stats"><span>{monthSummary.workedDays} worked days</span><span>{monthSummary.punchCount} punches</span><span>{monthSummary.workedHours.toFixed(2)} h worked</span><span>{monthSummary.breakHours.toFixed(2)} h break</span><span>{money(monthSummary.amount)}</span></div></div><div className="info-card"><h2>Legend</h2><div className="legend-grid">{dayClasses.map((item) => <span className={`legend-pill day-${item.id}`} key={item.id}>{item.label}</span>)}</div></div><div className="calendar-grid">{monthDays.map((day, index) => { if (!day) return <div className="calendar-cell muted-cell" key={`empty-${index}`} />; const punches = punchesByDate[day] || []; const hours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0); const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0); const dayClass = getDayClass(hours); return <button className={`calendar-cell day-${dayClass}`} key={day} type="button" onClick={() => setSelectedDate(day)}><strong>{Number(day.slice(-2))}</strong>{hours > 0 && <span>{hours.toFixed(1)} h</span>}{amount > 0 && <small>{money(amount)}</small>}</button>; })}</div>{selectedDate && <div className="info-card"><h2>{formatDate(selectedDate, settings.locale, settings.timeZone)}</h2>{selectedPunches.length === 0 ? <p>No punch saved for this day.</p> : <div className="simple-list">{selectedPunches.map((punch) => <div className="list-item" key={punch.id}><strong>{punch.workerName} - {punch.clientName || "No client"}</strong><span>{punch.jobAddress || punch.jobName || "No job address"}</span><span>Pay type: {punch.payType}</span><span>Start: {formatTime(punch.startedAt)} | Finish: {formatTime(punch.endedAt)}</span><span>Break: {minutesToHours(punch.breakMinutes || 0).toFixed(2)} h | Worked: {Number(punch.workedHours || 0).toFixed(2)} h</span><span>Earned: {money(punch.amount || 0)}</span><span>Effective hourly: {money(punch.effectiveHourly || 0)} / h</span><span>Payroll: {punch.payrollStatus === "paid" ? "paid" : "unpaid"}</span>{isOwner && <span>Invoice: {punch.invoiceStatus || "not_invoiced"}</span>}</div>)}</div>}</div>}</section>;
}
