/**
 * Backend dates are ISO instants at UTC midnight of their intended calendar
 * day (see tricoach-backend/README.md — Postgres `@db.Date` truncates by
 * UTC day, so every date-only value in this app is anchored to UTC
 * midnight). Extracting the day via local getters would silently shift it
 * for any user west of UTC. Always go through `parseApiDate` first, which
 * returns a *local*-midnight Date for that same Y/M/D — safe to format,
 * compare, or group by day afterwards without further timezone shifting.
 */
export function parseApiDate(isoString: string): Date {
  const instant = new Date(isoString);
  return new Date(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate());
}

/** yyyy-MM-dd for a Date already in "local calendar day" form (e.g. from `parseApiDate` or `new Date()`) — the format every date-only API field expects (see PATCH /workouts/:id). */
export function toDayString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDayString(a) === toDayString(b);
}

/** Parses a `yyyy-MM-dd` string (from an `<input type="date">` or `toDayString`) into a local-midnight Date. */
export function fromDayString(dayString: string): Date {
  const [year, month, day] = dayString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Monday of the week containing `date` — the week-navigation anchor shared by WeeklyMenuPage and GroceryListPage. */
export function mondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(date);
  result.setDate(date.getDate() + diff);
  return result;
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(date.getDate() + amount);
  return result;
}
