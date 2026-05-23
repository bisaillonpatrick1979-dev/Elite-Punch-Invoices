import { useState } from "react";

import SignaturePad from "../../components/SignaturePad.jsx";
import { APP_VERSION } from "../../constants/version.js";
import { useAppData } from "../../context/AppDataContext.jsx";
import { createBackupFileName, exportBackupJson, parseBackupJson } from "../../db/backup.js";
import { formatDate } from "../../utils/dates.js";

function getBillingProfile(settings) {
  return settings.billingProfile || { displayName: "", companyName: "", phone: "", email: "", civicAddress: "", taxNumber: "", wcbNumber: "", liabilityInsuranceNumber: "", logoDataUrl: "", logoFileName: "", signatureDataUrl: "", signatureDate: "" };
}

export default function Settings() {
  const { appData, setAppData, updateAppData } = useAppData();
  const [taxForm, setTaxForm] = useState({ name: "", rate: "5" });
  const settings = appData.settings;
  const billingProfile = getBillingProfile(settings);
  const taxes = settings.taxProfile?.taxes || [];
  const ownerKey = settings.ownerKey || "0000";

  const updateSettingsField = (field, value) => updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, [field]: value } }));
  const updateBillingField = (field, value) => updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, billingProfile: { ...getBillingProfile(currentData.settings), [field]: value } } }));

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, billingProfile: { ...getBillingProfile(currentData.settings), logoDataUrl: reader.result, logoFileName: file.name } } }));
    reader.readAsDataURL(file);
  };

  const clearLogo = () => { updateBillingField("logoDataUrl", ""); updateBillingField("logoFileName", ""); };
  const saveSignature = (signatureDataUrl) => updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, billingProfile: { ...getBillingProfile(currentData.settings), signatureDataUrl, signatureDate: new Date().toISOString() } } }));
  const clearSignature = () => { updateBillingField("signatureDataUrl", ""); updateBillingField("signatureDate", ""); };

  const updateTax = (taxId, field, value) => updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, taxProfile: { ...(currentData.settings.taxProfile || {}), taxes: (currentData.settings.taxProfile?.taxes || []).map((tax) => tax.id === taxId ? { ...tax, [field]: value } : tax) } } }));
  const addTax = () => { const name = taxForm.name.trim(); if (!name) return; const newTax = { id: `tax-${Date.now()}`, name, rate: Number(taxForm.rate || 0) / 100, enabled: true }; updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, taxProfile: { ...(currentData.settings.taxProfile || {}), taxes: [...(currentData.settings.taxProfile?.taxes || []), newTax] } } })); setTaxForm({ name: "", rate: "5" }); };
  const removeTax = (taxId) => updateAppData((currentData) => ({ ...currentData, settings: { ...currentData.settings, taxProfile: { ...(currentData.settings.taxProfile || {}), taxes: (currentData.settings.taxProfile?.taxes || []).filter((tax) => tax.id !== taxId) } } }));

  const downloadBackup = () => { const backup = exportBackupJson(appData); const blob = new Blob([backup], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = createBackupFileName(); link.click(); URL.revokeObjectURL(url); };
  const importBackup = (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { setAppData(parseBackupJson(String(reader.result))); } catch (error) { alert("Invalid backup file"); } }; reader.readAsText(file); };

  return (
    <section className="module-page">
      <div className="hero-card"><span className="status-pill">Data ready</span><h2>Settings</h2><p>Company, taxes, billing profile, logo watermark, tactile signature, backup and local defaults.</p><div className="mini-stats"><span>Version {APP_VERSION}</span><span>{settings.region}</span><span>{settings.currency}</span></div></div>
      <div className="info-card"><h2>Local defaults</h2><div className="form-grid"><label className="field"><span>Region</span><input value={settings.region || ""} onChange={(event) => updateSettingsField("region", event.target.value)} /></label><label className="field"><span>Currency</span><select value={settings.currency || "CAD"} onChange={(event) => updateSettingsField("currency", event.target.value)}><option value="CAD">CAD</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="AUD">AUD</option><option value="NZD">NZD</option></select></label><label className="field"><span>Locale</span><select value={settings.locale || "fr-CA"} onChange={(event) => updateSettingsField("locale", event.target.value)}><option value="fr-CA">fr-CA</option><option value="en-CA">en-CA</option><option value="en-US">en-US</option><option value="fr-FR">fr-FR</option></select></label><label className="field"><span>Time zone</span><input value={settings.timeZone || "America/Edmonton"} onChange={(event) => updateSettingsField("timeZone", event.target.value)} /></label></div></div>
      <div className="info-card"><h2>Admin PIN</h2><p>Default starting PIN is 0000. Change it here after first login.</p><div className="form-grid"><label className="field"><span>Admin PIN</span><input inputMode="numeric" type="password" value={ownerKey} onChange={(event) => updateSettingsField("ownerKey", event.target.value)} /></label></div><div className="action-row"><button className="secondary-action" type="button" onClick={() => updateSettingsField("ownerKey", "0000")}>Reset to 0000</button></div></div>
      <div className="info-card"><h2>Billing profile</h2><div className="form-grid"><label className="field"><span>Company name</span><input value={billingProfile.companyName} onChange={(event) => updateBillingField("companyName", event.target.value)} /></label><label className="field"><span>Person billing name</span><input value={billingProfile.displayName} onChange={(event) => updateBillingField("displayName", event.target.value)} /></label><label className="field"><span>Phone</span><input value={billingProfile.phone} onChange={(event) => updateBillingField("phone", event.target.value)} /></label><label className="field"><span>Email</span><input value={billingProfile.email} onChange={(event) => updateBillingField("email", event.target.value)} /></label><label className="field field-full"><span>Civic address</span><textarea rows="3" value={billingProfile.civicAddress} onChange={(event) => updateBillingField("civicAddress", event.target.value)} /></label><label className="field"><span>Tax number or SIN reference</span><input value={billingProfile.taxNumber} onChange={(event) => updateBillingField("taxNumber", event.target.value)} /></label><label className="field"><span>WCB number</span><input value={billingProfile.wcbNumber} onChange={(event) => updateBillingField("wcbNumber", event.target.value)} /></label><label className="field"><span>Liability insurance number</span><input value={billingProfile.liabilityInsuranceNumber} onChange={(event) => updateBillingField("liabilityInsuranceNumber", event.target.value)} /></label><label className="field"><span>Logo for invoice watermark</span><input type="file" accept="image/*" onChange={handleLogoUpload} /></label></div><div className="logo-preview">{billingProfile.logoDataUrl ? <><img src={billingProfile.logoDataUrl} alt="Billing logo preview" /><div className="action-row"><button className="secondary-action" type="button" onClick={clearLogo}>Remove logo</button></div></> : <p>No logo saved yet.</p>}</div></div>
      <div className="info-card"><h2>Taxes</h2><p>Default for Alberta is GST 5%. Add more taxes for other provinces or jobs.</p><div className="simple-list">{taxes.map((tax) => <div className="list-item" key={tax.id}><strong>{tax.name}</strong><div className="form-grid"><label className="field"><span>Name</span><input value={tax.name} onChange={(event) => updateTax(tax.id, "name", event.target.value)} /></label><label className="field"><span>Rate %</span><input type="number" min="0" step="0.001" value={Number(tax.rate || 0) * 100} onChange={(event) => updateTax(tax.id, "rate", Number(event.target.value || 0) / 100)} /></label><label className="field"><span>Status</span><select value={tax.enabled ? "on" : "off"} onChange={(event) => updateTax(tax.id, "enabled", event.target.value === "on")}><option value="on">Enabled</option><option value="off">Disabled</option></select></label></div><button className="secondary-action" type="button" onClick={() => removeTax(tax.id)}>Remove tax</button></div>)}</div><div className="form-grid"><label className="field"><span>New tax name</span><input value={taxForm.name} onChange={(event) => setTaxForm((current) => ({ ...current, name: event.target.value }))} /></label><label className="field"><span>New tax rate %</span><input type="number" min="0" step="0.001" value={taxForm.rate} onChange={(event) => setTaxForm((current) => ({ ...current, rate: event.target.value }))} /></label></div><div className="action-row"><button className="secondary-action" type="button" onClick={addTax}>Add tax</button></div></div>
      <div className="info-card"><h2>Signature</h2><p>This signature will appear at the bottom right of invoice PDFs.</p><SignaturePad onSave={saveSignature} />{billingProfile.signatureDataUrl && <div className="signature-preview"><img src={billingProfile.signatureDataUrl} alt="Saved signature" /><p>Saved: {formatDate(billingProfile.signatureDate, settings.locale, settings.timeZone)}</p><button className="secondary-action" type="button" onClick={clearSignature}>Remove signature</button></div>}</div>
      <div className="info-card"><h2>Backup</h2><p>Export or import all local app data as a JSON file.</p><div className="action-row"><button className="primary-action" type="button" onClick={downloadBackup}>Download backup JSON</button></div><label className="field"><span>Import backup JSON</span><input type="file" accept="application/json,.json" onChange={importBackup} /></label></div>
    </section>
  );
}
