import { useState } from "react";

import { DEFAULT_KEY_VALUE, matchKey } from "../../utils/entry.js";

export default function LoginGate({ settings, workers, loginOwner, loginWorker }) {
  const [ownerInput, setOwnerInput] = useState("");
  const [workerInputs, setWorkerInputs] = useState({});
  const [notice, setNotice] = useState("");
  const isFr = (settings.language || "fr") === "fr";
  const t = (fr, en) => isFr ? fr : en;

  const enterOwner = () => {
    if (!matchKey(ownerInput, settings.ownerKey || DEFAULT_KEY_VALUE)) {
      setNotice(t("PIN admin invalide.", "Invalid admin PIN."));
      return;
    }
    loginOwner();
  };

  const enterWorker = (worker) => {
    if (!matchKey(workerInputs[worker.id], worker.workerKey || DEFAULT_KEY_VALUE)) {
      setNotice(t("PIN travailleur invalide.", "Invalid worker PIN."));
      return;
    }
    loginWorker(worker.id);
  };

  return (
    <section className="module-page home-entry-page login-hud-page">
      <div className="hero-card home-hero-premium">
        <div><span className="status-pill">Hailite Xteriors</span><h2>{t("Accueil", "Home")}</h2><p>{t("Sélectionne Admin ou un travailleur, puis entre le PIN.", "Select Admin or a worker, then enter the PIN.")}</p></div>
        <div className="home-orb-panel"><span className="orb-label">PIN</span><strong>0000</strong><small>{t("départ", "default")}</small></div>
      </div>
      {notice && <div className="info-card"><strong>{notice}</strong></div>}
      <div className="info-card login-person-card">
        <div className="login-avatar">A</div>
        <div><span className="status-pill">Admin</span><h2>{t("Admin / Propriétaire", "Admin / Owner")}</h2><p>{t("Accès complet.", "Full access.")}</p></div>
        <div className="login-pin-area"><input inputMode="numeric" type="password" value={ownerInput} onChange={(event) => setOwnerInput(event.target.value)} placeholder="PIN" /><button className="primary-action" type="button" onClick={enterOwner}>{t("Entrer", "Enter")}</button></div>
      </div>
      <div className="info-card"><h2>{t("Travailleurs", "Workers")}</h2>{workers.length === 0 ? <div className="list-item"><strong>{t("Aucun travailleur créé", "No worker created")}</strong><span>{t("Entre Admin pour créer les travailleurs.", "Enter Admin to create workers.")}</span></div> : <div className="worker-login-grid premium-worker-grid">{workers.map((worker) => <div className="worker-login-card premium-worker-card" key={worker.id}><div className="login-avatar small-avatar">{worker.name?.slice(0, 1).toUpperCase() || "W"}</div><strong>{worker.name}</strong><span>{worker.role || "worker"}</span><input inputMode="numeric" type="password" value={workerInputs[worker.id] || ""} onChange={(event) => setWorkerInputs((current) => ({ ...current, [worker.id]: event.target.value }))} placeholder="PIN" /><button className="secondary-action" type="button" onClick={() => enterWorker(worker)}>{t("Entrer", "Enter")}</button></div>)}</div>}</div>
    </section>
  );
}
