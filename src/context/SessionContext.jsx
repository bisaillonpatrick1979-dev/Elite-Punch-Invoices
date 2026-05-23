import { createContext, useContext, useMemo, useState } from "react";

import { readLocalValue, writeLocalValue } from "../db/storage.js";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [mode, setModeState] = useState(() => readLocalValue("sessionMode", "select"));
  const [workerId, setWorkerIdState] = useState(() => readLocalValue("sessionWorkerId", ""));

  const setMode = (nextMode) => {
    setModeState(nextMode);
    writeLocalValue("sessionMode", nextMode);
  };

  const setWorkerId = (nextWorkerId) => {
    setWorkerIdState(nextWorkerId);
    writeLocalValue("sessionWorkerId", nextWorkerId);
  };

  const loginOwner = () => {
    setWorkerId("owner");
    setMode("owner");
  };

  const loginWorker = (nextWorkerId) => {
    setWorkerId(nextWorkerId);
    setMode("worker");
  };

  const logout = () => {
    setWorkerId("");
    setMode("select");
  };

  const value = useMemo(
    () => ({
      mode,
      workerId,
      setMode,
      setWorkerId,
      loginOwner,
      loginWorker,
      logout,
      isOwner: mode === "owner",
      isWorker: mode === "worker",
      isSelecting: mode === "select"
    }),
    [mode, workerId]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
