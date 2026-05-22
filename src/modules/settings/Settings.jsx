import SignaturePad from "../../components/SignaturePad.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import { createBackupFileName, exportBackupJson, parseBackupJson } from "../../db/backup.js";
import { formatDate } from "../../utils/dates.js";

function getBillingProfile(settings) {
  return settings.billingProfile || {
    displayName: "",
    companyName: "",
    phone: "",
    email: "",
    civicAddress: "",
    taxNumber: "",
    wcbNumber: "",
    liabilityInsuranceNumber: "",
    logoDataUrl: "",
    logoFileName: "",
    signatureDataUrl: "",
    signatureDate: ""
  };
}

export default function Settings() {
  const { appData, setAppData, updateAppData } = useAppData();
  const settings = appData.settings;
  const billingProfile = getBillingProfile(settings);

  const updateBillingField = (field, value) => {
    updateAppData((currentData) => ({
      ...currentData,
      settings: {
        ...currentData.settings,
        billingProfile: {
          ...getBillingProfile(currentData.settings),
          [field]: value
        }
      }
    }));
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateAppData((currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          billingProfile: {
            ...getBillingProfile(currentData.settings),
            logoDataUrl: reader.result,
            logoFileName: file.name
          }
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    updateBillingField("logoDataUrl", "");
    updateBillingField("logoFileName", "");
  };

  const saveSignature = (signatureDataUrl) => {
    updateAppData((currentData) => ({
      ...currentData,
      settings: {
        ...currentData.settings,
        billingProfile: {
          ...getBillingProfile(currentData.settings),
          signatureDataUrl,
          signatureDate: new Date().toISOString()
        }
      }
    }));
  };

  const clearSignature = () => {
    updateBillingField("signatureDataUrl", "");
    updateBillingField("signatureDate", "");
  };

  const downloadBackup = () => {
    const backup = exportBackupJson(appData);
    const blob = new Blob([backup], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createBackupFileName();
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const importedData = parseBackupJson(String(reader.result));
        setAppData(importedData);
      } catch (error) {
        alert("Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Data ready</span>
        <h2>Settings</h2>
        <p>Company, billing profile, logo watermark, tactile signature, backup and local defaults.</p>
      </div>

      <div className="info-card">
        <h2>Billing profile</h2>
        <div className="form-grid">
          <label className="field"><span>Company name</span><input value={billingProfile.companyName} onChange={(event) => updateBillingField("companyName", event.target.value)} /></label>
          <label className="field"><span>Person billing name</span><input value={billingProfile.displayName} onChange={(event) => updateBillingField("displayName", event.target.value)} /></label>
          <label className="field"><span>Phone</span><input value={billingProfile.phone} onChange={(event) => updateBillingField("phone", event.target.value)} /></label>
          <label className="field"><span>Email</span><input value={billingProfile.email} onChange={(event) => updateBillingField("email", event.target.value)} /></label>
          <label className="field field-full"><span>Civic address</span><textarea rows="3" value={billingProfile.civicAddress} onChange={(event) => updateBillingField("civicAddress", event.target.value)} /></label>
          <label className="field"><span>Tax number or SIN reference</span><input value={billingProfile.taxNumber} onChange={(event) => updateBillingField("taxNumber", event.target.value)} /></label>
          <label className="field"><span>WCB number</span><input value={billingProfile.wcbNumber} onChange={(event) => updateBillingField("wcbNumber", event.target.value)} /></label>
          <label className="field"><span>Liability insurance number</span><input value={billingProfile.liabilityInsuranceNumber} onChange={(event) => updateBillingField("liabilityInsuranceNumber", event.target.value)} /></label>
          <label className="field"><span>Logo for invoice watermark</span><input type="file" accept="image/*" onChange={handleLogoUpload} /></label>
        </div>

        <div className="logo-preview">
          {billingProfile.logoDataUrl ? <><img src={billingProfile.logoDataUrl} alt="Billing logo preview" /><div className="action-row"><button className="secondary-action" type="button" onClick={clearLogo}>Remove logo</button></div></> : <p>No logo saved yet.</p>}
        </div>
      </div>

      <div className="info-card">
        <h2>Signature</h2>
        <p>This signature will appear at the bottom right of invoice PDFs.</p>
        <SignaturePad onSave={saveSignature} />
        {billingProfile.signatureDataUrl && <div className="signature-preview"><img src={billingProfile.signatureDataUrl} alt="Saved signature" /><p>Saved: {formatDate(billingProfile.signatureDate, settings.locale, settings.timeZone)}</p><button className="secondary-action" type="button" onClick={clearSignature}>Remove signature</button></div>}
      </div>

      <div className="info-card">
        <h2>Backup</h2>
        <p>Export or import all local app data as a JSON file.</p>
        <div className="action-row"><button className="primary-action" type="button" onClick={downloadBackup}>Download backup JSON</button></div>
        <label className="field"><span>Import backup JSON</span><input type="file" accept="application/json,.json" onChange={importBackup} /></label>
      </div>

      <div className="info-card">
        <h2>Local defaults</h2>
        <p>Region: {settings.region} | Currency: {settings.currency} | Time zone: {settings.timeZone}</p>
      </div>
    </section>
  );
}
