/** A date typed by hand; `monthOnly` when the package prints just a month, which means its last day. */
export type TypedDate = { iso: string; monthOnly: boolean };

const pad = (value: number) => String(value).padStart(2, "0");

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function fullYear(text: string): number {
  return text.length === 2 ? 2000 + Number(text) : Number(text);
}

function calendarDate(year: number, month: number, day: number): TypedDate | null {
  if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return null;
  return { iso: `${year}-${pad(month)}-${pad(day)}`, monthOnly: false };
}

function lastDayOf(year: number, month: number): TypedDate | null {
  if (month < 1 || month > 12) return null;
  return { iso: `${year}-${pad(month)}-${pad(daysIn(year, month))}`, monthOnly: true };
}

/** Without a year, the next time the day comes round: today counts, yesterday means next year. */
function nextOccurrence(month: number, day: number, today: string): TypedDate | null {
  const year = Number(today.slice(0, 4));
  const thisYear = calendarDate(year, month, day);
  if (thisYear && thisYear.iso >= today) return thisYear;
  return calendarDate(year + 1, month, day);
}

/**
 * Reads a date as printed on German packages, to type faster than a calendar picker allows.
 * `2803` and `28.03` are the next 28 March, `28.03.27` and `28032027` are exact, and `03.27`
 * or `03/2027` (a month and year, so a separator is required) is that month's last day.
 * Returns null for anything else, including days that do not exist. `today` is YYYY-MM-DD.
 */
export function parseTypedDate(text: string, today: string): TypedDate | null {
  const input = text.trim();
  if (!input) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return calendarDate(
      Number(input.slice(0, 4)),
      Number(input.slice(5, 7)),
      Number(input.slice(8)),
    );
  }

  if (/^\d+$/.test(input)) {
    if (input.length === 4)
      return nextOccurrence(Number(input.slice(2)), Number(input.slice(0, 2)), today);
    if (input.length === 6 || input.length === 8) {
      return calendarDate(
        fullYear(input.slice(4)),
        Number(input.slice(2, 4)),
        Number(input.slice(0, 2)),
      );
    }
    return null;
  }

  const parts = input.split(/[./\-\s]+/);
  if (parts.some((part) => !/^\d+$/.test(part))) return null;
  const [first, second, third] = parts;

  if (
    parts.length === 3 &&
    first!.length <= 2 &&
    second!.length <= 2 &&
    [2, 4].includes(third!.length)
  ) {
    return calendarDate(fullYear(third!), Number(second), Number(first));
  }
  if (parts.length === 2 && first!.length <= 2) {
    if (second!.length === 4) return lastDayOf(Number(second), Number(first));
    if (second!.length > 2) return null;
    // "10.12" is a day and month; "03.27" cannot be (no month 27), so it is a month and year.
    if (Number(second) <= 12) return nextOccurrence(Number(second), Number(first), today);
    return lastDayOf(fullYear(second!), Number(first));
  }
  return null;
}
