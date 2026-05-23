export const DEFAULT_KEY_VALUE = "0000";

export function cleanKey(value) {
  return String(value || "").trim();
}

export function matchKey(inputValue, savedValue) {
  return cleanKey(inputValue) === cleanKey(savedValue || DEFAULT_KEY_VALUE);
}
