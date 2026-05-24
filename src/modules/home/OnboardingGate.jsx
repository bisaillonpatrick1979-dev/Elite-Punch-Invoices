import { useState } from "react";

import { writeLocalValue } from "../../db/storage.js";

const provinces = ["Alberta", "British Columbia", "Saskatchewan", "Manitoba", "Ontario", "Quebec"];

export default function OnboardingGate({ settings, updateAppData }) {
  const [step, setStep] = useState("language");
  const isFr = (settings.language || "fr") === "fr";
  const t = (fr, en) => isFr ? fr : en;

  const updateSetting = (field, value) => {
    if (field === "language") writeLocalValue("language", value);
    updateAppData((data) => ({ ...data, settings: { ...data.settings, [field]: value } }));
  };

  const finish = () => updateAppData((data) => ({ ...data, settings: { ...data.settings, onboardingDone: true } }));

  const selectStorageMode = (mode) => {
    updateAppData((data) => ({
      ...data,
      settings: {
        ...data.settings,
        storagePermissionGranted: true,
        storageMode: mode,
        cloudProvider: mode === "cloud" ? "prepared" : "none",
        cloudRootFolder: "Elite Punch Invoice",
        cloudStructureReady: mode === "cloud",
        lastBackupAt: new Date().toISOString()
      }
    }));
  };

  return (
    <section className="module-page home-entry-page onboarding-hud-page">
      <div className="hero-card home-hero-premium">
        <div>
          <span className="status-pill">Elite Punch Invoice</span>
          <h2>{t("Configuration initiale", "Initial setup")}</h2>
          <p>{t("Configure la langue, la région et la sauvegarde des données avant de commencer.", "Configure language, region and data storage before starting.")}</p>
        </div>
        <div className="home-orb-panel">
          <span className="orb-label">{step === "language" ? "1 / 4" : step === "province" ? "2 / 4" : step === "permission" ? "3 / 4" : "4 / 4"}</span>
          <strong>{step === "language" ? "FR / EN" : step === "province" ? settings.region || "AB" : step === "permission" ? "DATA" : settings.storageMode === "cloud" ? "CLOUD" : "LOCAL"}</strong>
          <small>{t("Onboarding", "Onboarding")}</small>
        </div>
      </div>

      {step === "language" ? (
        <div className="info-card onboarding-choice-card">
          <h2>{t("Choisis ta langue", "Choose your language")}</h2>
          <div className="choice-grid">
            <button className={(settings.language || "fr") === "fr" ? "choice-card active" : "choice-card"} type="button" onClick={() => updateSetting("language", "fr")}><strong>FR</strong><span>Français</span></button>
            <button className={settings.language === "en" ? "choice-card active" : "choice-card"} type="button" onClick={() => updateSetting("language", "en")}><strong>EN</strong><span>English</span></button>
          </div>
          <div className="action-row"><button className="primary-action" type="button" onClick={() => setStep("province")}>{t("Continuer", "Continue")}</button></div>
        </div>
      ) : step === "province" ? (
        <div className="info-card onboarding-choice-card">
          <h2>{t("Choisis ta province", "Choose your province")}</h2>
          <div className="choice-grid province-grid">
            {provinces.map((province) => <button className={(settings.region || "Alberta") === province ? "choice-card active" : "choice-card"} key={province} type="button" onClick={() => updateSetting("region", province)}><strong>{province === "Alberta" ? "AB" : province.slice(0, 2).toUpperCase()}</strong><span>{province}</span></button>)}
          </div>
          <div className="action-row"><button className="secondary-action" type="button" onClick={() => setStep("language")}>{t("Retour", "Back")}</button><button className="primary-action" type="button" onClick={() => setStep("permission")}>{t("Continuer", "Continue")}</button></div>
        </div>
      ) : step === "permission" ? (
        <div className="info-card onboarding-choice-card">
          <h2>{t("Autorisation de sauvegarde", "Backup permissions")}</h2>
          <p>{t("Cette application peut sauvegarder les données localement sur l’appareil ou préparer une structure cloud de backup. Les données incluent : clients, employés, punchs, factures, paies, catalogue et comptabilité.", "This app can save data locally on the device or prepare a cloud backup structure. Data includes clients, workers, punches, invoices, payroll, catalog and accounting.")}</p>
          <div className="mini-stats"><span>Clients</span><span>Employés</span><span>Punch</span><span>Factures</span><span>Catalogue</span><span>Paies</span></div>
          <div className="action-row"><button className="secondary-action" type="button" onClick={() => setStep("province")}>{t("Retour", "Back")}</button><button className="primary-action" type="button" onClick={() => setStep("storage")}>{t("Autoriser", "Allow")}</button></div>
        </div>
      ) : (
        <div className="info-card onboarding-choice-card">
          <h2>{t("Choisis le mode de sauvegarde", "Choose storage mode")}</h2>
          <div className="choice-grid">
            <button className={settings.storageMode === "local" ? "choice-card active" : "choice-card"} type="button" onClick={() => selectStorageMode("local")}><strong>LOCAL</strong><span>{t("Sauvegarde directement sur le téléphone/tablette.", "Save directly on the phone/tablet.")}</span></button>
            <button className={settings.storageMode === "cloud" ? "choice-card active" : "choice-card"} type="button" onClick={() => selectStorageMode("cloud")}><strong>CLOUD</strong><span>{t("Prépare un backup cloud Elite Punch Invoice avec dossiers clients, employés, catalogues, paies et factures.", "Prepare a cloud backup structure with folders for clients, workers, catalog, payroll and invoices.")}</span></button>
          </div>
          {settings.storageMode === "cloud" && <div className="info-card nested-card"><h2>{t("Structure cloud préparée", "Prepared cloud structure")}</h2><div className="mini-stats"><span>Elite Punch Invoice/clients</span><span>Elite Punch Invoice/workers</span><span>Elite Punch Invoice/punches</span><span>Elite Punch Invoice/invoices</span><span>Elite Punch Invoice/payroll</span><span>Elite Punch Invoice/catalog</span></div><p>{t("La structure cloud est préparée pour une future connexion à Supabase Storage, Google Drive, OneDrive ou iCloud.", "Cloud structure is prepared for future connection to Supabase Storage, Google Drive, OneDrive or iCloud.")}</p></div>}
          <div className="action-row"><button className="secondary-action" type="button" onClick={() => setStep("permission")}>{t("Retour", "Back")}</button><button className="primary-action" type="button" onClick={finish}>{t("Terminer", "Finish")}</button></div>
        </div>
      )}
    </section>
  );
}
