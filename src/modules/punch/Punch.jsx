import { useEffect, useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { calculateEffectiveHourly, calculatePunchAmount, PAY_TYPES } from "../../utils/calculations.js";
import { formatTime, minutesBetween, minutesToHours, secondsBetween, secondsToClock, secondsToHours } from "../../utils/dates.js";
import { buildInvoicesFromPunches } from "../../utils/invoiceHelpers.js";
import { formatMoney } from "../../utils/money.js";

const defaultForm = { workerId: "owner", clientId: "", clientName: "", jobAddress: "", jobName: "", payType: PAY_TYPES.HOURLY, hourlyRate: "0", squareFeet: "0", squareFootRate: "0", fixedAmount: "0", notes: "" };

function getBreakSeconds(breaks = [], nowISO = new Date().toISOString()) {
  return breaks.reduce((total, item) => total + secondsBetween(item.startedAt, item.endedAt || nowISO), 0);
}

function getWorkedSeconds(activePunch, nowISO = new Date().toISOString()) {
  if (!activePunch) return 0;
  return Math.max(0, secondsBetween(activePunch.startedAt, nowISO) - getBreakSeconds(activePunch.breaks || [], nowISO));
}

function getPayLabel(payType) {
  if (payType === PAY_TYPES.SQUARE_FOOT) return "pi²";
  if (payType === PAY_TYPES.FIXED) return "Job";
  return "Heure";
}

export default function Punch() {
  const { appData, updateAppData } = useAppData();
  const { isOwner, workerId: sessionWorkerId } = useSession();
  const [form, setForm] = useState(defaultForm);
  const [showStartModal, setShowStartModal] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const activePunch = appData.activePunch || null;
  const allWorkers = (appData.workers || []).filter((worker) => worker.active !== false);
  const workers = isOwner ? allWorkers : allWorkers.filter((worker) => worker.id === sessionWorkerId);
  const clients = (appData.clients || []).filter((client) => client.active !== false);
  const settings = appData.settings || {};
  const nowISO = now.toISOString();
  const visibleActivePunch = activePunch && (isOwner || activePunch.workerId === sessionWorkerId) ? activePunch : null;
  const isOnBreak = Boolean(visibleActivePunch?.currentBreakStartedAt);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isOwner && sessionWorkerId && form.workerId !== sessionWorkerId) {
      const worker = allWorkers.find((item) => item.id === sessionWorkerId);
      setForm((currentForm) => ({ ...currentForm, workerId: sessionWorkerId, hourlyRate: String(worker?.defaultHourlyRate ?? currentForm.hourlyRate), squareFootRate: String(worker?.defaultSquareFootRate ?? currentForm.squareFootRate) }));
    }
  }, [isOwner, sessionWorkerId, allWorkers, form.workerId]);

  const workedSeconds = useMemo(() => getWorkedSeconds(visibleActivePunch, nowISO), [visibleActivePunch, nowISO]);
  const breakSeconds = useMemo(() => getBreakSeconds(visibleActivePunch?.breaks || [], nowISO), [visibleActivePunch, nowISO]);
  const workedMinutes = Math.round(workedSeconds / 60);
  const liveAmount = useMemo(() => {
    if (!visibleActivePunch) return 0;
    if (visibleActivePunch.payType === PAY_TYPES.HOURLY) return Number(visibleActivePunch.hourlyRate || 0) * secondsToHours(workedSeconds);
    return calculatePunchAmount({ payType: visibleActivePunch.payType, workedMinutes, hourlyRate: visibleActivePunch.hourlyRate, squareFeet: visibleActivePunch.squareFeet, squareFootRate: visibleActivePunch.squareFootRate, fixedAmount: visibleActivePunch.fixedAmount });
  }, [visibleActivePunch, workedSeconds, workedMinutes]);
  const effectiveHourly = calculateEffectiveHourly(liveAmount, workedMinutes);
  const updateField = (field, value) => setForm((currentForm) => ({ ...currentForm, [field]: value }));

  const selectWorker = (workerId) => {
    if (!isOwner && workerId !== sessionWorkerId) return;
    const worker = allWorkers.find((item) => item.id === workerId);
    setForm((currentForm) => ({ ...currentForm, workerId, hourlyRate: String(worker?.defaultHourlyRate ?? currentForm.hourlyRate), squareFootRate: String(worker?.defaultSquareFootRate ?? currentForm.squareFootRate) }));
  };

  const selectClient = (clientId) => {
    const client = clients.find((item) => item.id === clientId);
    setForm((currentForm) => ({ ...currentForm, clientId, clientName: client?.name || currentForm.clientName, jobAddress: client?.civicAddress || currentForm.jobAddress }));
  };

  const confirmStartPunch = () => {
    const forcedWorkerId = isOwner ? form.workerId : sessionWorkerId;
    const worker = allWorkers.find((item) => item.id === forcedWorkerId) || allWorkers[0];
    const client = clients.find((item) => item.id === form.clientId);
    updateAppData((currentData) => ({ ...currentData, activePunch: { id: `active-${Date.now()}`, workerId: forcedWorkerId, workerName: worker?.name || "Worker", clientId: form.clientId, clientName: form.clientName.trim(), clientPhone: client?.phone || "", clientEmail: client?.email || "", jobAddress: form.jobAddress.trim(), jobName: form.jobName.trim(), payType: form.payType, hourlyRate: Number(form.hourlyRate || 0), squareFeet: Number(form.squareFeet || 0), squareFootRate: Number(form.squareFootRate || 0), fixedAmount: Number(form.fixedAmount || 0), notes: form.notes.trim(), startedAt: new Date().toISOString(), breaks: [], currentBreakStartedAt: null } }));
    setShowStartModal(false);
    setNow(new Date());
  };

  const startBreak = () => {
    if (!visibleActivePunch || isOnBreak) return;
    updateAppData((currentData) => ({ ...currentData, activePunch: { ...currentData.activePunch, currentBreakStartedAt: new Date().toISOString() } }));
  };

  const endBreak = () => {
    if (!visibleActivePunch || !isOnBreak) return;
    const endedAt = new Date().toISOString();
    const newBreak = { id: `break-${Date.now()}`, startedAt: visibleActivePunch.currentBreakStartedAt, endedAt, minutes: minutesBetween(visibleActivePunch.currentBreakStartedAt, endedAt) };
    updateAppData((currentData) => ({ ...currentData, activePunch: { ...currentData.activePunch, currentBreakStartedAt: null, breaks: [...(currentData.activePunch.breaks || []), newBreak] } }));
  };

  const stopPunch = () => {
    if (!visibleActivePunch) return;
    const endedAt = new Date().toISOString();
    const finalBreaks = [...(visibleActivePunch.breaks || [])];
    if (visibleActivePunch.currentBreakStartedAt) finalBreaks.push({ id: `break-${Date.now()}`, startedAt: visibleActivePunch.currentBreakStartedAt, endedAt, minutes: minutesBetween(visibleActivePunch.currentBreakStartedAt, endedAt) });
    const grossSeconds = secondsBetween(visibleActivePunch.startedAt, endedAt);
    const finalBreakSeconds = getBreakSeconds(finalBreaks, endedAt);
    const finalWorkedSeconds = Math.max(0, grossSeconds - finalBreakSeconds);
    const grossMinutes = Math.round(grossSeconds / 60);
    const finalBreakMinutes = Math.round(finalBreakSeconds / 60);
    const finalWorkedMinutes = Math.round(finalWorkedSeconds / 60);
    const amount = visibleActivePunch.payType === PAY_TYPES.HOURLY ? Number(visibleActivePunch.hourlyRate || 0) * secondsToHours(finalWorkedSeconds) : calculatePunchAmount({ ...visibleActivePunch, workedMinutes: finalWorkedMinutes });
    const completedPunch = { ...visibleActivePunch, id: `punch-${Date.now()}`, endedAt, breaks: finalBreaks, currentBreakStartedAt: null, grossMinutes, breakMinutes: finalBreakMinutes, workedMinutes: finalWorkedMinutes, workedHours: secondsToHours(finalWorkedSeconds), amount, effectiveHourly: calculateEffectiveHourly(amount, finalWorkedMinutes), invoiceStatus: "not_invoiced" };

    updateAppData((currentData) => {
      const nextPunches = [completedPunch, ...(currentData.punches || [])];
      const result = buildInvoicesFromPunches({ punches: nextPunches, invoices: currentData.invoices || [], taxes: currentData.settings?.taxProfile?.taxes || [], workers: currentData.workers || [] });
      return { ...currentData, activePunch: null, punches: result.punches, invoices: result.invoices };
    });
  };

  const visibleRecentPunches = isOwner ? (appData.punches || []) : (appData.punches || []).filter((punch) => punch.workerId === sessionWorkerId);
  const currentPayType = visibleActivePunch?.payType || form.payType;
  const currentRate = visibleActivePunch?.payType === PAY_TYPES.SQUARE_FOOT ? visibleActivePunch?.squareFootRate : visibleActivePunch?.payType === PAY_TYPES.FIXED ? visibleActivePunch?.fixedAmount : visibleActivePunch?.hourlyRate;
  const setupForm = <div className="form-grid"><label className="field"><span>Worker</span><select value={isOwner ? form.workerId : sessionWorkerId} disabled={!isOwner} onChange={(event) => selectWorker(event.target.value)}>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label><label className="field"><span>Saved client</span><select value={form.clientId} onChange={(event) => selectClient(event.target.value)}><option value="">Manual / no saved client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="field"><span>Pay type</span><select value={form.payType} onChange={(event) => updateField("payType", event.target.value)}><option value={PAY_TYPES.HOURLY}>Hourly / à l'heure</option><option value={PAY_TYPES.SQUARE_FOOT}>Square foot / pi²</option><option value={PAY_TYPES.FIXED}>Fixed price / à la job</option></select></label><label className="field"><span>Client / company</span><input value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} /></label><label className="field"><span>Address / job</span><input value={form.jobAddress} onChange={(event) => updateField("jobAddress", event.target.value)} /></label><label className="field"><span>Short job name</span><input value={form.jobName} onChange={(event) => updateField("jobName", event.target.value)} /></label>{form.payType === PAY_TYPES.HOURLY && <label className="field"><span>Hourly rate</span><input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(event) => updateField("hourlyRate", event.target.value)} /></label>}{form.payType === PAY_TYPES.SQUARE_FOOT && <><label className="field"><span>Square feet / pi²</span><input type="number" min="0" step="0.01" value={form.squareFeet} onChange={(event) => updateField("squareFeet", event.target.value)} /></label><label className="field"><span>Rate per sq ft</span><input type="number" min="0" step="0.01" value={form.squareFootRate} onChange={(event) => updateField("squareFootRate", event.target.value)} /></label></>}{form.payType === PAY_TYPES.FIXED && <label className="field"><span>Fixed amount / job</span><input type="number" min="0" step="0.01" value={form.fixedAmount} onChange={(event) => updateField("fixedAmount", event.target.value)} /></label>}<label className="field field-full"><span>Notes</span><textarea rows="3" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} /></label></div>;

  return <section className="module-page"><div className="hero-card"><span className="status-pill">{visibleActivePunch ? (isOnBreak ? "On break" : "Punch active") : "Ready"}</span><h2>Punch in / Punch out</h2><p>{isOwner ? "Owner can manage any worker." : "Worker mode: your punch only."}</p><div className="punch-meters"><div className="punch-money-panel"><span className="punch-meter-label">Argent en direct</span><div className="money-preview">{formatMoney(liveAmount, settings.currency || "CAD", settings.locale || "fr-CA")}</div></div><div className="punch-time-panel"><span className="punch-meter-label">Temps travaillé</span><div className="time-preview">{secondsToClock(workedSeconds)}</div><div className="punch-side-info"><span className="punch-chip">{getPayLabel(currentPayType)}</span><span className="punch-chip">{isOnBreak ? "Break" : visibleActivePunch ? "Actif" : "Prêt"}</span><span className="punch-chip">{formatMoney(currentRate || 0, settings.currency || "CAD", settings.locale || "fr-CA")}</span><span className="punch-chip">{formatMoney(effectiveHourly, settings.currency || "CAD", settings.locale || "fr-CA")}/h</span></div></div></div><div className="mini-stats"><span>{secondsToHours(workedSeconds).toFixed(2)} h worked</span><span>{secondsToHours(breakSeconds).toFixed(2)} h break</span>{visibleActivePunch && <span>Started {formatTime(visibleActivePunch.startedAt)}</span>}</div><div className="action-row">{!visibleActivePunch ? <button className="primary-action" type="button" onClick={() => setShowStartModal(true)}>Punch In</button> : <><button className="secondary-action" type="button" onClick={isOnBreak ? endBreak : startBreak}>{isOnBreak ? "Break Out" : "Break In"}</button><button className="primary-action" type="button" onClick={stopPunch}>Punch Out</button></>}</div></div>{showStartModal && <div className="modal-backdrop"><div className="modal-card"><span className="status-pill">Start work</span><h2>How are you working?</h2>{setupForm}<div className="action-row"><button className="secondary-action" type="button" onClick={() => setShowStartModal(false)}>Cancel</button><button className="primary-action" type="button" onClick={confirmStartPunch}>Confirm Punch In</button></div></div></div>}<div className="info-card"><h2>Recent punches</h2>{visibleRecentPunches.length === 0 ? <p>No saved punch yet.</p> : <div className="simple-list">{visibleRecentPunches.slice(0, 5).map((punch) => <div className="list-item" key={punch.id}><strong>{punch.workerName}</strong><span>{punch.clientName || "No client"}</span><span>{Number(punch.workedHours || 0).toFixed(2)} h | Break {minutesToHours(punch.breakMinutes || 0).toFixed(2)} h | {formatMoney(punch.amount, settings.currency || "CAD", settings.locale || "fr-CA")}</span>{isOwner && <span>Invoice: {punch.invoiceStatus || "not_invoiced"}</span>}</div>)}</div>}</div></section>;
}
