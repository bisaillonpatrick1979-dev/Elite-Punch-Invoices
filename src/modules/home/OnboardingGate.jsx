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

  return (
    <section className="module-page home-entry-page onboarding-hud-page">
      <div className="hero-card home-hero-premium">
        <div>
          <span className="status-pill">Elite Punch Invoice</span>
          <h2>{t("Configuration initiale", "Initial setup")}</h2>
          <p>{t("Choisis la langue et la province une seule fois. Après, cet écran ne revient plus.", "Choose language and province once. After that, this screen will not return.")}</p>
        </div>
        <div className="home-orb-panel">
          <span className="orb-label">{step === "language" ? "1 / 2" : "2 / 2"}</span>
          <strong>{step === "language" ? "FR / EN" : settings.region || "AB"}</strong>
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
      ) : (
        <div className="info-card onboarding-choice-card">
          <h2>{t("Choisis ta province", "Choose your province")}</h2>
          <div className="choice-grid province-grid">
            {provinces.map((province) => <button className={(settings.region || "Alberta") === province ? "choice-card active" : "choice-card"} key={province} type="button" onClick={() => updateSetting("region", province)}><strong>{province === "Alberta" ? "AB" : province.slice(0, 2).toUpperCase()}</strong><span>{province}</span></button>)}
          </div>
          <div className="action-row"><button className="secondary-action" type="button" onClick={() => setStep("language")}>{t("Retour", "Back")}</button><button className="primary-action" type="button" onClick={finish}>{t("Terminer", "Finish")}</button></div>
        </div>
      )}
    </section>
  );
}
