import { DEFAULT_TAX_PROFILE } from "../utils/calculations.js";

export const DEFAULT_PIN = "0000";

export const initialSettings = {
  language: "fr",
  currency: "CAD",
  locale: "fr-CA",
  region: "Alberta",
  timeZone: "America/Edmonton",
  theme: "carbon-gold",
  ownerKey: DEFAULT_PIN,
  taxProfile: DEFAULT_TAX_PROFILE,
  measurementSystem: { length: "feet-inches", area: "square-feet", linear: "linear-feet" },
  billingProfile: {
    displayName: "",
    companyName: "",
    phone: "",
    email: "",
    civicAddress: "",
    taxNumber: "",
    wcbNumber: "",
    liabilityInsuranceNumber: "",
    logoDataUrl: "",
    logoFileName: "",
    signatureDataUrl: "",
    signatureDate: ""
  }
};

export const initialWorkers = [
  {
    id: "owner",
    name: "Owner",
    role: "owner",
    phone: "",
    email: "",
    active: true,
    workerKey: DEFAULT_PIN,
    defaultHourlyRate: 0,
    defaultSquareFootRate: 0,
    invoicePrefix: "owner",
    nextInvoiceNumber: 1,
    signatureDataUrl: "",
    signatureDate: "",
    notes: ""
  }
];

export const initialCatalogItems = [
  { id: "labor-hour", name: "Labor hour", category: "service", unit: "hour", defaultPrice: 0, taxable: true, active: true }
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
