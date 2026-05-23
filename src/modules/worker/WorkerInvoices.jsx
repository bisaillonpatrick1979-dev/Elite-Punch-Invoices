import { useMemo, useState } from "react";

import SignaturePad from "../../components/SignaturePad.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { downloadInvoicePdf, getInvoicePdfFile, getInvoicePdfPreviewUrl } from "../../pdf/invoicePdf.js";
import { formatDate } from "../../utils/dates.js";
import { recalculateInvoice } from "../../utils/invoiceHelpers.js";
import { formatMoney } from "../../utils/money.js";

const statusesShowingSentDate = ["sent", "partial", "paid", "closed"];

function shouldShowSentDate(invoice) {
  return Boolean(invoice.sentAt && statusesShowingSentDate.includes(invoice.status));
}

function emptyLineForm() {
  return { description: "", quantity: "1", unit: "unit", rate: "0", taxable: true };
}

export default function WorkerInvoices() {
  const { appData, updateAppData } = useAppData();
  const { workerId } = useSession();
  const [preview, setPreview] = useState(null);
  const [openedInvoiceId, setOpenedInvoiceId] = useState(null);
  const [lineForm, setLineForm] = useState(emptyLineForm);
  const settings = appData.settings || {};
  const worker = useMemo(() => (appData.workers || []).find((item) => item.id === workerId), [appData.workers, workerId]);
  const invoices = useMemo(() => (appData.invoices || []).filter((invoice) => invoice.workerId === workerId), [appData.invoices, workerId]);
  const openedInvoice = useMemo(() => invoices.find((invoice) => invoice.id === openedInvoiceId) || null, [invoices, openedInvoiceId]);
  const money = (value, currency = settings.currency || "CAD") => formatMoney(value, currency, settings.locale || "fr-CA");

  const recalc = (invoice, currentData) => recalculateInvoice(invoice, currentData.settings?.taxProfile?.taxes || []);

  const updateInvoice = (invoiceId, updater) => {
    updateAppData((currentData) => ({
      ...currentData,
      invoices: (currentData.invoices || []).map((invoice) => {
        if (invoice.id !== invoiceId) return invoice;
        return recalc(updater(invoice), currentData);
      })
    }));
  };

  const markSent = (invoiceId) => {
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, status: "sent", sentAt: invoice.sentAt || new Date().toISOString(), updatedAt: new Date().toISOString() }));
  };

  const addManualLine = (invoiceId) => {
    const description = lineForm.description.trim();
    if (!description) return;
    const quantity = Number(lineForm.quantity || 0);
    const rate = Number(lineForm.rate || 0);
    const line = {
      id: `line-worker-${Date.now()}`,
      sourceType: "worker-extra",
      sourceId: "",
      description,
      quantity,
      unit: lineForm.unit || "unit",
      rate,
      total: Number((quantity * rate).toFixed(2)),
      taxable: lineForm.taxable !== false
    };
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, lines: [...(invoice.lines || []), line], updatedAt: new Date().toISOString() }));
    setLineForm(emptyLineForm());
  };

  const removeWorkerLine = (invoiceId, lineId) => {
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, lines: (invoice.lines || []).filter((line) => line.id !== lineId), updatedAt: new Date().toISOString() }));
  };

  const saveInvoiceSignature = (invoiceId, signatureDataUrl) => {
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, signatureDataUrl, signatureDate: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  };

  const clearInvoiceSignature = (invoiceId) => {
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, signatureDataUrl: "", signatureDate: "", updatedAt: new Date().toISOString() }));
  };

  const buildShareMessage = (invoice) => {
    const total = invoice.totals?.total || 0;
    return `Bonjour,\n\nVoici la facture ${invoice.invoiceNumber}.\n\nClient: ${invoice.clientName || "No client"}\nEmployé: ${invoice.workerName || worker?.name || "Employé"}\nTotal: ${money(total, invoice.currency)}\n\nMerci beaucoup.`;
  };

  const copyShareMessage = async (invoice) => {
    const message = buildShareMessage(invoice);
    try { await navigator.clipboard.writeText(message); alert("Message copié."); } catch (error) { alert(message); }
  };

  const previewInvoice = (invoice) => {
    const url = getInvoicePdfPreviewUrl({ invoice, settings });
    setPreview({ invoiceNumber: invoice.invoiceNumber, url });
  };

  const shareInvoice = async (invoice) => {
    const message = buildShareMessage(invoice);
    const file = getInvoicePdfFile({ invoice, settings });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: invoice.invoiceNumber, text: message, files: [file] }); markSent(invoice.id); return; } catch (error) { if (error?.name === "AbortError") return; }
    }
    if (navigator.share) {
      try { await navigator.share({ title: invoice.invoiceNumber, text: message }); markSent(invoice.id); return; } catch (error) { if (error?.name === "AbortError") return; }
    }
    await copyShareMessage(invoice);
  };

  const openMail = (invoice) => {
    const to = invoice.clientEmail || "";
    const subject = encodeURIComponent(`Facture ${invoice.invoiceNumber}`);
    const body = encodeURIComponent(`${buildShareMessage(invoice)}\n\nNote: si le PDF n'est pas attaché automatiquement, utilise le bouton Télécharger PDF puis joins-le au courriel.`);
    markSent(invoice.id);
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  };

  const openSms = (invoice) => {
    const phone = invoice.clientPhone || "";
    const body = encodeURIComponent(`${buildShareMessage(invoice)}\n\nNote: si ton téléphone ne joint pas le PDF automatiquement, utilise Télécharger PDF ou Partager.`);
    markSent(invoice.id);
    window.location.href = `sms:${encodeURIComponent(phone)}?&body=${body}`;
  };

  return (
    <section className="module-page">
      <div className="hero-card"><span className="status-pill">Mes factures</span><h2>{worker?.name || "Employé"}</h2><p>Clique une facture pour ouvrir les détails, ajouter du matériel, signer et envoyer le PDF.</p></div>

      {preview && <div className="modal-backdrop"><div className="modal-card wide-modal"><div className="invoice-card-header"><h2>Aperçu PDF - {preview.invoiceNumber}</h2><button className="secondary-action" type="button" onClick={() => setPreview(null)}>Fermer</button></div><iframe title={`Aperçu ${preview.invoiceNumber}`} src={preview.url} style={{ width: "100%", minHeight: "70vh", border: "1px solid var(--border)", borderRadius: "18px", background: "white" }} /></div></div>}

      {openedInvoice && (
        <div className="modal-backdrop">
          <div className="modal-card wide-modal">
            <div className="invoice-card-header">
              <div><span className="status-pill">{openedInvoice.status}</span><h2>{openedInvoice.invoiceNumber}</h2><p>{openedInvoice.clientName || "No client"} | {openedInvoice.jobAddress || "No address"}</p></div>
              <button className="secondary-action" type="button" onClick={() => setOpenedInvoiceId(null)}>Fermer</button>
            </div>

            <div className="mini-stats"><span>Créée {formatDate(openedInvoice.createdAt, settings.locale, settings.timeZone)}</span>{shouldShowSentDate(openedInvoice) && <span>Envoyée {formatDate(openedInvoice.sentAt, settings.locale, settings.timeZone)}</span>}<span>Total {money(openedInvoice.totals?.total || 0, openedInvoice.currency)}</span><span>Balance {money(openedInvoice.totals?.balanceDue || 0, openedInvoice.currency)}</span><span>{(openedInvoice.lines || []).length} lignes</span></div>

            <div className="info-card nested-card"><h2>Lignes de facture</h2><div className="simple-list">{(openedInvoice.lines || []).map((line) => <div className="list-item" key={line.id}><strong>{line.description}</strong><span>{Number(line.quantity || 0).toFixed(2)} {line.unit} × {money(line.rate || 0, openedInvoice.currency)} = {money(line.total || 0, openedInvoice.currency)}</span>{line.sourceType === "worker-extra" && <button className="secondary-action" type="button" onClick={() => removeWorkerLine(openedInvoice.id, line.id)}>Retirer</button>}</div>)}</div></div>

            <div className="info-card nested-card"><h2>Ajouter matériel / extra</h2><div className="form-grid"><label className="field"><span>Description</span><input value={lineForm.description} onChange={(event) => setLineForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ex: Nails, caulking, rental, extra" /></label><label className="field"><span>Quantité</span><input type="number" min="0" step="0.01" value={lineForm.quantity} onChange={(event) => setLineForm((current) => ({ ...current, quantity: event.target.value }))} /></label><label className="field"><span>Unité</span><select value={lineForm.unit} onChange={(event) => setLineForm((current) => ({ ...current, unit: event.target.value }))}><option value="unit">Unité</option><option value="box">Boîte</option><option value="roll">Rouleau</option><option value="linear-foot">Pied linéaire</option><option value="square-foot">Pied carré</option><option value="hour">Heure</option><option value="fixed">Forfait</option></select></label><label className="field"><span>Prix</span><input type="number" min="0" step="0.01" value={lineForm.rate} onChange={(event) => setLineForm((current) => ({ ...current, rate: event.target.value }))} /></label></div><div className="action-row"><button className="secondary-action" type="button" onClick={() => addManualLine(openedInvoice.id)}>Ajouter à la facture</button></div></div>

            <div className="info-card nested-card"><h2>Signature de cette facture</h2><p>Nouvelle signature par facture. Elle ne remplace pas les réglages de l’employé.</p><SignaturePad onSave={(signatureDataUrl) => saveInvoiceSignature(openedInvoice.id, signatureDataUrl)} />{openedInvoice.signatureDataUrl && <div className="signature-preview"><img src={openedInvoice.signatureDataUrl} alt="Signature facture" /><p>Signée: {formatDate(openedInvoice.signatureDate, settings.locale, settings.timeZone)}</p><button className="secondary-action" type="button" onClick={() => clearInvoiceSignature(openedInvoice.id)}>Effacer signature facture</button></div>}</div>

            <div className="action-row"><button className="secondary-action" type="button" onClick={() => previewInvoice(openedInvoice)}>Aperçu PDF</button><button className="secondary-action" type="button" onClick={() => downloadInvoicePdf({ invoice: openedInvoice, settings })}>Télécharger PDF</button><button className="secondary-action" type="button" onClick={() => shareInvoice(openedInvoice)}>Partager PDF</button><button className="secondary-action" type="button" onClick={() => openMail(openedInvoice)}>Courriel</button><button className="secondary-action" type="button" onClick={() => openSms(openedInvoice)}>Texto</button><button className="secondary-action" type="button" onClick={() => copyShareMessage(openedInvoice)}>Copier message</button></div>
          </div>
        </div>
      )}

      {invoices.length === 0 ? <div className="info-card"><h2>Aucune facture</h2><p>Quand tu fais un Punch Out, une facture ouverte à ton nom peut être créée automatiquement.</p></div> : <div className="simple-list">{invoices.map((invoice) => { const totals = invoice.totals || {}; return <button className="info-card invoice-click-card" key={invoice.id} type="button" onClick={() => setOpenedInvoiceId(invoice.id)}><span className="status-pill">{invoice.status}</span><h2>{invoice.invoiceNumber}</h2><p>{invoice.clientName || "No client"} | {invoice.jobAddress || "No address"}</p><div className="mini-stats"><span>Créée {formatDate(invoice.createdAt, settings.locale, settings.timeZone)}</span>{shouldShowSentDate(invoice) && <span>Envoyée {formatDate(invoice.sentAt, settings.locale, settings.timeZone)}</span>}<span>Total {money(totals.total || 0, invoice.currency)}</span><span>Balance {money(totals.balanceDue || 0, invoice.currency)}</span><span>{(invoice.lines || []).length} lignes</span>{invoice.signatureDataUrl ? <span>Signée</span> : <span>Signature requise</span>}</div></button>; })}</div>}
    </section>
  );
}
