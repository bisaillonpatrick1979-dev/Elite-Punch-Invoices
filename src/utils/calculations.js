import { roundMoney, toNumber } from "./money.js";
import { minutesToHours } from "./dates.js";

export const PAY_TYPES = {
  HOURLY: "hourly",
  SQUARE_FOOT: "squareFoot",
  FIXED: "fixed"
};

export const DEFAULT_TAX_PROFILE = {
  region: "Alberta",
  currency: "CAD",
  taxes: [
    {
      id: "gst",
      name: "GST",
      rate: 0.05,
      enabled: true
    }
  ]
};

export function calculatePunchAmount({
  payType,
  workedMinutes = 0,
  hourlyRate = 0,
  squareFeet = 0,
  squareFootRate = 0,
  fixedAmount = 0
}) {
  const hours = minutesToHours(workedMinutes);

  if (payType === PAY_TYPES.SQUARE_FOOT) {
    return roundMoney(toNumber(squareFeet) * toNumber(squareFootRate));
  }

  if (payType === PAY_TYPES.FIXED) {
    return roundMoney(fixedAmount);
  }

  return roundMoney(hours * toNumber(hourlyRate));
}

export function calculateEffectiveHourly(amount, workedMinutes = 0) {
  const hours = minutesToHours(workedMinutes);

  if (hours <= 0) {
    return 0;
  }

  return roundMoney(toNumber(amount) / hours);
}

export function calculateTaxAmount(subtotal, taxes = DEFAULT_TAX_PROFILE.taxes) {
  return roundMoney(
    taxes
      .filter((tax) => tax.enabled)
      .reduce((total, tax) => total + toNumber(subtotal) * toNumber(tax.rate), 0)
  );
}

export function calculateInvoiceTotals({
  lines = [],
  discountAmount = 0,
  advanceAmount = 0,
  paidAmount = 0,
  taxes = DEFAULT_TAX_PROFILE.taxes
}) {
  const subtotal = roundMoney(
    lines.reduce((total, line) => total + toNumber(line.total), 0)
  );
  const discount = roundMoney(discountAmount);
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = calculateTaxAmount(taxableSubtotal, taxes);
  const total = roundMoney(taxableSubtotal + taxAmount - toNumber(advanceAmount));
  const balanceDue = roundMoney(total - toNumber(paidAmount));

  return {
    subtotal,
    discount,
    taxAmount,
    total,
    paidAmount: roundMoney(paidAmount),
    balanceDue
  };
}
