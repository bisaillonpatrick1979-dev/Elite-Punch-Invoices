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

export function calculateDiscountAmount(subtotal, { enabled = false, type = "amount", value = 0 } = {}) {
  if (!enabled) {
    return 0;
  }

  if (type === "percent") {
    return roundMoney(toNumber(subtotal) * (toNumber(value) / 100));
  }

  return roundMoney(value);
}

export function calculateTaxAmount(subtotal, taxes = DEFAULT_TAX_PROFILE.taxes, taxEnabled = true) {
  if (!taxEnabled) {
    return 0;
  }

  return roundMoney(
    taxes
      .filter((tax) => tax.enabled)
      .reduce((total, tax) => total + toNumber(subtotal) * toNumber(tax.rate), 0)
  );
}

function getTaxableSubtotal(lines = [], safeDiscount = 0, subtotal = 0) {
  const taxableBeforeDiscount = roundMoney(
    lines
      .filter((line) => line.taxable !== false)
      .reduce((total, line) => total + toNumber(line.total), 0)
  );

  if (subtotal <= 0 || safeDiscount <= 0) {
    return taxableBeforeDiscount;
  }

  const discountRatio = safeDiscount / subtotal;
  return Math.max(0, roundMoney(taxableBeforeDiscount - taxableBeforeDiscount * discountRatio));
}

export function calculateInvoiceTotals({
  lines = [],
  discountAmount = 0,
  discountEnabled = false,
  discountType = "amount",
  discountValue = 0,
  advanceAmount = 0,
  advanceEnabled = false,
  paidAmount = 0,
  taxEnabled = true,
  taxes = DEFAULT_TAX_PROFILE.taxes
}) {
  const subtotal = roundMoney(lines.reduce((total, line) => total + toNumber(line.total), 0));
  const discount = discountEnabled
    ? calculateDiscountAmount(subtotal, { enabled: true, type: discountType, value: discountValue })
    : roundMoney(discountAmount);
  const safeDiscount = discountEnabled || discountAmount ? Math.min(subtotal, discount) : 0;
  const taxableSubtotal = getTaxableSubtotal(lines, safeDiscount, subtotal);
  const taxAmount = calculateTaxAmount(taxableSubtotal, taxes, taxEnabled);
  const advance = advanceEnabled ? roundMoney(advanceAmount) : 0;
  const total = roundMoney(Math.max(0, subtotal - safeDiscount) + taxAmount - advance);
  const balanceDue = roundMoney(total - toNumber(paidAmount));

  return {
    subtotal,
    discount: safeDiscount,
    taxAmount,
    advance,
    total,
    paidAmount: roundMoney(paidAmount),
    balanceDue
  };
}
