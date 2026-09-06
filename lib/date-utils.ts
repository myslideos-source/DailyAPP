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

export { isSameDay, isToday, isTomorrow };
