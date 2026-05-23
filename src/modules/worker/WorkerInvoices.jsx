import { useMemo } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { downloadInvoicePdf } from "../../pdf/invoicePdf.js";
import { formatDate } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

export default function WorkerInvoices() {
  const { appData } = useAppData();
  const { workerId } = useSession();
  const settings = appData.settings || {};
  const worker = useMemo(() => (appData.workers || []).find((item) => item.id === workerId), [appData.workers, workerId]);
  const invoices = useMemo(() => (appData.invoices || []).filter((invoice) => invoice.workerId === workerId), [appData.invoices, workerId]);
  const money = (value, currency = settings.currency || "CAD") => formatMoney(value, currency, settings.locale || "fr-CA");

  const copyShareMessage = async (invoice) => {
    const total = invoice.totals?.total || 0;
    const message = `Invoice ${invoice.invoiceNumber}\nWorker: ${invoice.workerName || worker?.name || "Worker"}\nClient: ${invoice.clientName || "No client"}\nTotal: ${money(total, invoice.currency)}\nStatus: ${invoice.status}`;
    try {
      await navigator.clipboard.writeText(message);
      alert("Message copied.");
    } catch (error) {
      alert(message);
    }
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Mes factures</span>
        <h2>{worker?.name || "Employé"}</h2>
        <p>Factures liées à ton nom seulement. Tu peux télécharger le PDF ou copier un message d’envoi.</p>
      </div>

      {invoices.length === 0 ? (
        <div className="info-card"><h2>Aucune facture</h2><p>Quand tu fais un Punch Out, une facture ouverte à ton nom peut être créée automatiquement.</p></div>
      ) : (
        <div className="simple-list">
          {invoices.map((invoice) => {
            const totals = invoice.totals || {};
            return (
              <div className="info-card" key={invoice.id}>
                <span className="status-pill">{invoice.status}</span>
                <h2>{invoice.invoiceNumber}</h2>
                <p>{invoice.clientName || "No client"} | {invoice.jobAddress || "No address"}</p>
                <div className="mini-stats">
                  <span>{formatDate(invoice.createdAt, settings.locale, settings.timeZone)}</span>
                  <span>Total {money(totals.total || 0, invoice.currency)}</span>
                  <span>Balance {money(totals.balanceDue || 0, invoice.currency)}</span>
                  <span>{(invoice.lines || []).length} lignes</span>
                </div>
                <div className="simple-list">
                  {(invoice.lines || []).map((line) => (
                    <div className="list-item" key={line.id}>
                      <strong>{line.description}</strong>
                      <span>{Number(line.quantity || 0).toFixed(2)} {line.unit} | {money(line.total || 0, invoice.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="action-row">
                  <button className="secondary-action" type="button" onClick={() => downloadInvoicePdf({ invoice, settings })}>Télécharger PDF</button>
                  <button className="secondary-action" type="button" onClick={() => copyShareMessage(invoice)}>Copier message</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
