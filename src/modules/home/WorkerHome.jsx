import { useEffect, useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { secondsBetween, secondsToClock } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

const weekLabels = ["DI", "LU", "MA", "ME", "JE", "VE", "SA"];
const monthLabels = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
const legendItems = [
  { className: "off", icon: "🏖️", label: "Congé", range: "0 h" },
  { className: "tiny", icon: "🍃", label: "Très petite", range: "2–4 h" },
  { className: "small", icon: "👟", label: "Petite", range: "4–6 h" },
  { className: "normal", icon: "🧳", label: "Normale", range: "6–8 h" },
  { className: "big", icon: "💪", label: "Assez grosse", range: "8–10 h" },
  { className: "very-big", icon: "📈", label: "Grosse", range: "10–12 h" },
  { className: "explosive", icon: "🎯", label: "Explosive", range: "12 h+" }
];

function sum(values = []) { return values.reduce((total, value) => total + Number(value || 0), 0); }
function todayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
function getBreakSeconds(breaks = [], nowISO = new Date().toISOString()) { return breaks.reduce((total, item) => total + secondsBetween(item.startedAt, item.endedAt || nowISO), 0); }
function getWorkedSeconds(activePunch, nowISO = new Date().toISOString()) { if (!activePunch) return 0; return Math.max(0, secondsBetween(activePunch.startedAt, nowISO) - getBreakSeconds(activePunch.breaks || [], nowISO)); }
function getDayClass(hours = 0) { if (!hours || hours <= 0) return "off"; if (hours >= 12) return "explosive"; if (hours >= 10) return "very-big"; if (hours >= 8) return "big"; if (hours >= 6) return "normal"; if (hours >= 4) return "small"; return "tiny"; }
function buildCalendarCells(punches, visibleDate) {
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstDay.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const stats = new Map();
  punches.forEach((punch) => { const key = punch.startedAt?.slice(0, 10); if (!key) return; const item = stats.get(key) || { hours: 0, amount: 0 }; item.hours += Number(punch.workedHours || 0); item.amount += Number(punch.amount || 0); stats.set(key, item); });
  return Array.from({ length: totalCells }, (_, index) => { const day = index - leading + 1; if (day < 1 || day > daysInMonth) return null; const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const dayStats = stats.get(dateKey) || { hours: 0, amount: 0 }; return { day, dateKey, ...dayStats, className: getDayClass(dayStats.hours) }; });
}

export default function WorkerHome({ onNavigate }) {
  const { appData } = useAppData();
  const { workerId } = useSession();
  const [now, setNow] = useState(() => new Date());
  const settings = appData.settings || {};
  const worker = (appData.workers || []).find((item) => item.id === workerId);
  const activePunch = appData.activePunch?.workerId === workerId ? appData.activePunch : null;
  const punches = useMemo(() => (appData.punches || []).filter((punch) => punch.workerId === workerId), [appData.punches, workerId]);
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");
  const nowISO = now.toISOString();
  const workedSeconds = getWorkedSeconds(activePunch, nowISO);
  const cells = useMemo(() => buildCalendarCells(punches, now), [punches, now]);

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);

  const summary = useMemo(() => { const todayPunches = punches.filter((punch) => punch.startedAt?.slice(0, 10) === todayKey()); return { todayAmount: sum(todayPunches.map((punch) => punch.amount)), todayHours: sum(todayPunches.map((punch) => punch.workedHours)), todayPunchCount: todayPunches.length }; }, [punches]);
  const statusText = activePunch ? (activePunch.currentBreakStartedAt ? "EN PAUSE" : "EN SERVICE") : "PRÊT À POINTER";
  const monthTitle = `${monthLabels[now.getMonth()]} ${now.getFullYear()}`;
  const currentKey = todayKey(now);

  return (
    <section className="module-page chantier-home worker-chantier-home">
      <div className="chantier-brand-row"><div className="chantier-brand-lockup"><div className="chantier-gem">◆</div><div><span>{worker?.name || "EMPLOYÉ"}</span><strong>ESPACE PUNCH</strong></div></div><button className="chantier-mode-pill" type="button" onClick={() => onNavigate?.("workerOptions")}>EMPLOYÉ</button></div>
      <div className="chantier-readout-grid"><button className="chantier-readout money" type="button" onClick={() => onNavigate?.("payroll")}><span>REVENU AUJOURD’HUI</span><strong>{money(summary.todayAmount)}</strong><small>{summary.todayHours.toFixed(2)} h · {summary.todayPunchCount} session(s)</small></button><button className="chantier-readout time" type="button" onClick={() => onNavigate?.("punch")}><span>{activePunch ? activePunch.clientName || activePunch.jobName || "JOB" : "STATUT"}</span><strong>{activePunch ? secondsToClock(workedSeconds) : "00:00:00"}</strong><small>● {statusText}</small></button></div>
      <div className="chantier-punch-stage"><button className={activePunch ? "chantier-punch-main active" : "chantier-punch-main"} type="button" onClick={() => onNavigate?.("punch")}><span className="chantier-punch-icon">◉</span><strong>{activePunch ? "OUVRIR PUNCH" : "PUNCH IN"}</strong><small>{activePunch ? "Session active" : "Démarrer ma journée"}</small></button><div className="chantier-ready-pill"><span />{statusText}</div></div>
      <div className="chantier-calendar-panel"><div className="chantier-calendar-title"><button type="button" onClick={() => onNavigate?.("calendar")}>‹</button><h2>{monthTitle}</h2><button type="button" onClick={() => onNavigate?.("calendar")}>›</button></div><div className="chantier-calendar-weekdays">{weekLabels.map((label) => <span key={label}>{label}</span>)}</div><div className="chantier-calendar-grid">{cells.map((cell, index) => cell ? <button className={`chantier-day ${cell.className} ${cell.dateKey === currentKey ? "today" : ""}`} key={cell.dateKey} type="button" onClick={() => onNavigate?.("calendar")}><span>{cell.day}</span>{cell.hours > 0 && <small>✓</small>}</button> : <div className="chantier-day empty" key={`empty-${index}`} />)}</div></div>
      <div className="chantier-legend-panel"><h3>◆ LÉGENDE ◆</h3><div className="chantier-legend-grid full-legend">{legendItems.map((item) => <span className={item.className} key={item.className}><b className="legend-gif">{item.icon}</b><strong>{item.label}</strong><small>{item.range}</small></span>)}</div></div>
    </section>
  );
}
