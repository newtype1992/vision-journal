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
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const candidate = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate;
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
