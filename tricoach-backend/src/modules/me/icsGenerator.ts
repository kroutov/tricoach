export interface ICSWorkout {
  id: string;
  date: Date;
  title: string;
  summary: string;
  plannedDurationMin: number;
  estimatedTss: number | null;
}

function toICSDay(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toICSTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** RFC 5545 §3.1: lines SHOULD be folded at 75 octets, continuation lines start with a single space. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  chunks.push(rest);
  return chunks.join('\r\n');
}

/**
 * Workouts are published as all-day events (`VALUE=DATE`), not timed events —
 * unlike the iOS EventKit sync (which runs on-device and can use
 * `Calendar.current` to place a session at the athlete's preferred hour),
 * this feed is generated server-side with no known athlete timezone. A timed
 * UTC event would silently show at the wrong local hour for anyone outside
 * UTC; an all-day event unambiguously marks the correct training day for
 * every timezone, which is the property that actually matters here.
 */
export function generateWorkoutsICS(workouts: ICSWorkout[]): string {
  const dtstamp = toICSTimestamp(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TriCoach AI//Calendar Feed//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:TriCoach AI',
  ];

  for (const workout of workouts) {
    const descriptionParts = [workout.summary, `${workout.plannedDurationMin} min`];
    if (workout.estimatedTss) descriptionParts.push(`${Math.round(workout.estimatedTss)} TSS`);

    lines.push(
      'BEGIN:VEVENT',
      foldLine(`UID:${workout.id}@tricoach.ai`),
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toICSDay(workout.date)}`,
      `DTEND;VALUE=DATE:${toICSDay(addDays(workout.date, 1))}`,
      foldLine(`SUMMARY:${escapeICSText(workout.title)}`),
      foldLine(`DESCRIPTION:${escapeICSText(descriptionParts.join(' — '))}`),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
