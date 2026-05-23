import { useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";

export default function WorkerOptions() {
  const { appData, updateAppData } = useAppData();
  const { workerId } = useSession();
  const [nextPin, setNextPin] = useState("");
  const [message, setMessage] = useState("");
  const worker = useMemo(() => (appData.workers || []).find((item) => item.id === workerId), [appData.workers, workerId]);

  const changePin = () => {
    const cleanPin = String(nextPin || "").trim();
    if (cleanPin.length < 4) {
      setMessage("Le PIN doit avoir au moins 4 chiffres.");
      return;
    }

    updateAppData((currentData) => ({
      ...currentData,
      workers: (currentData.workers || []).map((item) => item.id === workerId ? { ...item, workerKey: cleanPin } : item)
    }));
    setNextPin("");
    setMessage("PIN modifié.");
  };

  if (!worker) {
    return <section className="module-page"><div className="info-card"><h2>Aucun employé connecté</h2><p>Retourne à l’écran d’accueil et connecte un employé.</p></div></section>;
  }

  return (
    <section className="module-page">
      <div className="hero-card"><span className="status-pill">Mes options</span><h2>{worker.name}</h2><p>Options personnelles de l’employé connecté.</p></div>
      {message && <div className="info-card"><strong>{message}</strong></div>}
      <div className="info-card"><h2>Changer mon PIN</h2><p>Ton PIN protège ton accès à ton punch, ton calendrier, tes statistiques, ta paye et tes factures.</p><div className="form-grid"><label className="field"><span>Nouveau PIN</span><input inputMode="numeric" type="password" value={nextPin} onChange={(event) => setNextPin(event.target.value)} placeholder="Minimum 4 chiffres" /></label></div><div className="action-row"><button className="primary-action" type="button" onClick={changePin}>Sauvegarder mon PIN</button></div></div>
      <div className="info-card"><h2>Mes informations</h2><div className="mini-stats"><span>{worker.role || "employee"}</span><span>{worker.phone || "No phone"}</span><span>{worker.email || "No email"}</span></div></div>
    </section>
  );
}
