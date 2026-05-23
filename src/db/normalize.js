import { createInitialAppData } from "./seed.js";

function mergeSettings(defaultSettings, settings = {}) {
  return {
    ...defaultSettings,
    ...settings,
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

export function normalizeAppData(data) {
  const defaults = createInitialAppData();
  const incoming = data && typeof data === "object" ? data : {};

  return {
    ...defaults,
    ...incoming,
    settings: mergeSettings(defaults.settings, incoming.settings || {}),
    workers: Array.isArray(incoming.workers) ? incoming.workers : defaults.workers,
    clients: Array.isArray(incoming.clients) ? incoming.clients : defaults.clients,
    punches: Array.isArray(incoming.punches) ? incoming.punches : defaults.punches,
    invoices: Array.isArray(incoming.invoices) ? incoming.invoices : defaults.invoices,
    payrollRuns: Array.isArray(incoming.payrollRuns) ? incoming.payrollRuns : defaults.payrollRuns,
    catalogItems: Array.isArray(incoming.catalogItems) ? incoming.catalogItems : defaults.catalogItems,
    accountingEntries: Array.isArray(incoming.accountingEntries) ? incoming.accountingEntries : defaults.accountingEntries
  };
}
