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
  const worker = punch.workerId || "owner";
  const client = punch.clientName || "No client";
  const address = punch.jobAddress || punch.jobName || "No address";
  return `${worker}|${client.trim().toLowerCase()}|${address.trim().toLowerCase()}`;
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
    discountEnabled: invoice.discountEnabled || false,
    discountType: invoice.discountType || "amount",
    discountValue: invoice.discountValue || 0,
    advanceAmount: invoice.advanceAmount || 0,
    advanceEnabled: invoice.advanceEnabled || false,
    paidAmount: invoice.paidAmount || 0,
    taxEnabled: invoice.taxEnabled !== false,
    taxes
  });

  return { ...invoice, totals, updatedAt: new Date().toISOString() };
}

function applyPunchClientInfo(invoice, punch) {
  return {
    ...invoice,
    clientId: invoice.clientId || punch.clientId || "",
    clientName: invoice.clientName || punch.clientName || "No client",
    clientPhone: invoice.clientPhone || punch.clientPhone || "",
    clientEmail: invoice.clientEmail || punch.clientEmail || "",
    jobAddress: invoice.jobAddress || punch.jobAddress || punch.jobName || "No address"
  };
}

function findWorker(workers = [], workerId = "owner") {
  return workers.find((worker) => worker.id === workerId) || workers.find((worker) => worker.id === "owner") || workers[0] || null;
}

function makeWorkerInvoiceNumber(worker, invoices = []) {
  const prefix = worker?.invoicePrefix || "WRK";
  const manualNext = Number(worker?.nextInvoiceNumber || 1);
  const count = invoices.filter((invoice) => invoice.workerId === worker?.id).length;
  const next = Math.max(manualNext, count + 1);
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

export function buildInvoicesFromPunches({ punches = [], invoices = [], taxes = [], workers = [] }) {
  let nextInvoices = [...invoices];
  const updatedPunches = punches.map((punch) => ({ ...punch }));

  updatedPunches.forEach((punch) => {
    if (punch.invoiceStatus && punch.invoiceStatus !== "not_invoiced") return;

    const worker = findWorker(workers, punch.workerId);
    const groupKey = getInvoiceGroupKey(punch);
    const existingIndex = nextInvoices.findIndex((invoice) => invoice.groupKey === groupKey && invoice.status === INVOICE_STATUSES.OPEN);
    const line = createInvoiceLineFromPunch(punch);

    if (existingIndex >= 0) {
      const existingInvoice = applyPunchClientInfo(nextInvoices[existingIndex], punch);
      const hasLine = (existingInvoice.lines || []).some((item) => item.sourceId === punch.id);

      if (!hasLine) {
        nextInvoices[existingIndex] = recalculateInvoice({ ...existingInvoice, lines: [...(existingInvoice.lines || []), line] }, taxes);
      }

      punch.invoiceStatus = "on_open_invoice";
      punch.linkedInvoiceId = existingInvoice.id;
      return;
    }

    const invoiceId = `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const invoice = recalculateInvoice(
      {
        id: invoiceId,
        invoiceNumber: makeWorkerInvoiceNumber(worker, nextInvoices),
        groupKey,
        status: INVOICE_STATUSES.OPEN,
        workerId: punch.workerId || "owner",
        workerName: punch.workerName || worker?.name || "Worker",
        workerSignatureDataUrl: worker?.signatureDataUrl || "",
        workerSignatureDate: worker?.signatureDate || "",
        workerWatermarkName: punch.workerName || worker?.name || "Worker",
        clientId: punch.clientId || "",
        clientName: punch.clientName || "No client",
        clientPhone: punch.clientPhone || "",
        clientEmail: punch.clientEmail || "",
        jobAddress: punch.jobAddress || punch.jobName || "No address",
        currency: "CAD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lines: [line],
        taxEnabled: true,
        discountEnabled: false,
        discountType: "amount",
        discountValue: 0,
        discountAmount: 0,
        advanceEnabled: false,
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

  return { invoices: nextInvoices, punches: updatedPunches };
}
