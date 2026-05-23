import { useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { createInitialAppData } from "../../db/seed.js";
import { buildInvoicesFromPunches } from "../../utils/invoiceHelpers.js";
import { formatMoney } from "../../utils/money.js";

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function makeWorker(id, name, role = "employee") {
  return {
    id,
    name,
    role,
    phone: "",
    email: "",
    active: true,
    workerKey: "0000",
    defaultHourlyRate: 35,
    defaultSquareFootRate: 1.25,
    invoicePrefix: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    nextInvoiceNumber: 1,
    signatureDataUrl: "",
    signatureDate: "",
    notes: "Test worker"
  };
}

function makeClient(id, name, address, email = "client@example.com", phone = "403-555-0100") {
  return { id, name, civicAddress: address, email, phone, active: true, notes: "Dev test client" };
}

function makePunch({ id, workerId, workerName, clientId, clientName, jobAddress, startedAt, endedAt, payType = "hourly", hourlyRate = 35, squareFeet = 0, squareFootRate = 0, fixedAmount = 0, breakMinutes = 30 }) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const grossMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const workedMinutes = Math.max(0, grossMinutes - breakMinutes);
  const workedHours = workedMinutes / 60;
  let amount = hourlyRate * workedHours;
  if (payType === "square-foot") amount = squareFeet * squareFootRate;
  if (payType === "fixed") amount = fixedAmount;
  const breakStart = new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString();
  const breakEnd = new Date(new Date(breakStart).getTime() + breakMinutes * 60000).toISOString();

  return {
    id,
    workerId,
    workerName,
    clientId,
    clientName,
    clientPhone: "403-555-0100",
    clientEmail: "client@example.com",
    jobAddress,
    jobName: clientName,
    payType,
    hourlyRate,
    squareFeet,
    squareFootRate,
    fixedAmount,
    notes: "Generated from Dev Tools",
    startedAt,
    endedAt,
    breaks: breakMinutes > 0 ? [{ id: `${id}-break-1`, startedAt: breakStart, endedAt: breakEnd, minutes: breakMinutes }] : [],
    currentBreakStartedAt: null,
    grossMinutes,
    breakMinutes,
    workedMinutes,
    workedHours,
    amount,
    effectiveHourly: workedHours > 0 ? amount / workedHours : 0,
    invoiceStatus: "not_invoiced",
    payrollStatus: "unpaid"
  };
}

function makeDevData(currentData) {
  const base = createInitialAppData();
  const workers = [
    ...(currentData.workers || base.workers || []),
    makeWorker("worker-ryan", "Ryan"),
    makeWorker("worker-marc", "Marc Andre")
  ].filter((worker, index, array) => array.findIndex((item) => item.id === worker.id) === index);

  const clients = [
    ...(currentData.clients || []),
    makeClient("client-test-1", "Calgary Siding Test", "12 Abalone Crescent NE, Calgary, AB"),
    makeClient("client-test-2", "Garage Fascia Test", "100 Test Avenue NE, Calgary, AB")
  ].filter((client, index, array) => array.findIndex((item) => item.id === client.id) === index);

  const catalogItems = [
    ...(currentData.catalogItems || []),
    { id: "dev-nails", name: "Nails / clous", category: "material", unit: "box", defaultPrice: 85, taxable: true, active: true },
    { id: "dev-caulk", name: "Caulking", category: "material", unit: "unit", defaultPrice: 12, taxable: true, active: true },
    { id: "dev-rental", name: "Tool rental", category: "rental", unit: "day", defaultPrice: 65, taxable: true, active: true }
  ].filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index);

  const todayStart = new Date();
  todayStart.setHours(7, 30, 0, 0);
  const yesterdayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  yesterdayStart.setHours(8, 0, 0, 0);

  const punches = [
    makePunch({ id: `dev-punch-${Date.now()}-1`, workerId: "worker-ryan", workerName: "Ryan", clientId: "client-test-1", clientName: "Calgary Siding Test", jobAddress: "12 Abalone Crescent NE, Calgary, AB", startedAt: todayStart.toISOString(), endedAt: new Date(todayStart.getTime() + 8.5 * 60 * 60 * 1000).toISOString(), payType: "hourly", hourlyRate: 38, breakMinutes: 30 }),
    makePunch({ id: `dev-punch-${Date.now()}-2`, workerId: "worker-ryan", workerName: "Ryan", clientId: "client-test-1", clientName: "Calgary Siding Test", jobAddress: "12 Abalone Crescent NE, Calgary, AB", startedAt: yesterdayStart.toISOString(), endedAt: new Date(yesterdayStart.getTime() + 9 * 60 * 60 * 1000).toISOString(), payType: "square-foot", squareFeet: 420, squareFootRate: 1.35, hourlyRate: 0, breakMinutes: 45 }),
    makePunch({ id: `dev-punch-${Date.now()}-3`, workerId: "worker-marc", workerName: "Marc Andre", clientId: "client-test-2", clientName: "Garage Fascia Test", jobAddress: "100 Test Avenue NE, Calgary, AB", startedAt: hoursAgo(54), endedAt: hoursAgo(46), payType: "fixed", fixedAmount: 650, breakMinutes: 30 })
  ];

  const mergedPunches = [...punches, ...(currentData.punches || [])];
  const invoiceResult = buildInvoicesFromPunches({
    punches: mergedPunches,
    invoices: currentData.invoices || [],
    taxes: currentData.settings?.taxProfile?.taxes || [],
    workers
  });

  return {
    ...currentData,
    settings: { ...(currentData.settings || base.settings), onboardingDone: true, ownerKey: currentData.settings?.ownerKey || "0000" },
    workers,
    clients,
    catalogItems,
    punches: invoiceResult.punches,
    invoices: invoiceResult.invoices
  };
}

export default function DevTools() {
  const { appData, setAppData, updateAppData } = useAppData();
  const [confirmReset, setConfirmReset] = useState(false);
  const settings = appData.settings || {};
  const totals = useMemo(() => {
    const punches = appData.punches || [];
    const invoices = appData.invoices || [];
    return {
      workers: (appData.workers || []).length,
      clients: (appData.clients || []).length,
      catalog: (appData.catalogItems || []).length,
      punches: punches.length,
      invoices: invoices.length,
      openInvoices: invoices.filter((invoice) => invoice.status === "open" || invoice.status === "ready").length,
      amount: punches.reduce((total, punch) => total + Number(punch.amount || 0), 0)
    };
  }, [appData]);

  const money = (value) => formatMoney(value, settings.currency || "CAD", settings.locale || "fr-CA");

  const addDevData = () => setAppData(makeDevData(appData));
  const clearPunchesInvoices = () => updateAppData((currentData) => ({ ...currentData, activePunch: null, punches: [], invoices: [], payrollRuns: [] }));
  const resetToFreshInstall = () => { setAppData(createInitialAppData()); setConfirmReset(false); };
  const unlockOnboarding = () => updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, onboardingDone: false } }));
  const forceAdminPin = () => updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, ownerKey: "0000" } }));
  const markAllInvoicesOpen = () => updateAppData((currentData) => ({ ...currentData, invoices: (currentData.invoices || []).map((invoice) => ({ ...invoice, status: "open", sentAt: "" })) }));

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Dev Tools</span>
        <h2>Developer desk tools</h2>
        <p>Outils admin pour tester vite : données de démo, reset, PIN, onboarding, factures ouvertes et scénarios sans tout remplir à la main.</p>
      </div>

      <div className="card-grid">
        <div className="stat-card"><h3>Workers</h3><p>{totals.workers}</p></div>
        <div className="stat-card"><h3>Clients</h3><p>{totals.clients}</p></div>
        <div className="stat-card"><h3>Catalog</h3><p>{totals.catalog}</p></div>
        <div className="stat-card"><h3>Punches</h3><p>{totals.punches}</p></div>
        <div className="stat-card"><h3>Invoices</h3><p>{totals.invoices}</p></div>
        <div className="stat-card"><h3>Total test money</h3><p>{money(totals.amount)}</p></div>
      </div>

      <div className="info-card">
        <h2>Quick scenario setup</h2>
        <p>Crée des employés, clients, catalogue, punches avec breaks et factures ouvertes automatiquement.</p>
        <div className="action-row"><button className="primary-action" type="button" onClick={addDevData}>Ajouter données de test complètes</button><button className="secondary-action" type="button" onClick={markAllInvoicesOpen}>Remettre toutes les factures ouvertes</button></div>
      </div>

      <div className="info-card">
        <h2>Access tools</h2>
        <div className="action-row"><button className="secondary-action" type="button" onClick={forceAdminPin}>Forcer PIN admin à 0000</button><button className="secondary-action" type="button" onClick={unlockOnboarding}>Relancer onboarding au prochain login</button></div>
      </div>

      <div className="info-card">
        <h2>Clean test state</h2>
        <p>Ces actions sont utiles quand une facture ou un test devient mélangé.</p>
        <div className="action-row"><button className="secondary-action" type="button" onClick={clearPunchesInvoices}>Effacer punches/factures/payes seulement</button>{confirmReset ? <button className="primary-action" type="button" onClick={resetToFreshInstall}>Confirmer reset complet</button> : <button className="secondary-action" type="button" onClick={() => setConfirmReset(true)}>Reset complet app locale</button>}</div>
      </div>

      <div className="info-card">
        <h2>Checklist test rapide</h2>
        <div className="simple-list">
          <div className="list-item"><strong>1. Ajouter données de test</strong><span>Crée Ryan, Marc Andre, deux clients, catalogue, punches et factures.</span></div>
          <div className="list-item"><strong>2. Login employé PIN 0000</strong><span>Vérifie Mes factures, signature par facture, ajout de matériel et aperçu PDF.</span></div>
          <div className="list-item"><strong>3. Calendrier</strong><span>Clique une journée avec plusieurs sessions et vérifie le pop-up.</span></div>
          <div className="list-item"><strong>4. Envoi facture</strong><span>Share / Email / Text doit marquer la facture envoyée et bloquer l’accumulation.</span></div>
        </div>
      </div>
    </section>
  );
}
