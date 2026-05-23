import { useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { downloadInvoicePdf, getInvoicePdfFile, getInvoicePdfPreviewUrl } from "../../pdf/invoicePdf.js";
import { buildInvoicesFromPunches, INVOICE_STATUSES, recalculateInvoice } from "../../utils/invoiceHelpers.js";
import { formatDate } from "../../utils/dates.js";
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

export default function Invoices() {
  const { appData, updateAppData } = useAppData();
  const [catalogForms, setCatalogForms] = useState({});
  const [manualInvoice, setManualInvoice] = useState(emptyManualInvoice);
  const [preview, setPreview] = useState(null);

  const settings = appData.settings || {};
  const invoices = appData.invoices || [];
  const catalogItems = (appData.catalogItems || []).filter((item) => item.active !== false);
  const uninvoicedPunches = (appData.punches || []).filter((punch) => !punch.invoiceStatus || punch.invoiceStatus === "not_invoiced");

  const recalc = (invoice, currentData) => recalculateInvoice(invoice, currentData.settings?.taxProfile?.taxes || []);
  const moneyForInvoice = (invoice, value) => formatMoney(value, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA");

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
      invoices: (currentData.invoices || []).map((invoice) => {
        if (invoice.id !== invoiceId) return invoice;
        return recalc(updater(invoice), currentData);
      })
    }));
  };

  const updateInvoiceField = (invoiceId, field, value) => {
    updateInvoice(invoiceId, (invoice) => {
      if (field === "status") return nextInvoiceWithStatus(invoice, value);
      return { ...invoice, [field]: value };
    });
  };

  const markSent = (invoiceId) => updateInvoice(invoiceId, (invoice) => nextInvoiceWithStatus(invoice, INVOICE_STATUSES.SENT));
  const markPaid = (invoice) => {
    updateInvoice(invoice.id, (currentInvoice) => ({
      ...nextInvoiceWithStatus(currentInvoice, INVOICE_STATUSES.PAID),
      paidAmount: currentInvoice.totals?.total || invoice.totals?.total || 0
    }));
  };

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
      try {
        await navigator.share({ title: invoice.invoiceNumber, text, files: [file] });
        markSent(invoice.id);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: invoice.invoiceNumber, text });
        markSent(invoice.id);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("Message copied.");
    } catch {
      alert(text);
    }
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
      const invoice = recalc({
        id: invoiceId,
        invoiceNumber: `EPI-${new Date().getFullYear()}-${String((currentData.invoices || []).length + 1).padStart(4, "0")}`,
        groupKey: `manual|${invoiceId}`,
        status: INVOICE_STATUSES.OPEN,
        clientId: "",
        clientName,
        clientPhone: manualInvoice.clientPhone.trim(),
        clientEmail: manualInvoice.clientEmail.trim(),
        jobAddress,
        currency: currentData.settings?.currency || "CAD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lines: [],
        taxEnabled: true,
        discountEnabled: false,
        discountType: "amount",
        discountValue: 0,
        discountAmount: 0,
        advanceEnabled: false,
        advanceAmount: 0,
        paidAmount: 0,
        notes: manualInvoice.notes.trim()
      }, currentData);
      return { ...currentData, invoices: [invoice, ...(currentData.invoices || [])] };
    });

    setManualInvoice(emptyManualInvoice);
  };

  const deleteInvoice = (invoiceId) => {
    updateAppData((currentData) => ({
      ...currentData,
      invoices: (currentData.invoices || []).filter((invoice) => invoice.id !== invoiceId),
      punches: (currentData.punches || []).map((punch) => punch.linkedInvoiceId === invoiceId ? { ...punch, invoiceStatus: "not_invoiced", linkedInvoiceId: "" } : punch)
    }));
  };

  const updateCatalogForm = (invoiceId, field, value) => {
    setCatalogForms((current) => ({
      ...current,
      [invoiceId]: { itemId: "", quantity: "1", customDescription: "", ...(current[invoiceId] || {}), [field]: value }
    }));
  };

  const addCatalogLine = (invoiceId) => {
    const form = catalogForms[invoiceId] || { itemId: "", quantity: "1", customDescription: "" };
    const item = catalogItems.find((catalogItem) => catalogItem.id === form.itemId) || catalogItems[0];
    if (!item) return;
    const quantity = Number(form.quantity || 1);
    const rate = Number(item.defaultPrice || 0);
    const line = {
      id: `line-catalog-${Date.now()}`,
      sourceType: "catalog",
      sourceId: item.id,
      description: form.customDescription?.trim() || item.name,
      quantity,
      unit: item.unit,
      rate,
      total: Number((quantity * rate).toFixed(2)),
      taxable: item.taxable !== false
    };

    updateInvoice(invoiceId, (invoice) => ({ ...invoice, lines: [...(invoice.lines || []), line] }));
    setCatalogForms((current) => ({ ...current, [invoiceId]: { itemId: "", quantity: "1", customDescription: "" } }));
  };

  const removeLine = (invoiceId, lineId) => {
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, lines: (invoice.lines || []).filter((line) => line.id !== lineId) }));
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Invoices</span>
        <h2>Open invoices</h2>
        <p>Create open invoices from punches or manually, add catalog items, preview and send PDFs.</p>
        <div className="action-row"><button className="primary-action" type="button" onClick={createOrUpdateOpenInvoices}>Add punches to invoices</button></div>
        <div className="mini-stats"><span>{uninvoicedPunches.length} uninvoiced punches</span><span>{invoices.length} invoices</span></div>
      </div>

      {preview && <div className="info-card"><h2>PDF Preview - {preview.invoiceNumber}</h2><iframe title={`Preview ${preview.invoiceNumber}`} src={preview.url} style={{ width: "100%", minHeight: "520px", border: "1px solid var(--border)", borderRadius: "18px", background: "white" }} /></div>}

      <div className="info-card">
        <h2>Create manual invoice</h2>
        <div className="form-grid">
          <label className="field"><span>Client name</span><input value={manualInvoice.clientName} onChange={(event) => setManualInvoice((current) => ({ ...current, clientName: event.target.value }))} /></label>
          <label className="field"><span>Job address</span><input value={manualInvoice.jobAddress} onChange={(event) => setManualInvoice((current) => ({ ...current, jobAddress: event.target.value }))} /></label>
          <label className="field"><span>Phone</span><input value={manualInvoice.clientPhone} onChange={(event) => setManualInvoice((current) => ({ ...current, clientPhone: event.target.value }))} /></label>
          <label className="field"><span>Email</span><input value={manualInvoice.clientEmail} onChange={(event) => setManualInvoice((current) => ({ ...current, clientEmail: event.target.value }))} /></label>
          <label className="field field-full"><span>Notes</span><textarea rows="3" value={manualInvoice.notes} onChange={(event) => setManualInvoice((current) => ({ ...current, notes: event.target.value }))} /></label>
        </div>
        <div className="action-row"><button className="secondary-action" type="button" onClick={createManualInvoice}>Create manual invoice</button></div>
      </div>

      {invoices.length === 0 ? <div className="info-card"><h2>No invoices yet</h2><p>Complete a punch or create a manual invoice.</p></div> : <div className="simple-list">{invoices.map((invoice) => {
        const totals = invoice.totals || {};
        const money = (value) => moneyForInvoice(invoice, value);
        const form = catalogForms[invoice.id] || { itemId: "", quantity: "1", customDescription: "" };
        return (
          <div className="info-card" key={invoice.id}>
            <div className="invoice-card-header">
              <div><span className="status-pill">{statusLabels[invoice.status] || invoice.status}</span><h2>{invoice.invoiceNumber}</h2><p>{invoice.clientName} | {invoice.jobAddress}</p></div>
              <label className="field compact-field"><span>Status</span><select value={invoice.status} onChange={(event) => updateInvoiceField(invoice.id, "status", event.target.value)}>{Object.values(INVOICE_STATUSES).map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>
            </div>

            <div className="mini-stats">
              <span>Created {formatDate(invoice.createdAt)}</span>
              {shouldShowSentDate(invoice) && <span>Sent {formatDate(invoice.sentAt)}</span>}
              <span>{(invoice.lines || []).length} lines</span>
              <span>Total {money(totals.total || 0)}</span>
              <span>Balance {money(totals.balanceDue || 0)}</span>
            </div>

            <div className="action-row"><button className="secondary-action" type="button" onClick={() => updateInvoiceField(invoice.id, "status", INVOICE_STATUSES.READY)}>Ready</button><button className="secondary-action" type="button" onClick={() => markSent(invoice.id)}>Sent</button><button className="secondary-action" type="button" onClick={() => markPaid(invoice)}>Paid</button><button className="secondary-action" type="button" onClick={() => deleteInvoice(invoice.id)}>Delete</button></div>

            <div className="info-card nested-card"><h2>Invoice details</h2><div className="form-grid"><label className="field"><span>Client name</span><input value={invoice.clientName || ""} onChange={(event) => updateInvoiceField(invoice.id, "clientName", event.target.value)} /></label><label className="field"><span>Job address</span><input value={invoice.jobAddress || ""} onChange={(event) => updateInvoiceField(invoice.id, "jobAddress", event.target.value)} /></label><label className="field"><span>Client phone</span><input value={invoice.clientPhone || ""} onChange={(event) => updateInvoiceField(invoice.id, "clientPhone", event.target.value)} /></label><label className="field"><span>Client email</span><input value={invoice.clientEmail || ""} onChange={(event) => updateInvoiceField(invoice.id, "clientEmail", event.target.value)} /></label><label className="field"><span>Paid amount</span><input type="number" min="0" step="0.01" value={invoice.paidAmount || 0} onChange={(event) => updateInvoiceField(invoice.id, "paidAmount", Number(event.target.value || 0))} /></label><label className="field field-full"><span>Invoice notes</span><textarea rows="3" value={invoice.notes || ""} onChange={(event) => updateInvoiceField(invoice.id, "notes", event.target.value)} /></label></div></div>

            <div className="form-grid invoice-options"><label className="field"><span>Tax</span><select value={invoice.taxEnabled === false ? "off" : "on"} onChange={(event) => updateInvoiceField(invoice.id, "taxEnabled", event.target.value === "on")}><option value="on">Tax ON</option><option value="off">Tax OFF</option></select></label><label className="field"><span>Discount</span><select value={invoice.discountEnabled ? "on" : "off"} onChange={(event) => updateInvoiceField(invoice.id, "discountEnabled", event.target.value === "on")}><option value="off">Discount OFF</option><option value="on">Discount ON</option></select></label>{invoice.discountEnabled && <label className="field"><span>Discount type</span><select value={invoice.discountType || "amount"} onChange={(event) => updateInvoiceField(invoice.id, "discountType", event.target.value)}><option value="amount">Amount</option><option value="percent">Percent</option></select></label>}{invoice.discountEnabled && <label className="field"><span>Discount value</span><input type="number" min="0" step="0.01" value={invoice.discountValue || 0} onChange={(event) => updateInvoiceField(invoice.id, "discountValue", Number(event.target.value || 0))} /></label>}<label className="field"><span>Advance / deposit</span><select value={invoice.advanceEnabled ? "on" : "off"} onChange={(event) => updateInvoiceField(invoice.id, "advanceEnabled", event.target.value === "on")}><option value="off">Advance OFF</option><option value="on">Advance ON</option></select></label>{invoice.advanceEnabled && <label className="field"><span>Advance amount</span><input type="number" min="0" step="0.01" value={invoice.advanceAmount || 0} onChange={(event) => updateInvoiceField(invoice.id, "advanceAmount", Number(event.target.value || 0))} /></label>}</div>

            <div className="info-card nested-card"><h2>Add catalog item</h2>{catalogItems.length === 0 ? <p>No active catalog item.</p> : <><div className="form-grid"><label className="field"><span>Item</span><select value={form.itemId} onChange={(event) => updateCatalogForm(invoice.id, "itemId", event.target.value)}><option value="">Select item</option>{catalogItems.map((item) => <option key={item.id} value={item.id}>{item.name} - {money(item.defaultPrice || 0)}</option>)}</select></label><label className="field"><span>Quantity</span><input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => updateCatalogForm(invoice.id, "quantity", event.target.value)} /></label><label className="field field-full"><span>Custom description</span><input value={form.customDescription} onChange={(event) => updateCatalogForm(invoice.id, "customDescription", event.target.value)} /></label></div><div className="action-row"><button className="secondary-action" type="button" onClick={() => addCatalogLine(invoice.id)}>Add item to invoice</button></div></>}</div>

            <div className="simple-list">{(invoice.lines || []).map((line) => <div className="list-item" key={line.id}><strong>{line.description}</strong><span>{Number(line.quantity || 0).toFixed(2)} {line.unit} | {money(line.total || 0)}</span>{line.sourceType === "catalog" && <button className="secondary-action" type="button" onClick={() => removeLine(invoice.id, line.id)}>Remove</button>}</div>)}</div>

            <div className="invoice-totals"><span>Subtotal: {money(totals.subtotal || 0)}</span>{invoice.discountEnabled && <span>Discount: -{money(totals.discount || 0)}</span>}{invoice.taxEnabled !== false && <span>Tax: {money(totals.taxAmount || 0)}</span>}{invoice.advanceEnabled && <span>Advance: -{money(totals.advance || 0)}</span>}<span>Paid: {money(totals.paidAmount || 0)}</span><strong>Total: {money(totals.total || 0)}</strong><strong>Balance: {money(totals.balanceDue || 0)}</strong></div>
            <div className="action-row"><button className="secondary-action" type="button" onClick={() => previewInvoice(invoice)}>Preview PDF</button><button className="secondary-action" type="button" onClick={() => downloadInvoicePdf({ invoice, settings })}>Download PDF</button><button className="secondary-action" type="button" onClick={() => shareInvoice(invoice)}>Share PDF</button><button className="secondary-action" type="button" onClick={() => openMail(invoice)}>Email</button><button className="secondary-action" type="button" onClick={() => openSms(invoice)}>Text</button></div>
          </div>
        );
      })}</div>}
    </section>
  );
}
