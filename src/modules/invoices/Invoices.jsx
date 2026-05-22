import { useAppData } from "../../context/AppDataContext.jsx";
import { buildInvoicesFromPunches, INVOICE_STATUSES, recalculateInvoice } from "../../utils/invoiceHelpers.js";
import { formatMoney } from "../../utils/money.js";
import { formatDate } from "../../utils/dates.js";

const statusLabels = {
  open: "Open",
  ready: "Ready",
  sent: "Sent",
  partial: "Partial",
  paid: "Paid",
  cancelled: "Cancelled",
  closed: "Closed"
};

export default function Invoices() {
  const { appData, updateAppData } = useAppData();
  const settings = appData.settings || {};
  const taxes = settings.taxProfile?.taxes || [];
  const invoices = appData.invoices || [];
  const uninvoicedPunches = (appData.punches || []).filter(
    (punch) => !punch.invoiceStatus || punch.invoiceStatus === "not_invoiced"
  );

  const createOrUpdateOpenInvoices = () => {
    updateAppData((currentData) => {
      const result = buildInvoicesFromPunches({
        punches: currentData.punches || [],
        invoices: currentData.invoices || [],
        taxes: currentData.settings?.taxProfile?.taxes || []
      });

      return {
        ...currentData,
        punches: result.punches,
        invoices: result.invoices
      };
    });
  };

  const updateInvoiceStatus = (invoiceId, status) => {
    updateAppData((currentData) => ({
      ...currentData,
      invoices: (currentData.invoices || []).map((invoice) =>
        invoice.id === invoiceId
          ? recalculateInvoice({ ...invoice, status }, currentData.settings?.taxProfile?.taxes || [])
          : invoice
      )
    }));
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Invoices</span>
        <h2>Open invoices</h2>
        <p>
          Create or update open invoices from completed punches. PDF export will be connected later.
        </p>

        <div className="action-row">
          <button className="primary-action" type="button" onClick={createOrUpdateOpenInvoices}>
            Add punches to invoices
          </button>
        </div>

        <div className="mini-stats">
          <span>{uninvoicedPunches.length} uninvoiced punches</span>
          <span>{invoices.length} invoices</span>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="info-card">
          <h2>No invoices yet</h2>
          <p>Complete a punch, then use Add punches to invoices.</p>
        </div>
      ) : (
        <div className="simple-list">
          {invoices.map((invoice) => {
            const totals = invoice.totals || {};

            return (
              <div className="info-card" key={invoice.id}>
                <div className="invoice-card-header">
                  <div>
                    <span className="status-pill">{statusLabels[invoice.status] || invoice.status}</span>
                    <h2>{invoice.invoiceNumber}</h2>
                    <p>{invoice.clientName} | {invoice.jobAddress}</p>
                  </div>

                  <label className="field compact-field">
                    <span>Status</span>
                    <select value={invoice.status} onChange={(event) => updateInvoiceStatus(invoice.id, event.target.value)}>
                      {Object.values(INVOICE_STATUSES).map((status) => (
                        <option value={status} key={status}>{statusLabels[status]}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mini-stats">
                  <span>Created {formatDate(invoice.createdAt)}</span>
                  <span>{(invoice.lines || []).length} lines</span>
                  <span>Total {formatMoney(totals.total || 0, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA")}</span>
                  <span>Balance {formatMoney(totals.balanceDue || 0, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA")}</span>
                </div>

                <div className="simple-list">
                  {(invoice.lines || []).map((line) => (
                    <div className="list-item" key={line.id}>
                      <strong>{line.description}</strong>
                      <span>{Number(line.quantity || 0).toFixed(2)} {line.unit} | {formatMoney(line.total || 0, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA")}</span>
                    </div>
                  ))}
                </div>

                <div className="invoice-totals">
                  <span>Subtotal: {formatMoney(totals.subtotal || 0, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA")}</span>
                  <span>Tax: {formatMoney(totals.taxAmount || 0, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA")}</span>
                  <strong>Total: {formatMoney(totals.total || 0, invoice.currency || settings.currency || "CAD", settings.locale || "fr-CA")}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
