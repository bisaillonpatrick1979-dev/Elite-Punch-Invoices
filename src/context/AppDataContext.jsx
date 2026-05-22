import { createContext, useContext, useMemo, useState } from "react";

import { exportBackupJson, loadAppData, saveAppData } from "../db/backup.js";
import { createInitialAppData } from "../db/seed.js";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [appData, setAppDataState] = useState(() => loadAppData());

  const setAppData = (nextData) => {
    setAppDataState(nextData);
    saveAppData(nextData);
  };

  const updateAppData = (updater) => {
    setAppDataState((currentData) => {
      const nextData = typeof updater === "function" ? updater(currentData) : updater;
      saveAppData(nextData);
      return nextData;
    });
  };

  const resetAppData = () => {
    const initialData = createInitialAppData();
    setAppData(initialData);
  };

  const getBackupJson = () => exportBackupJson(appData);

  const value = useMemo(
    () => ({
      appData,
      setAppData,
      updateAppData,
      resetAppData,
      getBackupJson
    }),
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
