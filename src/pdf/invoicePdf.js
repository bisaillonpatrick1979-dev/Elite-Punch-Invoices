import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { formatMoney } from "../utils/money.js";
import { formatDate } from "../utils/dates.js";

function safeText(value, fallback = "") {
  return value ? String(value) : fallback;
}

function addWatermarkLogo(doc, logoDataUrl) {
  if (!logoDataUrl) {
    return;
  }

  try {
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(logoDataUrl, "PNG", 45, 92, 120, 80, undefined, "FAST");
    doc.setGState(new doc.GState({ opacity: 1 }));
  } catch (error) {
    console.warn("Unable to render invoice watermark logo", error);
  }
}

function addBillingHeader(doc, billingProfile = {}) {
  const billingName = billingProfile.companyName || billingProfile.displayName || "Billing profile missing";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(billingName, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const lines = [
    billingProfile.civicAddress,
    billingProfile.phone,
    billingProfile.email,
    billingProfile.taxNumber ? `Tax/SIN: ${billingProfile.taxNumber}` : "",
    billingProfile.wcbNumber ? `WCB: ${billingProfile.wcbNumber}` : "",
    billingProfile.liabilityInsuranceNumber ? `Insurance: ${billingProfile.liabilityInsuranceNumber}` : ""
  ].filter(Boolean);

  lines.slice(0, 6).forEach((line, index) => {
    doc.text(String(line), 14, 25 + index * 5);
  });
}

export function downloadInvoicePdf({ invoice, settings }) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const billingProfile = settings?.billingProfile || {};
  const currency = invoice.currency || settings?.currency || "CAD";
  const locale = settings?.locale || "fr-CA";
  const totals = invoice.totals || {};

  addWatermarkLogo(doc, billingProfile.logoDataUrl);
  addBillingHeader(doc, billingProfile);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("INVOICE", 155, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice: ${safeText(invoice.invoiceNumber)}`, 155, 27);
  doc.text(`Date: ${formatDate(invoice.createdAt, locale)}`, 155, 33);
  doc.text(`Status: ${safeText(invoice.status)}`, 155, 39);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bill to", 14, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(safeText(invoice.clientName, "No client"), 14, 69);
  doc.text(safeText(invoice.jobAddress, "No job address"), 14, 75);

  autoTable(doc, {
    startY: 88,
    head: [["Description", "Qty", "Unit", "Rate", "Total"]],
    body: (invoice.lines || []).map((line) => [
      safeText(line.description),
      Number(line.quantity || 0).toFixed(2),
      safeText(line.unit),
      formatMoney(line.rate || 0, currency, locale),
      formatMoney(line.total || 0, currency, locale)
    ]),
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [255, 255, 255]
    }
  });

  const finalY = doc.lastAutoTable?.finalY || 100;
  const totalsX = 135;
  let y = finalY + 10;

  doc.setFontSize(10);
  doc.text("Subtotal", totalsX, y);
  doc.text(formatMoney(totals.subtotal || 0, currency, locale), 195, y, { align: "right" });

  y += 6;
  doc.text("Tax", totalsX, y);
  doc.text(formatMoney(totals.taxAmount || 0, currency, locale), 195, y, { align: "right" });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", totalsX, y);
  doc.text(formatMoney(totals.total || 0, currency, locale), 195, y, { align: "right" });

  y += 7;
  doc.text("Balance due", totalsX, y);
  doc.text(formatMoney(totals.balanceDue || 0, currency, locale), 195, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Signature: ______________________________", 120, 245);
  doc.text(`Date: ${formatDate(new Date().toISOString(), locale)}`, 120, 252);

  const fileName = `${safeText(invoice.invoiceNumber, "invoice")}.pdf`;
  doc.save(fileName);
}
