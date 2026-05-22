export const DEFAULT_TIME_ZONE = "America/Edmonton";

export function getTodayISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function formatDate(value, locale = "fr-CA", timeZone = DEFAULT_TIME_ZONE) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone
    }).format(new Date(value));
  } catch (error) {
    return String(value);
  }
}

export function formatTime(value, locale = "fr-CA", timeZone = DEFAULT_TIME_ZONE) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone
    }).format(new Date(value));
  } catch (error) {
    return String(value);
  }
}

export function minutesBetween(startValue, endValue) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.round((end - start) / 60000);
}

export function minutesToHours(minutes) {
  return Math.round((Number(minutes || 0) / 60) * 100) / 100;
}
