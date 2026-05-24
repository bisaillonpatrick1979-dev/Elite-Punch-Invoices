import { useEffect, useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { secondsBetween, secondsToClock } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

const weekLabels = ["DI", "LU", "MA", "ME", "JE", "VE", "SA"];
const monthLabels = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getBreakSeconds(breaks = [], nowISO = new Date().toISOString()) {
  return breaks.reduce((total, item) => total + secondsBetween(item.startedAt, item.endedAt || nowISO), 0);
}

function getWorkedSeconds(activePunch, nowISO = new Date().toISOString()) {
  if (!activePunch) return 0;
  return Math.max(0, secondsBetween(activePunch.startedAt, nowISO) - getBreakSeconds(activePunch.breaks || [], nowISO));
}

function getDayClass(hours = 0) {
  if (hours >= 10) return "very-big";
  if (hours >= 8) return "big";
  if (hours >= 6) return "normal";
  if (hours > 0) return "small";
  return "off";
}

function buildCalendarCells(punches, visibleDate) {
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstDay.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const stats = new Map();

  punches.forEach((punch) => {
    const key = punch.startedAt?.slice(0, 10);
    if (!key) return;
    const item = stats.get(key) || { hours: 0, amount: 0 };
    item.hours += Number(punch.workedHours || 0);
    item.amount += Number(punch.amount || 0);
    stats.set(key, item);
  });

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - leading + 1;
    if (day < 1 || day > daysInMonth) return null;
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayStats = stats.get(dateKey) || { hours: 0, amount: 0 };
    return { day, dateKey, ...dayStats, className: getDayClass(dayStats.hours) };
  });
}

export default function AdminHome({ onNavigate }) {
  const { appData } = useAppData();
  const [now, setNow] = useState(() => new Date());
  const settings = appData.settings || {};
  const punches = appData.punches || [];
  const workers = (appData.workers || []).filter((worker) => worker.active !== false);
  const activePunch = appData.activePunch || null;
  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");
  const nowISO = now.toISOString();
  const workedSeconds = getWorkedSeconds(activePunch, nowISO);
  const cells = useMemo(() => buildCalendarCells(punches, now), [punches, now]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const summary = useMemo(() => {
    const todayPunches = punches.filter((punch) => punch.startedAt?.slice(0, 10) === todayKey());
    return {
      todayAmount: sum(todayPunches.map((punch) => punch.amount)),
      todayHours: sum(todayPunches.map((punch) => punch.workedHours)),
      todayPunchCount: todayPunches.length,
      activeWorkerCount: workers.length
    };
  }, [punches, workers]);

  const statusText = activePunch ? (activePunch.currentBreakStartedAt ? "EN PAUSE" : "EN SERVICE") : "PRÊT À POINTER";
  const monthTitle = `${monthLabels[now.getMonth()]} ${now.getFullYear()}`;
  const currentKey = todayKey(now);

  return (
    <section className="module-page chantier-home">
      <div className="chantier-brand-row">
        <div className="chantier-brand-lockup">
          <div className="chantier-gem">◆</div>
          <div><span>ELITE PUNCH</span><strong>INVOICE</strong></div>
        </div>
        <button className="chantier-mode-pill" type="button" onClick={() => onNavigate?.("settings")}>ADMIN</button>
      </div>

      <div className="chantier-readout-grid">
        <button className="chantier-readout money" type="button" onClick={() => onNavigate?.("invoices")}>
          <span>REVENU AUJOURD’HUI</span>
          <strong>{money(summary.todayAmount)}</strong>
          <small>{summary.todayHours.toFixed(2)} h · {summary.todayPunchCount} session(s)</small>
        </button>
        <button className="chantier-readout time" type="button" onClick={() => onNavigate?.("punch")}>
          <span>{activePunch ? activePunch.workerName : "STATUT"}</span>
          <strong>{activePunch ? secondsToClock(workedSeconds) : "00:00:00"}</strong>
          <small>● {statusText}</small>
        </button>
      </div>

      <div className="chantier-punch-stage">
        <button className={activePunch ? "chantier-punch-main active" : "chantier-punch-main"} type="button" onClick={() => onNavigate?.("punch")}>
          <span className="chantier-punch-icon">◉</span>
          <strong>{activePunch ? "OUVRIR PUNCH" : "PUNCH IN"}</strong>
          <small>{activePunch ? activePunch.clientName || activePunch.jobName || "Punch actif" : "Démarrer une session"}</small>
        </button>
        <div className="chantier-ready-pill"><span />{statusText}</div>
      </div>

      <div className="chantier-calendar-panel">
        <div className="chantier-calendar-title">
          <button type="button" onClick={() => onNavigate?.("calendar")}>‹</button>
          <h2>{monthTitle}</h2>
          <button type="button" onClick={() => onNavigate?.("calendar")}>›</button>
        </div>
        <div className="chantier-calendar-weekdays">
          {weekLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="chantier-calendar-grid">
          {cells.map((cell, index) => cell ? (
            <button className={`chantier-day ${cell.className} ${cell.dateKey === currentKey ? "today" : ""}`} key={cell.dateKey} type="button" onClick={() => onNavigate?.("calendar")}>
              <span>{cell.day}</span>{cell.hours > 0 && <small>✓</small>}
            </button>
          ) : <div className="chantier-day empty" key={`empty-${index}`} />)}
        </div>
      </div>

      <div className="chantier-legend-panel">
        <h3>◆ LÉGENDE ◆</h3>
        <div className="chantier-legend-grid">
          <span className="off">◇ Congé</span>
          <span className="small">◐ Petite j.</span>
          <span className="normal">✓ Normale</span>
          <span className="big">🔥 Grosse j.</span>
          <span className="very-big">◆ Très grosse</span>
        </div>
      </div>
    </section>
  );
}
