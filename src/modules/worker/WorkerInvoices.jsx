import { useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { downloadInvoicePdf, getInvoicePdfFile, getInvoicePdfPreviewUrl } from "../../pdf/invoicePdf.js";
import { formatDate } from "../../utils/dates.js";
import { formatMoney } from "../../utils/money.js";

const statusesShowingSentDate = ["sent", "partial", "paid", "closed"];

function shouldShowSentDate(invoice) {
  return Boolean(invoice.sentAt && statusesShowingSentDate.includes(invoice.status));
}

export default function WorkerInvoices() {
  const { appData, updateAppData } = useAppData();
  const { workerId } = useSession();
  const [preview, setPreview] = useState(null);
  const settings = appData.settings || {};
  const worker = useMemo(() => (appData.workers || []).find((item) => item.id === workerId), [appData.workers, workerId]);
  const invoices = useMemo(() => (appData.invoices || []).filter((invoice) => invoice.workerId === workerId), [appData.invoices, workerId]);
  const money = (value, currency = settings.currency || "CAD") => formatMoney(value, currency, settings.locale || "fr-CA");

  const markSent = (invoiceId) => {
    updateAppData((currentData) => ({
      ...currentData,
      invoices: (currentData.invoices || []).map((invoice) => invoice.id === invoiceId ? { ...invoice, status: "sent", sentAt: invoice.sentAt || new Date().toISOString(), updatedAt: new Date().toISOString() } : invoice)
    }));
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
    if (preview?.url) URL.revokeObjectURL(preview.url);
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
      <div className="hero-card"><span className="status-pill">Mes factures</span><h2>{worker?.name || "Employé"}</h2><p>Factures liées à ton nom seulement. Aperçu PDF, partage mobile, courriel ou texto prérempli.</p></div>
      {preview && <div className="info-card"><h2>Aperçu PDF - {preview.invoiceNumber}</h2><iframe title={`Aperçu ${preview.invoiceNumber}`} src={preview.url} style={{ width: "100%", minHeight: "520px", border: "1px solid var(--border)", borderRadius: "18px", background: "white" }} /></div>}
      {invoices.length === 0 ? <div className="info-card"><h2>Aucune facture</h2><p>Quand tu fais un Punch Out, une facture ouverte à ton nom peut être créée automatiquement.</p></div> : <div className="simple-list">{invoices.map((invoice) => { const totals = invoice.totals || {}; return <div className="info-card" key={invoice.id}><span className="status-pill">{invoice.status}</span><h2>{invoice.invoiceNumber}</h2><p>{invoice.clientName || "No client"} | {invoice.jobAddress || "No address"}</p><div className="mini-stats"><span>Créée {formatDate(invoice.createdAt, settings.locale, settings.timeZone)}</span>{shouldShowSentDate(invoice) && <span>Envoyée {formatDate(invoice.sentAt, settings.locale, settings.timeZone)}</span>}<span>Total {money(totals.total || 0, invoice.currency)}</span><span>Balance {money(totals.balanceDue || 0, invoice.currency)}</span><span>{(invoice.lines || []).length} lignes</span></div><div className="simple-list">{(invoice.lines || []).map((line) => <div className="list-item" key={line.id}><strong>{line.description}</strong><span>{Number(line.quantity || 0).toFixed(2)} {line.unit} | {money(line.total || 0, invoice.currency)}</span></div>)}</div><div className="action-row"><button className="secondary-action" type="button" onClick={() => previewInvoice(invoice)}>Aperçu PDF</button><button className="secondary-action" type="button" onClick={() => downloadInvoicePdf({ invoice, settings })}>Télécharger PDF</button><button className="secondary-action" type="button" onClick={() => shareInvoice(invoice)}>Partager PDF</button><button className="secondary-action" type="button" onClick={() => openMail(invoice)}>Courriel</button><button className="secondary-action" type="button" onClick={() => openSms(invoice)}>Texto</button><button className="secondary-action" type="button" onClick={() => copyShareMessage(invoice)}>Copier message</button></div></div>; })}</div>}
    </section>
  );
}
