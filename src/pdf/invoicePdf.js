import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { formatMoney } from "../utils/money.js";
import { formatDate } from "../utils/dates.js";

function safeText(value, fallback = "") {
  return value ? String(value) : fallback;
}

function addWatermarkLogo(doc, logoDataUrl) {
  if (!logoDataUrl) return;
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

  lines.slice(0, 6).forEach((line, index) => doc.text(String(line), 14, 25 + index * 5));
}

function addSignature(doc, billingProfile = {}, locale = "fr-CA") {
  const signatureY = 232;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Signature", 120, signatureY);

  if (billingProfile.signatureDataUrl) {
    try {
      doc.addImage(billingProfile.signatureDataUrl, "PNG", 120, signatureY + 3, 62, 24, undefined, "FAST");
    } catch (error) {
      console.warn("Unable to render signature", error);
      doc.text("______________________________", 120, signatureY + 16);
    }
  } else {
    doc.text("______________________________", 120, signatureY + 16);
  }

  const signatureDate = billingProfile.signatureDate || new Date().toISOString();
  doc.text(`Date: ${formatDate(signatureDate, locale)}`, 120, signatureY + 34);
}

function addTotalLine(doc, label, value, y, currency, locale, bold = false) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(bold ? 12 : 10);
  doc.text(label, 135, y);
  doc.text(formatMoney(value || 0, currency, locale), 195, y, { align: "right" });
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
    body: (invoice.lines || []).map((line) => [safeText(line.description), Number(line.quantity || 0).toFixed(2), safeText(line.unit), formatMoney(line.rate || 0, currency, locale), formatMoney(line.total || 0, currency, locale)]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] }
  });

  const finalY = doc.lastAutoTable?.finalY || 100;
  let y = finalY + 10;

  addTotalLine(doc, "Subtotal", totals.subtotal, y, currency, locale);
  y += 6;

  if (invoice.discountEnabled) {
    addTotalLine(doc, "Discount", -(totals.discount || 0), y, currency, locale);
    y += 6;
  }

  if (invoice.taxEnabled !== false) {
    addTotalLine(doc, "Tax", totals.taxAmount, y, currency, locale);
    y += 6;
  }

  if (invoice.advanceEnabled) {
    addTotalLine(doc, "Advance / deposit", -(totals.advance || 0), y, currency, locale);
    y += 6;
  }

  y += 2;
  addTotalLine(doc, "Total", totals.total, y, currency, locale, true);
  y += 7;
  addTotalLine(doc, "Balance due", totals.balanceDue, y, currency, locale, true);

  addSignature(doc, billingProfile, locale);
  doc.save(`${safeText(invoice.invoiceNumber, "invoice")}.pdf`);
}
