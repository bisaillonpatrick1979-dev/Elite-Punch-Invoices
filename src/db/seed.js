import { DEFAULT_TAX_PROFILE } from "../utils/calculations.js";

export const initialSettings = {
  language: "fr",
  currency: "CAD",
  locale: "fr-CA",
  region: "Alberta",
  timeZone: "America/Edmonton",
  theme: "carbon-gold",
  taxProfile: DEFAULT_TAX_PROFILE,
  measurementSystem: {
    length: "feet-inches",
    area: "square-feet",
    linear: "linear-feet"
  }
};

export const initialWorkers = [
  {
    id: "owner",
    name: "Owner",
    phone: "",
    email: "",
    active: true,
    defaultHourlyRate: 0,
    defaultSquareFootRate: 0,
    notes: ""
  }
];

export const initialCatalogItems = [
  {
    id: "labor-hour",
    name: "Labor hour",
    category: "service",
    unit: "hour",
    defaultPrice: 0,
    taxable: true,
    active: true
  }
];

export function createInitialAppData() {
  return {
    settings: initialSettings,
    workers: initialWorkers,
    clients: [],
    punches: [],
    invoices: [],
    payrollRuns: [],
    catalogItems: initialCatalogItems,
    accountingEntries: []
  };
}
