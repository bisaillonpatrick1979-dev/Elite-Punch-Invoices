export const DEFAULT_TIME_ZONE = "America/Edmonton";

export function getTodayISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function formatDate(value, locale = "fr-CA", timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit", timeZone }).format(new Date(value));
  } catch (error) {
    return String(value);
  }
}

export function formatTime(value, locale = "fr-CA", timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone }).format(new Date(value));
  } catch (error) {
    return String(value);
  }
}

export function secondsBetween(startValue, endValue) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

export function minutesBetween(startValue, endValue) {
  return Math.round(secondsBetween(startValue, endValue) / 60);
}

export function secondsToHours(seconds) {
  return Number(seconds || 0) / 3600;
}

export function secondsToClock(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function minutesToHours(minutes) {
  return Math.round((Number(minutes || 0) / 60) * 100) / 100;
}
