/**
 * Normalizes a JS `Date` to UTC midnight of the same *local* calendar day.
 *
 * Prisma serializes `Date` objects for `@db.Date` columns using their UTC
 * components. A `Date` built via local-time arithmetic (e.g.
 * `date.setHours(0,0,0,0)`, as the plan engine does) represents *local*
 * midnight — which in any positive-UTC-offset timezone falls on the
 * *previous* UTC calendar day, silently shifting the stored date back by
 * one. Every write to a `@db.Date` column must go through this first.
 */
export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
