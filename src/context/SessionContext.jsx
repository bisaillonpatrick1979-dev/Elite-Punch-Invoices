import { createContext, useContext, useMemo, useState } from "react";

import { readLocalValue, writeLocalValue } from "../db/storage.js";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [mode, setModeState] = useState(() => readLocalValue("sessionMode", "owner"));
  const [workerId, setWorkerIdState] = useState(() => readLocalValue("sessionWorkerId", "owner"));

  const setMode = (nextMode) => {
    setModeState(nextMode);
    writeLocalValue("sessionMode", nextMode);
  };

  const setWorkerId = (nextWorkerId) => {
    setWorkerIdState(nextWorkerId);
    writeLocalValue("sessionWorkerId", nextWorkerId);
  };

  const value = useMemo(() => ({ mode, workerId, setMode, setWorkerId, isOwner: mode === "owner" }), [mode, workerId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
