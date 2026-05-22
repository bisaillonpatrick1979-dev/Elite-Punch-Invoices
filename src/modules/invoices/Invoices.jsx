import { useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { downloadInvoicePdf } from "../../pdf/invoicePdf.js";
import { buildInvoicesFromPunches, INVOICE_STATUSES, recalculateInvoice } from "../../utils/invoiceHelpers.js";
import { formatMoney } from "../../utils/money.js";
import { formatDate } from "../../utils/dates.js";

const statusLabels = { open: "Open", ready: "Ready", sent: "Sent", partial: "Partial", paid: "Paid", cancelled: "Cancelled", closed: "Closed" };

export default function Invoices() {
  const { appData, updateAppData } = useAppData();
  const [catalogForms, setCatalogForms] = useState({});
  const settings = appData.settings || {};
  const invoices = appData.invoices || [];
  const catalogItems = (appData.catalogItems || []).filter((item) => item.active !== false);
  const uninvoicedPunches = (appData.punches || []).filter((punch) => !punch.invoiceStatus || punch.invoiceStatus === "not_invoiced");

  const recalc = (invoice, currentData) => recalculateInvoice(invoice, currentData.settings?.taxProfile?.taxes || []);

  const createOrUpdateOpenInvoices = () => {
    updateAppData((currentData) => {
      const result = buildInvoicesFromPunches({ punches: currentData.punches || [], invoices: currentData.invoices || [], taxes: currentData.settings?.taxProfile?.taxes || [] });
      return { ...currentData, punches: result.punches, invoices: result.invoices };
    });
  };

  const updateInvoiceField = (invoiceId, field, value) => {
    updateAppData((currentData) => ({
      ...currentData,
      invoices: (currentData.invoices || []).map((invoice) => invoice.id === invoiceId ? recalc({ ...invoice, [field]: value }, currentData) : invoice)
    }));
  };

  const updateCatalogForm = (invoiceId, field, value) => {
    setCatalogForms((current) => ({
      ...current,
      [invoiceId]: {
        itemId: "",
        quantity: "1",
        customDescription: "",
        ...(current[invoiceId] || {}),
        [field]: value
      }
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

    updateAppData((currentData) => ({
      ...currentData,
      invoices: (currentData.invoices || []).map((invoice) =>
        invoice.id === invoiceId ? recalc({ ...invoice, lines: [...(invoice.lines || []), line] }, currentData) : invoice
      )
    }));

    setCatalogForms((current) => ({ ...current, [invoiceId]: { itemId: "", quantity: "1", customDescription: "" } }));
  };

  const removeLine = (invoiceId, lineId) => {
    updateAppData((currentData) => ({
      ...currentData,
      invoices: (currentData.invoices || []).map((invoice) =>
        invoice.id === invoiceId ? recalc({ ...invoice, lines: (invoice.lines || []).filter((line) => line.id !== lineId) }, currentData) : invoice
      )
    }));
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Invoices</span>
        <h2>Open invoices</h2>
        <p>Create or update open invoices from completed punches, add catalog items, then export a PDF.</p>
        <div className="action-row"><button className="primary-action" type="button" onClick={createOrUpdateOpenInvoices}>Add punches to invoices</button></div>
        <div className="mini-stats"><span>{uninvoicedPunches.length} uninvoiced punches</span><span>{invoices.length} invoices</span></div>
      </div>

      {invoices.length === 0 ? <div className="info-card"><h2>No invoices yet</h2><p>Complete a punch, then use Add punches to invoices.</p></div> : (
        <div className="simple-list">
          {invoices.map((invoice) => {
            const totals = invoice.totals || {};
            const money = (value) => formatMoney(value, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA");
            const form = catalogForms[invoice.id] || { itemId: "", quantity: "1", customDescription: "" };
            return (
              <div className="info-card" key={invoice.id}>
                <div className="invoice-card-header">
                  <div><span className="status-pill">{statusLabels[invoice.status] || invoice.status}</span><h2>{invoice.invoiceNumber}</h2><p>{invoice.clientName} | {invoice.jobAddress}</p></div>
                  <label className="field compact-field"><span>Status</span><select value={invoice.status} onChange={(event) => updateInvoiceField(invoice.id, "status", event.target.value)}>{Object.values(INVOICE_STATUSES).map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>
                </div>

                <div className="mini-stats"><span>Created {formatDate(invoice.createdAt)}</span><span>{(invoice.lines || []).length} lines</span><span>Total {money(totals.total || 0)}</span><span>Balance {money(totals.balanceDue || 0)}</span></div>

                <div className="form-grid invoice-options">
                  <label className="field"><span>Tax</span><select value={invoice.taxEnabled === false ? "off" : "on"} onChange={(event) => updateInvoiceField(invoice.id, "taxEnabled", event.target.value === "on")}><option value="on">Tax ON</option><option value="off">Tax OFF</option></select></label>
                  <label className="field"><span>Discount</span><select value={invoice.discountEnabled ? "on" : "off"} onChange={(event) => updateInvoiceField(invoice.id, "discountEnabled", event.target.value === "on")}><option value="off">Discount OFF</option><option value="on">Discount ON</option></select></label>
                  {invoice.discountEnabled && <label className="field"><span>Discount type</span><select value={invoice.discountType || "amount"} onChange={(event) => updateInvoiceField(invoice.id, "discountType", event.target.value)}><option value="amount">Amount</option><option value="percent">Percent</option></select></label>}
                  {invoice.discountEnabled && <label className="field"><span>Discount value</span><input type="number" min="0" step="0.01" value={invoice.discountValue || 0} onChange={(event) => updateInvoiceField(invoice.id, "discountValue", Number(event.target.value || 0))} /></label>}
                  <label className="field"><span>Advance / deposit</span><select value={invoice.advanceEnabled ? "on" : "off"} onChange={(event) => updateInvoiceField(invoice.id, "advanceEnabled", event.target.value === "on")}><option value="off">Advance OFF</option><option value="on">Advance ON</option></select></label>
                  {invoice.advanceEnabled && <label className="field"><span>Advance amount</span><input type="number" min="0" step="0.01" value={invoice.advanceAmount || 0} onChange={(event) => updateInvoiceField(invoice.id, "advanceAmount", Number(event.target.value || 0))} /></label>}
                </div>

                <div className="info-card nested-card">
                  <h2>Add catalog item</h2>
                  {catalogItems.length === 0 ? <p>No active catalog item.</p> : (
                    <>
                      <div className="form-grid">
                        <label className="field"><span>Item</span><select value={form.itemId} onChange={(event) => updateCatalogForm(invoice.id, "itemId", event.target.value)}><option value="">Select item</option>{catalogItems.map((item) => <option key={item.id} value={item.id}>{item.name} - {money(item.defaultPrice || 0)}</option>)}</select></label>
                        <label className="field"><span>Quantity</span><input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => updateCatalogForm(invoice.id, "quantity", event.target.value)} /></label>
                        <label className="field field-full"><span>Custom description</span><input value={form.customDescription} onChange={(event) => updateCatalogForm(invoice.id, "customDescription", event.target.value)} /></label>
                      </div>
                      <div className="action-row"><button className="secondary-action" type="button" onClick={() => addCatalogLine(invoice.id)}>Add item to invoice</button></div>
                    </>
                  )}
                </div>

                <div className="simple-list">{(invoice.lines || []).map((line) => <div className="list-item" key={line.id}><strong>{line.description}</strong><span>{Number(line.quantity || 0).toFixed(2)} {line.unit} | {money(line.total || 0)}</span>{line.sourceType === "catalog" && <button className="secondary-action" type="button" onClick={() => removeLine(invoice.id, line.id)}>Remove</button>}</div>)}</div>

                <div className="invoice-totals">
                  <span>Subtotal: {money(totals.subtotal || 0)}</span>
                  {invoice.discountEnabled && <span>Discount: -{money(totals.discount || 0)}</span>}
                  {invoice.taxEnabled !== false && <span>Tax: {money(totals.taxAmount || 0)}</span>}
                  {invoice.advanceEnabled && <span>Advance: -{money(totals.advance || 0)}</span>}
                  <strong>Total: {money(totals.total || 0)}</strong>
                </div>
                <div className="action-row"><button className="secondary-action" type="button" onClick={() => downloadInvoicePdf({ invoice, settings })}>Download PDF</button></div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
