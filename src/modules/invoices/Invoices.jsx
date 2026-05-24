import { useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { downloadInvoicePdf, getInvoicePdfFile, getInvoicePdfPreviewUrl } from "../../pdf/invoicePdf.js";
import { buildInvoicesFromPunches, INVOICE_STATUSES, recalculateInvoice } from "../../utils/invoiceHelpers.js";
import { formatDate, formatTime, minutesToHours } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

const statusLabels = {
  open: "Open",
  ready: "Ready",
  sent: "Sent",
  partial: "Partial",
  paid: "Paid",
  cancelled: "Cancelled",
  closed: "Closed"
};

const statusesKeepingSentDate = [
  INVOICE_STATUSES.SENT,
  INVOICE_STATUSES.PARTIAL,
  INVOICE_STATUSES.PAID,
  INVOICE_STATUSES.CLOSED
];

const emptyManualInvoice = {
  clientName: "",
  jobAddress: "",
  clientPhone: "",
  clientEmail: "",
  notes: ""
};

function shouldShowSentDate(invoice) {
  return Boolean(invoice.sentAt && statusesKeepingSentDate.includes(invoice.status));
}

function nextInvoiceWithStatus(invoice, status) {
  const shouldKeepSentAt = statusesKeepingSentDate.includes(status);
  return {
    ...invoice,
    status,
    sentAt: status === INVOICE_STATUSES.SENT ? invoice.sentAt || new Date().toISOString() : shouldKeepSentAt ? invoice.sentAt : ""
  };
}

function payTypeLabel(payType) {
  if (payType === "square-foot") return "Pied carré / pi²";
  if (payType === "fixed") return "Forfait / job";
  return "Horaire";
}

function getInvoiceDateRange(invoice) {
  const dates = (invoice.lines || [])
    .map((line) => line.sourceType === "punch" ? line.description?.slice(0, 10) : null)
    .filter(Boolean);
  if (!dates.length) return formatDate(invoice.createdAt);
  const sorted = [...dates].sort();
  return sorted[0] === sorted[sorted.length - 1] ? sorted[0] : `${sorted[0]} → ${sorted[sorted.length - 1]}`;
}

function WorkdayDetailModal({ line, punch, invoice, money, settings, onClose }) {
  const title = punch?.startedAt ? formatDate(punch.startedAt, settings.locale, settings.timeZone) : line.description;
  return (
    <div className="modal-backdrop">
      <div className="modal-card wide-modal day-detail-modal">
        <div className="day-modal-header">
          <div>
            <span className="status-pill">Détail de journée</span>
            <h2>{title}</h2>
            <p>{invoice.clientName} · {invoice.jobAddress}</p>
          </div>
          <button className="secondary-action" type="button" onClick={onClose}>Fermer</button>
        </div>

        {!punch ? (
          <div className="day-empty-note">Détail complet non disponible pour cette ligne.</div>
        ) : (
          <>
            <div className="day-summary-strip">
              <div><span>Travailleur</span><strong>{punch.workerName || invoice.workerName || "Travailleur"}</strong></div>
              <div><span>Type</span><strong>{payTypeLabel(punch.payType)}</strong></div>
              <div><span>Temps net</span><strong>{Number(punch.workedHours || 0).toFixed(2)} h</strong></div>
              <div><span>Montant</span><strong>{money(punch.amount || line.total || 0)}</strong></div>
            </div>

            <div className="day-section"><h4>⏰ Horaire</h4><div className="day-detail-grid three"><div className="day-detail-item"><span>Départ</span><strong>{formatTime(punch.startedAt, settings.locale, settings.timeZone)}</strong></div><div className="day-detail-item"><span>Fin</span><strong>{formatTime(punch.endedAt, settings.locale, settings.timeZone)}</strong></div><div className="day-detail-item"><span>Temps brut</span><strong>{minutesToHours(punch.grossMinutes || 0).toFixed(2)} h</strong></div></div></div>

            <div className="day-section"><h4>💰 Paiement</h4><div className="day-detail-grid">
              {punch.payType === "hourly" && <><div className="day-detail-item"><span>Taux horaire</span><strong>{money(punch.hourlyRate || 0)} / h</strong></div><div className="day-detail-item"><span>Heures facturées</span><strong>{Number(punch.workedHours || 0).toFixed(2)} h</strong></div></>}
              {punch.payType === "square-foot" && <><div className="day-detail-item"><span>Pieds carrés posés</span><strong>{Number(punch.squareFeet || 0).toFixed(2)} pi²</strong></div><div className="day-detail-item"><span>Taux pi²</span><strong>{money(punch.squareFootRate || 0)} / pi²</strong></div></>}
              {punch.payType === "fixed" && <div className="day-detail-item"><span>Forfait</span><strong>{money(punch.fixedAmount || 0)}</strong></div>}
              <div className="day-detail-item"><span>Valeur horaire effective</span><strong>{money(punch.effectiveHourly || 0)} / h</strong></div>
              <div className="day-detail-item strong"><span>Total journée</span><strong>{money(punch.amount || line.total || 0)}</strong></div>
            </div></div>

            <div className="day-section"><h4>☕ Pauses</h4>{(punch.breaks || []).length === 0 ? <p className="day-empty-note">Aucune pause enregistrée.</p> : <div className="day-break-list">{(punch.breaks || []).map((item, index) => <div className="day-break-row" key={item.id || index}><span>Pause {index + 1}</span><strong>{formatTime(item.startedAt, settings.locale, settings.timeZone)} → {formatTime(item.endedAt, settings.locale, settings.timeZone)}</strong><em>{minutesToHours(item.minutes || 0).toFixed(2)} h</em></div>)}</div>}</div>

            <div className="day-section"><h4>📍 Chantier</h4><div className="day-detail-grid"><div className="day-detail-item"><span>Client / job</span><strong>{punch.clientName || punch.jobName || invoice.clientName}</strong></div><div className="day-detail-item"><span>Adresse</span><strong>{punch.jobAddress || invoice.jobAddress}</strong></div></div></div>
            {punch.notes && <div className="day-section"><h4>📝 Notes</h4><p className="day-note-text">{punch.notes}</p></div>}
          </>
        )}
      </div>
    </div>
  );
}

export default function Invoices() {
  const { appData, updateAppData } = useAppData();
  const [catalogForms, setCatalogForms] = useState({});
  const [manualInvoice, setManualInvoice] = useState(emptyManualInvoice);
  const [preview, setPreview] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedWorkday, setSelectedWorkday] = useState(null);

  const settings = appData.settings || {};
  const invoices = appData.invoices || [];
  const punches = appData.punches || [];
  const catalogItems = (appData.catalogItems || []).filter((item) => item.active !== false);
  const uninvoicedPunches = punches.filter((punch) => !punch.invoiceStatus || punch.invoiceStatus === "not_invoiced");
  const selectedInvoice = useMemo(() => invoices.find((invoice) => invoice.id === selectedInvoiceId) || null, [invoices, selectedInvoiceId]);

  const recalc = (invoice, currentData) => recalculateInvoice(invoice, currentData.settings?.taxProfile?.taxes || []);
  const moneyForInvoice = (invoice, value) => formatMoney(value, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA");
  const findPunch = (line) => punches.find((punch) => punch.id === line?.sourceId);

  const createOrUpdateOpenInvoices = () => {
    updateAppData((currentData) => {
      const result = buildInvoicesFromPunches({
        punches: currentData.punches || [],
        invoices: currentData.invoices || [],
        taxes: currentData.settings?.taxProfile?.taxes || [],
        workers: currentData.workers || []
      });
      return { ...currentData, punches: result.punches, invoices: result.invoices };
    });
  };

  const updateInvoice = (invoiceId, updater) => {
    updateAppData((currentData) => ({
      ...currentData,
      invoices: (currentData.invoices || []).map((invoice) => invoice.id === invoiceId ? recalc(updater(invoice), currentData) : invoice)
    }));
  };

  const updateInvoiceField = (invoiceId, field, value) => updateInvoice(invoiceId, (invoice) => field === "status" ? nextInvoiceWithStatus(invoice, value) : { ...invoice, [field]: value });
  const markSent = (invoiceId) => updateInvoice(invoiceId, (invoice) => nextInvoiceWithStatus(invoice, INVOICE_STATUSES.SENT));
  const markPaid = (invoice) => updateInvoice(invoice.id, (currentInvoice) => ({ ...nextInvoiceWithStatus(currentInvoice, INVOICE_STATUSES.PAID), paidAmount: currentInvoice.totals?.total || invoice.totals?.total || 0 }));

  const buildShareMessage = (invoice) => {
    const total = moneyForInvoice(invoice, invoice.totals?.total || 0);
    return `Bonjour,\n\nVoici la facture ${invoice.invoiceNumber}.\n\nClient: ${invoice.clientName || "No client"}\nTotal: ${total}\n\nMerci beaucoup.`;
  };

  const previewInvoice = (invoice) => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview({ invoiceNumber: invoice.invoiceNumber, url: getInvoicePdfPreviewUrl({ invoice, settings }) });
  };

  const shareInvoice = async (invoice) => {
    const file = getInvoicePdfFile({ invoice, settings });
    const text = buildShareMessage(invoice);
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: invoice.invoiceNumber, text, files: [file] }); markSent(invoice.id); return; } catch (error) { if (error?.name === "AbortError") return; }
    }
    if (navigator.share) {
      try { await navigator.share({ title: invoice.invoiceNumber, text }); markSent(invoice.id); return; } catch (error) { if (error?.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text); alert("Message copied."); } catch { alert(text); }
  };

  const openMail = (invoice) => {
    const subject = encodeURIComponent(`Facture ${invoice.invoiceNumber}`);
    const body = encodeURIComponent(`${buildShareMessage(invoice)}\n\nNote: si le PDF n'est pas attaché automatiquement, utilise Télécharger PDF puis joins-le au courriel.`);
    markSent(invoice.id);
    window.location.href = `mailto:${encodeURIComponent(invoice.clientEmail || "")}?subject=${subject}&body=${body}`;
  };

  const openSms = (invoice) => {
    const body = encodeURIComponent(`${buildShareMessage(invoice)}\n\nNote: si ton téléphone ne joint pas le PDF automatiquement, utilise Télécharger PDF ou Partager PDF.`);
    markSent(invoice.id);
    window.location.href = `sms:${encodeURIComponent(invoice.clientPhone || "")}?&body=${body}`;
  };

  const createManualInvoice = () => {
    const clientName = manualInvoice.clientName.trim() || "No client";
    const jobAddress = manualInvoice.jobAddress.trim() || "No address";
    updateAppData((currentData) => {
      const invoiceId = `invoice-${Date.now()}`;
      const invoice = recalc({ id: invoiceId, invoiceNumber: `EPI-${new Date().getFullYear()}-${String((currentData.invoices || []).length + 1).padStart(4, "0")}`, groupKey: `manual|${invoiceId}`, status: INVOICE_STATUSES.OPEN, clientId: "", clientName, clientPhone: manualInvoice.clientPhone.trim(), clientEmail: manualInvoice.clientEmail.trim(), jobAddress, currency: currentData.settings?.currency || "CAD", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lines: [], taxEnabled: true, discountEnabled: false, discountType: "amount", discountValue: 0, discountAmount: 0, advanceEnabled: false, advanceAmount: 0, paidAmount: 0, notes: manualInvoice.notes.trim() }, currentData);
      return { ...currentData, invoices: [invoice, ...(currentData.invoices || [])] };
    });
    setManualInvoice(emptyManualInvoice);
  };

  const deleteInvoice = (invoiceId) => {
    updateAppData((currentData) => ({ ...currentData, invoices: (currentData.invoices || []).filter((invoice) => invoice.id !== invoiceId), punches: (currentData.punches || []).map((punch) => punch.linkedInvoiceId === invoiceId ? { ...punch, invoiceStatus: "not_invoiced", linkedInvoiceId: "" } : punch) }));
    if (selectedInvoiceId === invoiceId) setSelectedInvoiceId(null);
  };

  const updateCatalogForm = (invoiceId, field, value) => setCatalogForms((current) => ({ ...current, [invoiceId]: { itemId: "", quantity: "1", customDescription: "", ...(current[invoiceId] || {}), [field]: value } }));

  const addCatalogLine = (invoiceId) => {
    const form = catalogForms[invoiceId] || { itemId: "", quantity: "1", customDescription: "" };
    const item = catalogItems.find((catalogItem) => catalogItem.id === form.itemId) || catalogItems[0];
    if (!item) return;
    const quantity = Number(form.quantity || 1);
    const rate = Number(item.defaultPrice || 0);
    const line = { id: `line-catalog-${Date.now()}`, sourceType: "catalog", sourceId: item.id, description: form.customDescription?.trim() || item.name, quantity, unit: item.unit, rate, total: Number((quantity * rate).toFixed(2)), taxable: item.taxable !== false };
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, lines: [...(invoice.lines || []), line] }));
    setCatalogForms((current) => ({ ...current, [invoiceId]: { itemId: "", quantity: "1", customDescription: "" } }));
  };

  const removeLine = (invoiceId, lineId) => updateInvoice(invoiceId, (invoice) => ({ ...invoice, lines: (invoice.lines || []).filter((line) => line.id !== lineId) }));

  const renderInvoiceList = () => (
    <div className="simple-list">
      {invoices.map((invoice) => {
        const totals = invoice.totals || {};
        const money = (value) => moneyForInvoice(invoice, value);
        const workLines = (invoice.lines || []).filter((line) => line.sourceType === "punch");
        const catalogLines = (invoice.lines || []).filter((line) => line.sourceType === "catalog");
        return (
          <button className="list-item invoice-summary-card" key={invoice.id} type="button" onClick={() => setSelectedInvoiceId(invoice.id)}>
            <div className="invoice-card-header"><div><span className="status-pill">{statusLabels[invoice.status] || invoice.status}</span><h2>{invoice.clientName || "No client"}</h2><p>{invoice.jobAddress || "No address"}</p></div><strong>{money(totals.total || 0)}</strong></div>
            <div className="mini-stats"><span>{invoice.invoiceNumber}</span><span>{getInvoiceDateRange(invoice)}</span><span>{workLines.length} journée(s)</span><span>{catalogLines.length} item(s)</span><span>Balance {money(totals.balanceDue || 0)}</span></div>
          </button>
        );
      })}
    </div>
  );

  const renderInvoiceDetail = (invoice) => {
    const totals = invoice.totals || {};
    const money = (value) => moneyForInvoice(invoice, value);
    const form = catalogForms[invoice.id] || { itemId: "", quantity: "1", customDescription: "" };
    return (
      <div className="info-card" key={invoice.id}>
        <div className="invoice-card-header">
          <div><button className="secondary-action" type="button" onClick={() => setSelectedInvoiceId(null)}>← Retour aux factures</button><span className="status-pill">{statusLabels[invoice.status] || invoice.status}</span><h2>{invoice.invoiceNumber}</h2><p>{invoice.clientName} | {invoice.jobAddress}</p></div>
          <label className="field compact-field"><span>Status</span><select value={invoice.status} onChange={(event) => updateInvoiceField(invoice.id, "status", event.target.value)}>{Object.values(INVOICE_STATUSES).map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>
        </div>

        <div className="mini-stats"><span>Created {formatDate(invoice.createdAt)}</span>{shouldShowSentDate(invoice) && <span>Sent {formatDate(invoice.sentAt)}</span>}<span>{(invoice.lines || []).length} lines</span><span>Total {money(totals.total || 0)}</span><span>Balance {money(totals.balanceDue || 0)}</span></div>
        <div className="action-row"><button className="secondary-action" type="button" onClick={() => updateInvoiceField(invoice.id, "status", INVOICE_STATUSES.READY)}>Ready</button><button className="secondary-action" type="button" onClick={() => markSent(invoice.id)}>Sent</button><button className="secondary-action" type="button" onClick={() => markPaid(invoice)}>Paid</button><button className="secondary-action" type="button" onClick={() => deleteInvoice(invoice.id)}>Delete</button></div>

        <div className="info-card nested-card"><h2>Invoice details</h2><div className="form-grid"><label className="field"><span>Client name</span><input value={invoice.clientName || ""} onChange={(event) => updateInvoiceField(invoice.id, "clientName", event.target.value)} /></label><label className="field"><span>Job address</span><input value={invoice.jobAddress || ""} onChange={(event) => updateInvoiceField(invoice.id, "jobAddress", event.target.value)} /></label><label className="field"><span>Client phone</span><input value={invoice.clientPhone || ""} onChange={(event) => updateInvoiceField(invoice.id, "clientPhone", event.target.value)} /></label><label className="field"><span>Client email</span><input value={invoice.clientEmail || ""} onChange={(event) => updateInvoiceField(invoice.id, "clientEmail", event.target.value)} /></label><label className="field"><span>Paid amount</span><input type="number" min="0" step="0.01" value={invoice.paidAmount || 0} onChange={(event) => updateInvoiceField(invoice.id, "paidAmount", Number(event.target.value || 0))} /></label><label className="field field-full"><span>Invoice notes</span><textarea rows="3" value={invoice.notes || ""} onChange={(event) => updateInvoiceField(invoice.id, "notes", event.target.value)} /></label></div></div>

        <div className="form-grid invoice-options"><label className="field"><span>Tax</span><select value={invoice.taxEnabled === false ? "off" : "on"} onChange={(event) => updateInvoiceField(invoice.id, "taxEnabled", event.target.value === "on")}><option value="on">Tax ON</option><option value="off">Tax OFF</option></select></label><label className="field"><span>Discount</span><select value={invoice.discountEnabled ? "on" : "off"} onChange={(event) => updateInvoiceField(invoice.id, "discountEnabled", event.target.value === "on")}><option value="off">Discount OFF</option><option value="on">Discount ON</option></select></label>{invoice.discountEnabled && <label className="field"><span>Discount type</span><select value={invoice.discountType || "amount"} onChange={(event) => updateInvoiceField(invoice.id, "discountType", event.target.value)}><option value="amount">Amount</option><option value="percent">Percent</option></select></label>}{invoice.discountEnabled && <label className="field"><span>Discount value</span><input type="number" min="0" step="0.01" value={invoice.discountValue || 0} onChange={(event) => updateInvoiceField(invoice.id, "discountValue", Number(event.target.value || 0))} /></label>}<label className="field"><span>Advance / deposit</span><select value={invoice.advanceEnabled ? "on" : "off"} onChange={(event) => updateInvoiceField(invoice.id, "advanceEnabled", event.target.value === "on")}><option value="off">Advance OFF</option><option value="on">Advance ON</option></select></label>{invoice.advanceEnabled && <label className="field"><span>Advance amount</span><input type="number" min="0" step="0.01" value={invoice.advanceAmount || 0} onChange={(event) => updateInvoiceField(invoice.id, "advanceAmount", Number(event.target.value || 0))} /></label>}</div>

        <div className="info-card nested-card"><h2>Add catalog item</h2>{catalogItems.length === 0 ? <p>No active catalog item.</p> : <><div className="form-grid"><label className="field"><span>Item</span><select value={form.itemId} onChange={(event) => updateCatalogForm(invoice.id, "itemId", event.target.value)}><option value="">Select item</option>{catalogItems.map((item) => <option key={item.id} value={item.id}>{item.name} - {money(item.defaultPrice || 0)}</option>)}</select></label><label className="field"><span>Quantity</span><input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => updateCatalogForm(invoice.id, "quantity", event.target.value)} /></label><label className="field field-full"><span>Custom description</span><input value={form.customDescription} onChange={(event) => updateCatalogForm(invoice.id, "customDescription", event.target.value)} /></label></div><div className="action-row"><button className="secondary-action" type="button" onClick={() => addCatalogLine(invoice.id)}>Add item to invoice</button></div></>}</div>

        <div className="simple-list">{(invoice.lines || []).map((line) => {
          const punch = findPunch(line);
          const isPunch = line.sourceType === "punch";
          return <div className="list-item" key={line.id}><strong>{line.description}</strong><span>{Number(line.quantity || 0).toFixed(2)} {line.unit} | {money(line.total || 0)}</span>{isPunch && <button className="secondary-action" type="button" onClick={() => setSelectedWorkday({ invoice, line, punch })}>Voir détail de la journée</button>}{line.sourceType === "catalog" && <button className="secondary-action" type="button" onClick={() => removeLine(invoice.id, line.id)}>Remove</button>}</div>;
        })}</div>

        <div className="invoice-totals"><span>Subtotal: {money(totals.subtotal || 0)}</span>{invoice.discountEnabled && <span>Discount: -{money(totals.discount || 0)}</span>}{invoice.taxEnabled !== false && <span>Tax: {money(totals.taxAmount || 0)}</span>}{invoice.advanceEnabled && <span>Advance: -{money(totals.advance || 0)}</span>}<span>Paid: {money(totals.paidAmount || 0)}</span><strong>Total: {money(totals.total || 0)}</strong><strong>Balance: {money(totals.balanceDue || 0)}</strong></div>
        <div className="action-row"><button className="secondary-action" type="button" onClick={() => previewInvoice(invoice)}>Preview PDF</button><button className="secondary-action" type="button" onClick={() => downloadInvoicePdf({ invoice, settings })}>Download PDF</button><button className="secondary-action" type="button" onClick={() => shareInvoice(invoice)}>Share PDF</button><button className="secondary-action" type="button" onClick={() => openMail(invoice)}>Email</button><button className="secondary-action" type="button" onClick={() => openSms(invoice)}>Text</button></div>
      </div>
    );
  };

  return (
    <section className="module-page">
      <div className="hero-card"><span className="status-pill">Invoices</span><h2>{selectedInvoice ? "Détail de facture" : "Factures"}</h2><p>{selectedInvoice ? "Ajoute des items, ouvre les journées de travail et prépare le PDF." : "Liste compacte des factures. Clique une carte pour ouvrir le détail complet."}</p><div className="action-row"><button className="primary-action" type="button" onClick={createOrUpdateOpenInvoices}>Add punches to invoices</button></div><div className="mini-stats"><span>{uninvoicedPunches.length} uninvoiced punches</span><span>{invoices.length} invoices</span></div></div>
      {preview && <div className="info-card"><h2>PDF Preview - {preview.invoiceNumber}</h2><iframe title={`Preview ${preview.invoiceNumber}`} src={preview.url} style={{ width: "100%", minHeight: "520px", border: "1px solid var(--border)", borderRadius: "18px", background: "white" }} /></div>}
      {!selectedInvoice && <div className="info-card"><h2>Create manual invoice</h2><div className="form-grid"><label className="field"><span>Client name</span><input value={manualInvoice.clientName} onChange={(event) => setManualInvoice((current) => ({ ...current, clientName: event.target.value }))} /></label><label className="field"><span>Job address</span><input value={manualInvoice.jobAddress} onChange={(event) => setManualInvoice((current) => ({ ...current, jobAddress: event.target.value }))} /></label><label className="field"><span>Phone</span><input value={manualInvoice.clientPhone} onChange={(event) => setManualInvoice((current) => ({ ...current, clientPhone: event.target.value }))} /></label><label className="field"><span>Email</span><input value={manualInvoice.clientEmail} onChange={(event) => setManualInvoice((current) => ({ ...current, clientEmail: event.target.value }))} /></label><label className="field field-full"><span>Notes</span><textarea rows="3" value={manualInvoice.notes} onChange={(event) => setManualInvoice((current) => ({ ...current, notes: event.target.value }))} /></label></div><div className="action-row"><button className="secondary-action" type="button" onClick={createManualInvoice}>Create manual invoice</button></div></div>}
      {invoices.length === 0 ? <div className="info-card"><h2>No invoices yet</h2><p>Complete a punch or create a manual invoice.</p></div> : selectedInvoice ? renderInvoiceDetail(selectedInvoice) : renderInvoiceList()}
      {selectedWorkday && <WorkdayDetailModal line={selectedWorkday.line} punch={selectedWorkday.punch} invoice={selectedWorkday.invoice} money={(value) => moneyForInvoice(selectedWorkday.invoice, value)} settings={settings} onClose={() => setSelectedWorkday(null)} />}
    </section>
  );
}
