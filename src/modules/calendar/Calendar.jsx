import { useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { formatMoney } from "../../utils/money.js";
import { formatDate, formatTime, minutesToHours } from "../../utils/dates.js";

const dayClasses = [
  { id: "tiny", label: "0-2 h", min: 0, max: 2 },
  { id: "small", label: "2-4 h", min: 2, max: 4 },
  { id: "short", label: "4-6 h", min: 4, max: 6 },
  { id: "normal", label: "6-8 h", min: 6, max: 8 },
  { id: "big", label: "8-10 h", min: 8, max: 10 },
  { id: "very-big", label: "10-12 h", min: 10, max: 12 },
  { id: "explosive", label: "12 h+", min: 12, max: Infinity }
];

function getMonthDays(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);
  const firstWeekday = firstDate.getDay();
  const days = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    const value = new Date(year, month, day);
    days.push(value.toISOString().slice(0, 10));
  }

  return days;
}

function getDayClass(hours) {
  if (!hours || hours <= 0) {
    return "empty";
  }

  const match = dayClasses.find((item) => hours > item.min && hours <= item.max);
  return match?.id || "explosive";
}

function groupPunchesByDate(punches = []) {
  return punches.reduce((groups, punch) => {
    const key = punch.startedAt?.slice(0, 10);

    if (!key) {
      return groups;
    }

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(punch);
    return groups;
  }, {});
}

export default function Calendar() {
  const { appData } = useAppData();
  const [selectedDate, setSelectedDate] = useState(null);
  const settings = appData.settings || {};
  const monthDays = useMemo(() => getMonthDays(new Date()), []);
  const punchesByDate = useMemo(() => groupPunchesByDate(appData.punches || []), [appData.punches]);
  const selectedPunches = selectedDate ? punchesByDate[selectedDate] || [] : [];

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Calendar</span>
        <h2>Work calendar</h2>
        <p>Click a worked day to see punch details, pay type, hours, breaks and earned amount.</p>
      </div>

      <div className="info-card">
        <h2>Legend</h2>
        <div className="legend-grid">
          {dayClasses.map((item) => (
            <span className={`legend-pill day-${item.id}`} key={item.id}>{item.label}</span>
          ))}
        </div>
      </div>

      <div className="calendar-grid">
        {monthDays.map((day, index) => {
          if (!day) {
            return <div className="calendar-cell muted-cell" key={`empty-${index}`} />;
          }

          const punches = punchesByDate[day] || [];
          const hours = punches.reduce((total, punch) => total + Number(punch.workedHours || 0), 0);
          const amount = punches.reduce((total, punch) => total + Number(punch.amount || 0), 0);
          const dayClass = getDayClass(hours);

          return (
            <button className={`calendar-cell day-${dayClass}`} key={day} type="button" onClick={() => setSelectedDate(day)}>
              <strong>{Number(day.slice(-2))}</strong>
              {hours > 0 && <span>{hours.toFixed(1)} h</span>}
              {amount > 0 && <small>{formatMoney(amount, settings.currency || "CAD", settings.locale || "fr-CA")}</small>}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="info-card">
          <h2>{formatDate(selectedDate)}</h2>
          {selectedPunches.length === 0 ? <p>No punch saved for this day.</p> : (
            <div className="simple-list">
              {selectedPunches.map((punch) => (
                <div className="list-item" key={punch.id}>
                  <strong>{punch.workerName} - {punch.clientName || "No client"}</strong>
                  <span>{punch.jobAddress || punch.jobName || "No job address"}</span>
                  <span>Pay type: {punch.payType}</span>
                  <span>Start: {formatTime(punch.startedAt)} | Finish: {formatTime(punch.endedAt)}</span>
                  <span>Break: {minutesToHours(punch.breakMinutes || 0).toFixed(2)} h | Worked: {Number(punch.workedHours || 0).toFixed(2)} h</span>
                  <span>Earned: {formatMoney(punch.amount || 0, settings.currency || "CAD", settings.locale || "fr-CA")}</span>
                  <span>Effective hourly: {formatMoney(punch.effectiveHourly || 0, settings.currency || "CAD", settings.locale || "fr-CA")} / h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
