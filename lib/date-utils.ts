import { de } from "date-fns/locale";
import {
  differenceInCalendarDays,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  parseISO,
} from "date-fns";

export const WEEKDAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function formatWeekday(date: Date) {
  return format(date, "EEEE", { locale: de });
}

export function formatLongDate(date: Date) {
  return format(date, "EEEE, d. MMMM", { locale: de });
}

/** Same as formatLongDate plus the year — for contexts like the event
 * detail view where the date needs to stand fully on its own. */
export function formatFullDate(date: Date) {
  return format(date, "EEEE, d. MMMM yyyy", { locale: de });
}

export function formatShortDate(date: Date) {
  return format(date, "d. MMM", { locale: de });
}

export function formatMonthYear(date: Date) {
  return format(date, "MMMM yyyy", { locale: de });
}

export function formatDayNumber(date: Date) {
  return format(date, "dd");
}

export function toISODate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function fromISODate(iso: string) {
  return parseISO(iso);
}

export function relativeDayLabel(date: Date) {
  if (isToday(date)) return "Heute";
  if (isTomorrow(date)) return "Morgen";
  return format(date, "EEEE", { locale: de });
}

/** Lowercase, mid-sentence variant of relativeDayLabel — for reminder/
 * notification copy like "Höhenplan bereitlegen (morgen)." */
export function relativeDayPhrase(date: Date) {
  if (isToday(date)) return "heute";
  if (isTomorrow(date)) return "morgen";
  const diff = differenceInCalendarDays(date, new Date());
  if (diff > 1 && diff < 7) return `am ${format(date, "EEEE", { locale: de })}`;
  return `am ${format(date, "d. MMMM", { locale: de })}`;
}

/** "vor 5 Min.", "gestern", "vor 3 Tagen" — for feeds where a full date
 * would be more precision than the reader needs (notifications, activity). */
export function relativeTimeFromNow(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  return format(new Date(iso), "d. MMM", { locale: de });
}

const BERLIN_TZ = "Europe/Berlin";

/** Current date/time as seen in Europe/Berlin, independent of the device's
 * own timezone/locale — the daily briefing's "new calendar day" boundary
 * and time-of-day greeting must always use this, never local time, so two
 * phones in different timezones (or a server render) agree on what "today"
 * and "07:00" mean. `hourCycle: "h23"` sidesteps the well-known ICU quirk
 * where `hour12: false` alone can render midnight as "24" instead of "00". */
export function getBerlinParts(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const weekday = get("weekday");
  return {
    isoDate: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    isWeekday: weekday !== "Sat" && weekday !== "Sun",
  };
}

/** yyyy-MM-dd for "today" in Europe/Berlin — the calendar-day boundary the
 * daily briefing's once-per-day gate and date-based comparisons key off. */
export function todayISOInBerlin(date: Date = new Date()) {
  return getBerlinParts(date).isoDate;
}

export { isSameDay, isToday, isTomorrow };
