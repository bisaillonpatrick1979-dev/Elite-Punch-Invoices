import { getTodayISO } from "../utils/dates.js";
import { readLocalValue, writeLocalValue } from "./storage.js";
import { createInitialAppData } from "./seed.js";

const APP_DATA_KEY = "appData";

export function loadAppData() {
  const existingData = readLocalValue(APP_DATA_KEY, null);

  if (existingData) {
    return existingData;
  }

  const initialData = createInitialAppData();
  writeLocalValue(APP_DATA_KEY, initialData);
  return initialData;
}

export function saveAppData(data) {
  return writeLocalValue(APP_DATA_KEY, data);
}

export function createBackupFileName(date = new Date()) {
  return `elite-punch-invoice-backup-${getTodayISO(date)}.json`;
}

export function exportBackupJson(data = loadAppData()) {
  return JSON.stringify(
    {
      app: "Elite Punch Invoice",
      version: "0.1.0",
      exportedAt: new Date().toISOString(),
      data
    },
    null,
    2
  );
}

export function parseBackupJson(jsonText) {
  const parsed = JSON.parse(jsonText);

  if (!parsed || !parsed.data) {
    throw new Error("Invalid backup file");
  }

  return parsed.data;
}
