import { createContext, useContext, useMemo, useState } from "react";

import { exportBackupJson, loadAppData, saveAppData } from "../db/backup.js";
import { normalizeAppData } from "../db/normalize.js";
import { createInitialAppData } from "../db/seed.js";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [appData, setAppDataState] = useState(() => normalizeAppData(loadAppData()));

  const setAppData = (nextData) => {
    const normalizedData = normalizeAppData(nextData);
    setAppDataState(normalizedData);
    saveAppData(normalizedData);
  };

  const updateAppData = (updater) => {
    setAppDataState((currentData) => {
      const nextData = typeof updater === "function" ? updater(currentData) : updater;
      const normalizedData = normalizeAppData(nextData);
      saveAppData(normalizedData);
      return normalizedData;
    });
  };

  const resetAppData = () => {
    setAppData(createInitialAppData());
  };

  const getBackupJson = () => exportBackupJson(appData);

  const value = useMemo(
    () => ({ appData, setAppData, updateAppData, resetAppData, getBackupJson }),
    [appData]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }

  return context;
}
