import { calculateInvoiceTotals } from "./calculations.js";
import { formatDate } from "./dates.js";

export const INVOICE_STATUSES = {
  OPEN: "open",
  READY: "ready",
  SENT: "sent",
  PARTIAL: "partial",
  PAID: "paid",
  CANCELLED: "cancelled",
  CLOSED: "closed"
};

export function getInvoiceGroupKey(punch) {
  const client = punch.clientName || "No client";
  const address = punch.jobAddress || punch.jobName || "No address";
  return `${client.trim().toLowerCase()}|${address.trim().toLowerCase()}`;
}

export function createInvoiceLineFromPunch(punch) {
  const dateLabel = formatDate(punch.startedAt);
  const payLabel = punch.payType || "hourly";
  const description = `${dateLabel} - ${punch.workerName || "Worker"} - ${payLabel}`;

  return {
    id: `line-${punch.id}`,
    sourceType: "punch",
    sourceId: punch.id,
    description,
    quantity: Number(punch.workedHours || 0),
    unit: "hour",
    rate: punch.workedHours > 0 ? Number(punch.amount || 0) / Number(punch.workedHours || 1) : Number(punch.amount || 0),
    total: Number(punch.amount || 0),
    taxable: true
  };
}

export function recalculateInvoice(invoice, taxes) {
  const totals = calculateInvoiceTotals({
    lines: invoice.lines || [],
    discountAmount: invoice.discountAmount || 0,
    advanceAmount: invoice.advanceAmount || 0,
    paidAmount: invoice.paidAmount || 0,
    taxes
  });

  return {
    ...invoice,
    totals,
    updatedAt: new Date().toISOString()
  };
}

export function buildInvoicesFromPunches({ punches = [], invoices = [], taxes = [] }) {
  let nextInvoices = [...invoices];
  const updatedPunches = punches.map((punch) => ({ ...punch }));

  updatedPunches.forEach((punch) => {
    if (punch.invoiceStatus && punch.invoiceStatus !== "not_invoiced") {
      return;
    }

    const groupKey = getInvoiceGroupKey(punch);
    const existingIndex = nextInvoices.findIndex(
      (invoice) => invoice.groupKey === groupKey && invoice.status === INVOICE_STATUSES.OPEN
    );

    const line = createInvoiceLineFromPunch(punch);

    if (existingIndex >= 0) {
      const existingInvoice = nextInvoices[existingIndex];
      const hasLine = (existingInvoice.lines || []).some((item) => item.sourceId === punch.id);

      if (!hasLine) {
        const updatedInvoice = recalculateInvoice(
          {
            ...existingInvoice,
            lines: [...(existingInvoice.lines || []), line]
          },
          taxes
        );

        nextInvoices[existingIndex] = updatedInvoice;
      }

      punch.invoiceStatus = "on_open_invoice";
      punch.linkedInvoiceId = existingInvoice.id;
      return;
    }

    const invoiceId = `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const invoice = recalculateInvoice(
      {
        id: invoiceId,
        invoiceNumber: `EPI-${new Date().getFullYear()}-${String(nextInvoices.length + 1).padStart(4, "0")}`,
        groupKey,
        status: INVOICE_STATUSES.OPEN,
        clientName: punch.clientName || "No client",
        jobAddress: punch.jobAddress || punch.jobName || "No address",
        currency: "CAD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lines: [line],
        discountAmount: 0,
        advanceAmount: 0,
        paidAmount: 0,
        notes: ""
      },
      taxes
    );

    nextInvoices = [invoice, ...nextInvoices];
    punch.invoiceStatus = "on_open_invoice";
    punch.linkedInvoiceId = invoiceId;
  });

  return {
    invoices: nextInvoices,
    punches: updatedPunches
  };
}
