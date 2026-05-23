import { createInitialAppData } from "./seed.js";

const DEFAULT_PIN = "0000";

function mergeSettings(defaultSettings, settings = {}) {
  return {
    ...defaultSettings,
    ...settings,
    ownerKey: settings.ownerKey || settings.adminAccessCode || DEFAULT_PIN,
    measurementSystem: {
      ...defaultSettings.measurementSystem,
      ...(settings.measurementSystem || {})
    },
    taxProfile: {
      ...defaultSettings.taxProfile,
      ...(settings.taxProfile || {}),
      taxes: Array.isArray(settings.taxProfile?.taxes)
        ? settings.taxProfile.taxes
        : defaultSettings.taxProfile.taxes
    },
    billingProfile: {
      ...defaultSettings.billingProfile,
      ...(settings.billingProfile || {})
    }
  };
}

function makePrefix(name = "worker") {
  return String(name || "worker").trim().toLowerCase().split(" ").filter(Boolean).join("-") || "worker";
}

function normalizeWorker(worker = {}) {
  const name = worker.name || "Worker";
  return {
    ...worker,
    name,
    workerKey: worker.workerKey || worker.accessCode || DEFAULT_PIN,
    invoicePrefix: worker.invoicePrefix || makePrefix(name),
    nextInvoiceNumber: Number(worker.nextInvoiceNumber || 1)
  };
}

export function normalizeAppData(data) {
  const defaults = createInitialAppData();
  const incoming = data && typeof data === "object" ? data : {};
  const workers = Array.isArray(incoming.workers) ? incoming.workers : defaults.workers;

  return {
    ...defaults,
    ...incoming,
    settings: mergeSettings(defaults.settings, incoming.settings || {}),
    workers: workers.map(normalizeWorker),
    clients: Array.isArray(incoming.clients) ? incoming.clients : defaults.clients,
    punches: Array.isArray(incoming.punches) ? incoming.punches : defaults.punches,
    invoices: Array.isArray(incoming.invoices) ? incoming.invoices : defaults.invoices,
    payrollRuns: Array.isArray(incoming.payrollRuns) ? incoming.payrollRuns : defaults.payrollRuns,
    catalogItems: Array.isArray(incoming.catalogItems) ? incoming.catalogItems : defaults.catalogItems,
    accountingEntries: Array.isArray(incoming.accountingEntries) ? incoming.accountingEntries : defaults.accountingEntries
  };
}
