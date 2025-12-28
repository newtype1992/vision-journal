type DateParts = {
  year: string;
  month: string;
  day: string;
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric"
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long"
});

export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
}

type DateKeyParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateKeyParts(dateKey: string): DateKeyParts | null {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

function getDateParts(date: Date, timeZone: string): DateParts {
  const parts = dateKeyFormatter
    .formatToParts(date)
    .map((part) => ({ ...part, value: part.value.trim() }))
    .filter((part) => part.type !== "literal");
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  const year = partMap.get("year");
  const month = partMap.get("month");
  const day = partMap.get("day");

  if (!year || !month || !day) {
    return { year: "1970", month: "01", day: "01" };
  }

  if (timeZone === getDeviceTimeZone()) {
    return { year, month, day };
  }

  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .formatToParts(date)
    .filter((part) => part.type !== "literal");
  const tzMap = new Map(tzParts.map((part) => [part.type, part.value]));

  return {
    year: tzMap.get("year") ?? year,
    month: tzMap.get("month") ?? month,
    day: tzMap.get("day") ?? day
  };
}

export function getDateKey(date: Date, timeZone: string) {
  const { year, month, day } = getDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

export function getTodayDateKey(timeZone: string) {
  return getDateKey(new Date(), timeZone);
}

export function formatMonthDay(date: Date, timeZone: string) {
  if (timeZone === getDeviceTimeZone()) {
    return monthDayFormatter.format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric"
  }).format(date);
}

export function formatWeekday(date: Date, timeZone: string) {
  if (timeZone === getDeviceTimeZone()) {
    return weekdayFormatter.format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long"
  }).format(date);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isFutureDate(date: Date, timeZone: string) {
  const todayKey = getDateKey(new Date(), timeZone);
  return getDateKey(date, timeZone) > todayKey;
}

export function parseDateKey(dateKey: string) {
  const parts = parseDateKeyParts(dateKey);
  if (!parts) return null;
  const candidate = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate;
}

export function compareDateKeys(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function dateKeyToDayIndex(dateKey: string) {
  const parts = parseDateKeyParts(dateKey);
  if (!parts) return null;
  const utcMs = Date.UTC(parts.year, parts.month - 1, parts.day);
  return Math.floor(utcMs / 86400000);
}

function dayIndexToDateKey(dayIndex: number) {
  const date = new Date(dayIndex * 86400000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const startIndex = dateKeyToDayIndex(dateKey);
  if (startIndex === null) return dateKey;
  return dayIndexToDateKey(startIndex + days);
}

export function diffDateKeysInclusive(startKey: string, endKey: string) {
  const startIndex = dateKeyToDayIndex(startKey);
  const endIndex = dateKeyToDayIndex(endKey);
  if (startIndex === null || endIndex === null) return 0;
  const diff = endIndex - startIndex + 1;
  return diff < 0 ? 0 : diff;
}

export function dateFromDateKey(dateKey: string, timeZone: string) {
  const base = parseDateKey(dateKey);
  if (!base) return null;
  const baseKey = getDateKey(base, timeZone);
  if (baseKey === dateKey) return base;
  const direction = baseKey < dateKey ? 1 : -1;
  const adjusted = new Date(base);
  adjusted.setDate(adjusted.getDate() + direction);
  return adjusted;
}

type MonthKeyParts = {
  year: number;
  month: number;
};

export function parseMonthKey(monthKey: string): MonthKeyParts | null {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  return { year, month };
}

export function getMonthKey(date: Date, timeZone: string) {
  return getDateKey(date, timeZone).slice(0, 7);
}

export function formatMonthLabel(monthKey: string, timeZone: string) {
  const parts = parseMonthKey(monthKey);
  if (!parts) return "Invalid month";
  const date = new Date(parts.year, parts.month - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    year: "numeric"
  }).format(date);
}

export function compareMonthKeys(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function addMonthsToMonthKey(monthKey: string, delta: number) {
  const parts = parseMonthKey(monthKey);
  if (!parts) return monthKey;
  const totalMonths = parts.year * 12 + (parts.month - 1) + delta;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  const monthValue = String(nextMonth).padStart(2, "0");
  return `${nextYear}-${monthValue}`;
}

export function getMonthRangeFromKey(monthKey: string) {
  const parts = parseMonthKey(monthKey);
  if (!parts) {
    return { startKey: "1970-01-01", endKey: "1970-01-01" };
  }
  const daysInMonth = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  const monthValue = String(parts.month).padStart(2, "0");
  const startKey = `${parts.year}-${monthValue}-01`;
  const endKey = `${parts.year}-${monthValue}-${String(daysInMonth).padStart(2, "0")}`;
  return { startKey, endKey };
}
