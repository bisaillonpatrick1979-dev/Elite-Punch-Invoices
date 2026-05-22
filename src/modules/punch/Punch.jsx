import { useEffect, useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { calculateEffectiveHourly, calculatePunchAmount, PAY_TYPES } from "../../utils/calculations.js";
import { formatMoney } from "../../utils/money.js";
import { formatTime, minutesBetween, minutesToHours } from "../../utils/dates.js";

const defaultForm = {
  workerId: "owner",
  clientName: "",
  jobAddress: "",
  jobName: "",
  payType: PAY_TYPES.HOURLY,
  hourlyRate: "0",
  squareFeet: "0",
  squareFootRate: "0",
  fixedAmount: "0",
  notes: ""
};

function getBreakMinutes(breaks = [], nowISO = new Date().toISOString()) {
  return breaks.reduce((total, item) => {
    const endValue = item.endedAt || nowISO;
    return total + minutesBetween(item.startedAt, endValue);
  }, 0);
}

function getWorkedMinutes(activePunch, nowISO = new Date().toISOString()) {
  if (!activePunch) {
    return 0;
  }

  const grossMinutes = minutesBetween(activePunch.startedAt, nowISO);
  const breakMinutes = getBreakMinutes(activePunch.breaks || [], nowISO);
  return Math.max(0, grossMinutes - breakMinutes);
}

export default function Punch() {
  const { appData, updateAppData } = useAppData();
  const [form, setForm] = useState(defaultForm);
  const [now, setNow] = useState(() => new Date());

  const activePunch = appData.activePunch || null;
  const workers = appData.workers || [];
  const settings = appData.settings || {};
  const nowISO = now.toISOString();
  const isOnBreak = Boolean(activePunch?.currentBreakStartedAt);

  useEffect(() => {
    if (!activePunch) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activePunch]);

  const workedMinutes = useMemo(() => getWorkedMinutes(activePunch, nowISO), [activePunch, nowISO]);
  const breakMinutes = useMemo(() => getBreakMinutes(activePunch?.breaks || [], nowISO), [activePunch, nowISO]);

  const liveAmount = useMemo(() => {
    if (!activePunch) {
      return 0;
    }

    return calculatePunchAmount({
      payType: activePunch.payType,
      workedMinutes,
      hourlyRate: activePunch.hourlyRate,
      squareFeet: activePunch.squareFeet,
      squareFootRate: activePunch.squareFootRate,
      fixedAmount: activePunch.fixedAmount
    });
  }, [activePunch, workedMinutes]);

  const effectiveHourly = calculateEffectiveHourly(liveAmount, workedMinutes);

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const startPunch = () => {
    const worker = workers.find((item) => item.id === form.workerId) || workers[0];

    updateAppData((currentData) => ({
      ...currentData,
      activePunch: {
        id: `active-${Date.now()}`,
        workerId: form.workerId,
        workerName: worker?.name || "Worker",
        clientName: form.clientName.trim(),
        jobAddress: form.jobAddress.trim(),
        jobName: form.jobName.trim(),
        payType: form.payType,
        hourlyRate: Number(form.hourlyRate || 0),
        squareFeet: Number(form.squareFeet || 0),
        squareFootRate: Number(form.squareFootRate || 0),
        fixedAmount: Number(form.fixedAmount || 0),
        notes: form.notes.trim(),
        startedAt: new Date().toISOString(),
        breaks: [],
        currentBreakStartedAt: null
      }
    }));

    setNow(new Date());
  };

  const startBreak = () => {
    if (!activePunch || isOnBreak) {
      return;
    }

    updateAppData((currentData) => ({
      ...currentData,
      activePunch: {
        ...currentData.activePunch,
        currentBreakStartedAt: new Date().toISOString()
      }
    }));
  };

  const endBreak = () => {
    if (!activePunch || !isOnBreak) {
      return;
    }

    const endedAt = new Date().toISOString();
    const newBreak = {
      id: `break-${Date.now()}`,
      startedAt: activePunch.currentBreakStartedAt,
      endedAt,
      minutes: minutesBetween(activePunch.currentBreakStartedAt, endedAt)
    };

    updateAppData((currentData) => ({
      ...currentData,
      activePunch: {
        ...currentData.activePunch,
        currentBreakStartedAt: null,
        breaks: [...(currentData.activePunch.breaks || []), newBreak]
      }
    }));
  };

  const stopPunch = () => {
    if (!activePunch) {
      return;
    }

    const endedAt = new Date().toISOString();
    const finalBreaks = [...(activePunch.breaks || [])];

    if (activePunch.currentBreakStartedAt) {
      finalBreaks.push({
        id: `break-${Date.now()}`,
        startedAt: activePunch.currentBreakStartedAt,
        endedAt,
        minutes: minutesBetween(activePunch.currentBreakStartedAt, endedAt)
      });
    }

    const grossMinutes = minutesBetween(activePunch.startedAt, endedAt);
    const finalBreakMinutes = getBreakMinutes(finalBreaks, endedAt);
    const finalWorkedMinutes = Math.max(0, grossMinutes - finalBreakMinutes);
    const amount = calculatePunchAmount({ ...activePunch, workedMinutes: finalWorkedMinutes });

    const completedPunch = {
      ...activePunch,
      id: `punch-${Date.now()}`,
      endedAt,
      breaks: finalBreaks,
      currentBreakStartedAt: null,
      grossMinutes,
      breakMinutes: finalBreakMinutes,
      workedMinutes: finalWorkedMinutes,
      workedHours: minutesToHours(finalWorkedMinutes),
      amount,
      effectiveHourly: calculateEffectiveHourly(amount, finalWorkedMinutes),
      invoiceStatus: "not_invoiced"
    };

    updateAppData((currentData) => ({
      ...currentData,
      activePunch: null,
      punches: [completedPunch, ...(currentData.punches || [])]
    }));
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">{activePunch ? (isOnBreak ? "On break" : "Punch active") : "Ready"}</span>
        <h2>Punch in / Punch out</h2>
        <p>Simple local punch with break tracking. Invoice creation will be connected later.</p>

        <div className="money-preview">
          {formatMoney(liveAmount, settings.currency || "CAD", settings.locale || "fr-CA")}
        </div>

        <div className="mini-stats">
          <span>{minutesToHours(workedMinutes).toFixed(2)} h worked</span>
          <span>{minutesToHours(breakMinutes).toFixed(2)} h break</span>
          <span>{formatMoney(effectiveHourly, settings.currency || "CAD", settings.locale || "fr-CA")} / h</span>
          {activePunch && <span>Started {formatTime(activePunch.startedAt)}</span>}
        </div>

        <div className="action-row">
          {!activePunch ? (
            <button className="primary-action" type="button" onClick={startPunch}>Punch In</button>
          ) : (
            <>
              <button className="secondary-action" type="button" onClick={isOnBreak ? endBreak : startBreak}>
                {isOnBreak ? "Break Out" : "Break In"}
              </button>
              <button className="primary-action" type="button" onClick={stopPunch}>Punch Out</button>
            </>
          )}
        </div>
      </div>

      {!activePunch && (
        <div className="info-card">
          <h2>Punch setup</h2>
          <div className="form-grid">
            <label className="field"><span>Worker</span><select value={form.workerId} onChange={(event) => updateField("workerId", event.target.value)}>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label>
            <label className="field"><span>Pay type</span><select value={form.payType} onChange={(event) => updateField("payType", event.target.value)}><option value={PAY_TYPES.HOURLY}>Hourly</option><option value={PAY_TYPES.SQUARE_FOOT}>Square foot</option><option value={PAY_TYPES.FIXED}>Fixed price</option></select></label>
            <label className="field"><span>Client / company</span><input value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} /></label>
            <label className="field"><span>Address / job</span><input value={form.jobAddress} onChange={(event) => updateField("jobAddress", event.target.value)} /></label>
            <label className="field"><span>Short job name</span><input value={form.jobName} onChange={(event) => updateField("jobName", event.target.value)} /></label>
            {form.payType === PAY_TYPES.HOURLY && <label className="field"><span>Hourly rate</span><input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(event) => updateField("hourlyRate", event.target.value)} /></label>}
            {form.payType === PAY_TYPES.SQUARE_FOOT && <><label className="field"><span>Square feet</span><input type="number" min="0" step="0.01" value={form.squareFeet} onChange={(event) => updateField("squareFeet", event.target.value)} /></label><label className="field"><span>Rate per sq ft</span><input type="number" min="0" step="0.01" value={form.squareFootRate} onChange={(event) => updateField("squareFootRate", event.target.value)} /></label></>}
            {form.payType === PAY_TYPES.FIXED && <label className="field"><span>Fixed amount</span><input type="number" min="0" step="0.01" value={form.fixedAmount} onChange={(event) => updateField("fixedAmount", event.target.value)} /></label>}
            <label className="field field-full"><span>Notes</span><textarea rows="3" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} /></label>
          </div>
        </div>
      )}

      <div className="info-card">
        <h2>Recent punches</h2>
        {(appData.punches || []).length === 0 ? <p>No saved punch yet.</p> : (
          <div className="simple-list">
            {appData.punches.slice(0, 5).map((punch) => (
              <div className="list-item" key={punch.id}>
                <strong>{punch.workerName}</strong>
                <span>{punch.clientName || "No client"}</span>
                <span>{punch.workedHours.toFixed(2)} h | Break {minutesToHours(punch.breakMinutes || 0).toFixed(2)} h | {formatMoney(punch.amount, settings.currency || "CAD", settings.locale || "fr-CA")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
