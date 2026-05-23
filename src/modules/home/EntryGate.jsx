import { useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { writeLocalValue } from "../../db/storage.js";
import { DEFAULT_KEY_VALUE, matchKey } from "../../utils/entry.js";

export default function EntryGate() {
  const { appData, updateAppData } = useAppData();
  const { loginOwner, loginWorker } = useSession();
  const [ownerInput, setOwnerInput] = useState("");
  const [workerInputs, setWorkerInputs] = useState({});
  const [notice, setNotice] = useState("");
  const settings = appData.settings || {};
  const workers = (appData.workers || []).filter((worker) => worker.active !== false && worker.id !== "owner");

  const updateSetting = (field, value) => {
    if (field === "language") writeLocalValue("language", value);
    updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, [field]: value } }));
  };

  const enterOwner = () => {
    if (!matchKey(ownerInput, settings.ownerKey || DEFAULT_KEY_VALUE)) {
      setNotice("PIN admin invalide.");
      return;
    }
    setNotice("");
    loginOwner();
  };

  const enterWorker = (worker) => {
    if (!matchKey(workerInputs[worker.id], worker.workerKey || DEFAULT_KEY_VALUE)) {
      setNotice(`PIN invalide pour ${worker.name}.`);
      return;
    }
    setNotice("");
    loginWorker(worker.id);
  };

  return (
    <section className="module-page home-entry-page">
      <div className="hero-card"><span className="status-pill">Elite Punch Invoice</span><h2>Accueil</h2><p>Langue, province, puis connexion Admin ou Employé avec PIN.</p></div>
      {notice && <div className="info-card"><strong>{notice}</strong></div>}
      <div className="info-card"><h2>Onboarding</h2><div className="form-grid"><label className="field"><span>Langue</span><select value={settings.language || "fr"} onChange={(event) => updateSetting("language", event.target.value)}><option value="fr">Français</option><option value="en">English</option></select></label><label className="field"><span>Province</span><select value={settings.region || "Alberta"} onChange={(event) => updateSetting("region", event.target.value)}><option value="Alberta">Alberta</option><option value="British Columbia">British Columbia</option><option value="Saskatchewan">Saskatchewan</option><option value="Manitoba">Manitoba</option><option value="Ontario">Ontario</option><option value="Quebec">Quebec</option></select></label></div></div>
      <div className="info-card"><span className="status-pill">Admin</span><h2>Admin / Propriétaire</h2><p>PIN de départ : 0000. Modifiable dans Réglages.</p><div className="form-grid"><label className="field"><span>PIN Admin</span><input inputMode="numeric" type="password" value={ownerInput} onChange={(event) => setOwnerInput(event.target.value)} /></label></div><div className="action-row"><button className="primary-action" type="button" onClick={enterOwner}>Entrer Admin</button></div></div>
      <div className="info-card"><h2>Employés</h2><p>Chaque employé utilise son propre PIN. Par défaut : 0000.</p>{workers.length === 0 ? <div className="list-item"><strong>Aucun employé créé</strong><span>Entre Admin pour créer les employés.</span></div> : <div className="worker-login-grid">{workers.map((worker) => <div className="worker-login-card" key={worker.id}><strong>{worker.name}</strong><span>{worker.role || "employee"}</span><input inputMode="numeric" type="password" value={workerInputs[worker.id] || ""} onChange={(event) => setWorkerInputs((current) => ({ ...current, [worker.id]: event.target.value }))} placeholder="PIN" /><button className="secondary-action" type="button" onClick={() => enterWorker(worker)}>Entrer</button></div>)}</div>}</div>
    </section>
  );
}
