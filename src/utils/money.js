export const DEFAULT_CURRENCY = "CAD";
export const DEFAULT_LOCALE = "fr-CA";

export function toNumber(value, fallbackValue = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallbackValue;
}

export function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency
    }).format(toNumber(value));
  } catch (error) {
    return `${currency} ${roundMoney(value).toFixed(2)}`;
  }
}

export function calculateBalance(total, paidAmount = 0) {
  return roundMoney(toNumber(total) - toNumber(paidAmount));
}
