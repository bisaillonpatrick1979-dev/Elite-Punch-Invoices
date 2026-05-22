const APP_PREFIX = "elitePunchInvoice";

export function getStorageKey(key) {
  return `${APP_PREFIX}:${key}`;
}

export function readLocalValue(key, fallbackValue = null) {
  try {
    const rawValue = window.localStorage.getItem(getStorageKey(key));

    if (!rawValue) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    console.warn(`Unable to read local value for ${key}`, error);
    return fallbackValue;
  }
}

export function writeLocalValue(key, value) {
  try {
    window.localStorage.setItem(getStorageKey(key), JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Unable to write local value for ${key}`, error);
    return false;
  }
}

export function removeLocalValue(key) {
  try {
    window.localStorage.removeItem(getStorageKey(key));
    return true;
  } catch (error) {
    console.warn(`Unable to remove local value for ${key}`, error);
    return false;
  }
}
