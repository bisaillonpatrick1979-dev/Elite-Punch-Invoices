import { getTodayISO } from "../utils/dates.js";
import { readLocalValue, writeLocalValue } from "./storage.js";
import { createInitialAppData } from "./seed.js";

const APP_DATA_KEY = "appData";
const BACKUP_MANIFEST_KEY = "backupManifest";
const AUTO_BACKUP_HOUR = 22;

export function loadAppData() {
  const existingData = readLocalValue(APP_DATA_KEY, null);
  if (existingData) return existingData;
  const initialData = createInitialAppData();
  writeLocalValue(APP_DATA_KEY, initialData);
  return initialData;
}

export function saveAppData(data) { return writeLocalValue(APP_DATA_KEY, data); }
export function createBackupFileName(date = new Date()) { return `elite-punch-invoice-backup-${getTodayISO(date)}.json`; }

export function getBackupSignature(data = loadAppData()) {
  const payload = JSON.stringify({ clients: data.clients || [], workers: data.workers || [], punches: data.punches || [], invoices: data.invoices || [], payrollRuns: data.payrollRuns || [], catalogItems: data.catalogItems || [], accountingEntries: data.accountingEntries || [] });
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  return `${payload.length}-${Math.abs(hash)}`;
}

export function loadBackupManifest() { return readLocalValue(BACKUP_MANIFEST_KEY, { lastBackupDate: "", lastSignature: "", files: [] }); }
export function saveBackupManifest(manifest) { return writeLocalValue(BACKUP_MANIFEST_KEY, manifest); }

export function shouldRunDailyBackup(data = loadAppData(), now = new Date()) {
  if ((data.settings || {}).autoBackupEnabled === false) return false;
  if (now.getHours() < AUTO_BACKUP_HOUR) return false;
  const manifest = loadBackupManifest();
  const signature = getBackupSignature(data);
  return !(manifest.lastBackupDate === getTodayISO(now) && manifest.lastSignature === signature);
}

export function recordBackupRun(data = loadAppData(), provider = "local", now = new Date()) {
  const signature = getBackupSignature(data);
  const fileName = createBackupFileName(now);
  const manifest = loadBackupManifest();
  const files = (manifest.files || []).some((file) => file.signature === signature) ? manifest.files : [{ fileName, provider, signature, createdAt: now.toISOString() }, ...(manifest.files || [])].slice(0, 60);
  const nextManifest = { lastBackupDate: getTodayISO(now), lastSignature: signature, files };
  saveBackupManifest(nextManifest);
  return nextManifest;
}

export function exportBackupJson(data = loadAppData()) {
  return JSON.stringify({ app: "Elite Punch Invoice", version: "0.1.0", exportedAt: new Date().toISOString(), signature: getBackupSignature(data), data }, null, 2);
}

export function parseBackupJson(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || !parsed.data) throw new Error("Invalid backup file");
  return parsed.data;
}
