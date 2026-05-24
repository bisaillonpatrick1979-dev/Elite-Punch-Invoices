import { useState } from "react";

import { writeLocalValue } from "../../db/storage.js";

const provinces = ["Alberta", "British Columbia", "Saskatchewan", "Manitoba", "Ontario", "Quebec"];
const storageChoices = [
  { id: "local", label: "Local", textFr: "Téléphone ou tablette", textEn: "Phone or tablet" },
  { id: "google-drive", label: "Google Drive", textFr: "Dossier Google Drive", textEn: "Google Drive folder" },
  { id: "onedrive", label: "OneDrive", textFr: "Dossier OneDrive", textEn: "OneDrive folder" },
  { id: "icloud", label: "iCloud Drive", textFr: "Dossier iCloud Drive", textEn: "iCloud Drive folder" },
  { id: "samsung", label: "Samsung", textFr: "Mes fichiers Samsung", textEn: "Samsung My Files" }
];

export default function OnboardingGate({ settings, updateAppData }) {
  const [step, setStep] = useState("language");
  const isFr = (settings.language || "fr") === "fr";
  const t = (fr, en) => isFr ? fr : en;
  const selectedStorage = settings.cloudProvider || (settings.storageMode === "local" ? "local" : "google-drive");

  const updateSetting = (field, value) => {
    if (field === "language") writeLocalValue("language", value);
    updateAppData((data) => ({ ...data, settings: { ...data.settings, [field]: value } }));
  };

  const finish = () => updateAppData((data) => ({ ...data, settings: { ...data.settings, onboardingDone: true } }));

  const selectStorage = (provider) => {
    updateAppData((data) => ({
      ...data,
      settings: {
        ...data.settings,
        storagePermissionGranted: true,
        storageMode: provider === "local" ? "local" : "external-drive",
        cloudProvider: provider,
        cloudRootFolder: "Elite Punch Invoice",
        cloudStructureReady: provider !== "local",
        lastBackupAt: new Date().toISOString()
      }
    }));
  };

  return (
    <section className="module-page home-entry-page onboarding-hud-page">
      <div className="hero-card home-hero-premium">
        <div><span className="status-pill">Elite Punch Invoice</span><h2>{t("Configuration initiale", "Initial setup")}</h2><p>{t("Configure la langue, la province et l’endroit où garder tes backups.", "Configure language, province and where to keep your backups.")}</p></div>
        <div className="home-orb-panel"><span className="orb-label">{step === "language" ? "1 / 4" : step === "province" ? "2 / 4" : step === "permission" ? "3 / 4" : "4 / 4"}</span><strong>{step === "language" ? "FR / EN" : step === "province" ? settings.region || "AB" : step === "permission" ? "DATA" : selectedStorage === "local" ? "LOCAL" : "DRIVE"}</strong><small>{t("Onboarding", "Onboarding")}</small></div>
      </div>

      {step === "language" ? (
        <div className="info-card onboarding-choice-card"><h2>{t("Choisis ta langue", "Choose your language")}</h2><div className="choice-grid"><button className={(settings.language || "fr") === "fr" ? "choice-card active" : "choice-card"} type="button" onClick={() => updateSetting("language", "fr")}><strong>FR</strong><span>Français</span></button><button className={settings.language === "en" ? "choice-card active" : "choice-card"} type="button" onClick={() => updateSetting("language", "en")}><strong>EN</strong><span>English</span></button></div><div className="action-row"><button className="primary-action" type="button" onClick={() => setStep("province")}>{t("Continuer", "Continue")}</button></div></div>
      ) : step === "province" ? (
        <div className="info-card onboarding-choice-card"><h2>{t("Choisis ta province", "Choose your province")}</h2><div className="choice-grid province-grid">{provinces.map((province) => <button className={(settings.region || "Alberta") === province ? "choice-card active" : "choice-card"} key={province} type="button" onClick={() => updateSetting("region", province)}><strong>{province === "Alberta" ? "AB" : province.slice(0, 2).toUpperCase()}</strong><span>{province}</span></button>)}</div><div className="action-row"><button className="secondary-action" type="button" onClick={() => setStep("language")}>{t("Retour", "Back")}</button><button className="primary-action" type="button" onClick={() => setStep("permission")}>{t("Continuer", "Continue")}</button></div></div>
      ) : step === "permission" ? (
        <div className="info-card onboarding-choice-card"><h2>{t("Autorisation de sauvegarde", "Backup permission")}</h2><p>{t("Elite Punch Invoice sauvegarde les clients, travailleurs, punchs, factures, paies, catalogue et comptabilité. Tu choisis où les backups seront gardés : localement ou dans ton propre service de fichiers.", "Elite Punch Invoice saves clients, workers, punches, invoices, payroll, catalog and accounting. You choose where backups are kept: locally or in your own file service.")}</p><div className="mini-stats"><span>Clients</span><span>Employés</span><span>Punch</span><span>Factures</span><span>Catalogue</span><span>Paies</span></div><div className="action-row"><button className="secondary-action" type="button" onClick={() => setStep("province")}>{t("Retour", "Back")}</button><button className="primary-action" type="button" onClick={() => setStep("storage")}>{t("Autoriser et choisir", "Allow and choose")}</button></div></div>
      ) : (
        <div className="info-card onboarding-choice-card"><h2>{t("Choisis ton backup", "Choose your backup")}</h2><div className="choice-grid storage-choice-grid">{storageChoices.map((choice) => <button className={selectedStorage === choice.id ? "choice-card active" : "choice-card"} type="button" key={choice.id} onClick={() => selectStorage(choice.id)}><strong>{choice.label}</strong><span>{t(choice.textFr, choice.textEn)}</span></button>)}</div>{selectedStorage !== "local" && <div className="info-card nested-card"><h2>{t("Dossier préparé", "Prepared folder")}</h2><p>{t("L’app prépare la structure Elite Punch Invoice avec clients, workers, punches, invoices, payroll, catalog et accounting. Pour l’instant, la sauvegarde cloud se fait par export/import du fichier backup dans le service choisi.", "The app prepares the Elite Punch Invoice structure with clients, workers, punches, invoices, payroll, catalog and accounting. For now, cloud backup is done by exporting/importing the backup file into the selected service.")}</p></div>}<div className="action-row"><button className="secondary-action" type="button" onClick={() => setStep("permission")}>{t("Retour", "Back")}</button><button className="primary-action" type="button" onClick={finish}>{t("Terminer", "Finish")}</button></div></div>
      )}
    </section>
  );
}
