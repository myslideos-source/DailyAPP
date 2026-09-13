// The daily briefing — a per-person summary of "what matters today",
// computed entirely from local data (no external/AI calls on every open,
// per spec). Text comes from small, hand-written phrase pools so re-opening
// the briefing on different days doesn't always read identically, while
// staying stable (same wording) across repeated renders on the same day.
import { addDays, addYears, format } from "date-fns";
import { de } from "date-fns/locale";
import { expandEventOccurrences, expandEventsForDay } from "@/lib/recurrence";
import { fromISODate, getBerlinParts, relativeDayLabel, relativeDayPhrase } from "@/lib/date-utils";
import { PROFILES } from "@/lib/demo-data";
import type { Assignee, CalendarEvent, PersonId, TaskItem } from "@/lib/types";

// The one system category the briefing gives special weight to. Tasks have
// no `category` field of their own (see lib/types.ts), so a "Hausbau-
// Aufgabe" can only be identified structurally — via `linkedEventId`
// pointing at a Hausbau-categorized event — never by guessing at a task's
// title. A standalone task like "Zisterne bezahlen" that isn't linked to
// an event is treated as a plain task; there's no reliable, honest way to
// classify it as Hausbau-related without that link or a schema change.
const HAUSBAU_CATEGORY_KEY = "hausbau";

export type BriefingIcon = "calendar" | "tasks" | "hausbau";

export interface BriefingHighlight {
  icon: BriefingIcon;
  text: string;
}

export interface DailyBriefingData {
  greetingWord: string;
  name: string;
  dateLabel: string;
  /** 1–2 natural-language sentences, most important state first. */
  summaryLines: string[];
  /** Up to 3 lines, already priority-sorted and de-duplicated. */
  highlights: BriefingHighlight[];
  /** The single most relevant event to deep-link "Tag ansehen" /
   * notification taps to — currently running, else next today, else the
   * next upcoming occurrence on a later day. Null when nothing is ahead. */
  nextEvent: CalendarEvent | null;
  eventsTodayCount: number;
  /** Overdue + due-today, not-yet-done tasks — the "for today" bucket the
   * summary sentence quotes (mirrors app/aufgaben/page.tsx's own
   * due-today-or-earlier grouping), not every open task regardless of due
   * date. */
  openTasksCount: number;
  /** The overdue+due-today tasks themselves, overdue first — same set
   * `openTasksCount` counts. Exposed for the widget snapshot (spec §11
   * needs up to 3 actual tasks, not just a count); the in-app briefing
   * card only ever uses the count. */
  openTaskItems: TaskItem[];
}

export interface ComputeBriefingParams {
  events: CalendarEvent[];
  tasks: TaskItem[];
  personId: PersonId;
  now?: Date;
  /** From UserPreferences.dailyBriefing — gates "gemeinsam"-assigned items. */
  includeShared?: boolean;
  /** Gates the person's own-assignee items. The partner's purely personal
   * items are never included (there's no "view partner's private stuff"
   * setting) — only "mine" and "ours", matching the two toggles this app
   * actually exposes. */
  includePersonal?: boolean;
}

function pick<T>(pool: T[], seedKey: string): T {
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

export function greetingWordForHour(hour: number): string {
  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 17) return "Hallo";
  if (hour >= 17 && hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

function isRelevant(assignee: Assignee, personId: PersonId, includeShared: boolean, includePersonal: boolean) {
  if (assignee === "gemeinsam") return includeShared;
  if (assignee === personId) return includePersonal;
  return false;
}

/** "TITLE · HH:mm–HH:mm Uhr" for a highlight line — a time range when both
 * ends are known, a single time, or "ganztägig" for all-day events. */
function timeRangePhrase(event: CalendarEvent): string {
  if (event.allDay) return "ganztägig";
  if (event.startTime && event.endTime) return `${event.startTime}–${event.endTime} Uhr`;
  if (event.startTime) return `${event.startTime} Uhr`;
  return "";
}

/** "um HH:mm Uhr" / "(ganztägig)" for mid-sentence use. */
function startPhrase(event: CalendarEvent): string {
  if (event.allDay) return "(ganztägig)";
  if (event.startTime) return `um ${event.startTime} Uhr`;
  return "";
}

export function computeDailyBriefing({
  events,
  tasks,
  personId,
  now = new Date(),
  includeShared = true,
  includePersonal = true,
}: ComputeBriefingParams): DailyBriefingData {
  const { isoDate: todayISO, hour, minute } = getBerlinParts(now);
  const nowHHmm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const name = PROFILES[personId].name;
  const greetingWord = greetingWordForHour(hour);
  const dateLabel = format(fromISODate(todayISO), "EEEE, d. MMMM", { locale: de });

  const relevantEvents = events.filter((e) => isRelevant(e.assignee, personId, includeShared, includePersonal));
  // Done tasks are dropped up front — "erledigte Aufgaben" are explicitly
  // out of scope for the briefing (spec §7).
  const relevantTasks = tasks.filter(
    (t) => !t.done && isRelevant(t.assignee, personId, includeShared, includePersonal),
  );

  const dayEvents = expandEventsForDay(relevantEvents, todayISO).sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });

  const timedToday = dayEvents.filter((e): e is CalendarEvent & { startTime: string } => !e.allDay && Boolean(e.startTime));
  const currentEvent =
    timedToday.find((e) => e.startTime <= nowHHmm && (!e.endTime || e.endTime > nowHHmm)) ?? null;
  const upcomingToday = timedToday.filter((e) => e !== currentEvent && e.startTime > nowHHmm);
  const allDayToday = dayEvents.filter((e) => e.allDay);
  const nextEventToday = upcomingToday[0] ?? (currentEvent ? null : (allDayToday[0] ?? null));

  const overdueTasks = relevantTasks.filter((t) => t.dueDate && t.dueDate < todayISO);
  const todayTasks = relevantTasks.filter((t) => t.dueDate === todayISO);
  const openTasksCount = overdueTasks.length + todayTasks.length;

  const sharedEventToday = dayEvents.find((e) => e.assignee === "gemeinsam") ?? null;

  const hausbauEventToday = dayEvents.find((e) => e.category === HAUSBAU_CATEGORY_KEY) ?? null;
  const hausbauTask =
    relevantTasks.find((t) => {
      if (!t.linkedEventId) return false;
      const linked = events.find((e) => e.id === t.linkedEventId);
      return linked?.category === HAUSBAU_CATEGORY_KEY;
    }) ?? null;

  let nextUpcomingEvent: CalendarEvent | null = null;
  if (dayEvents.length === 0) {
    const tomorrowISO = format(addDays(fromISODate(todayISO), 1), "yyyy-MM-dd");
    const farFutureISO = format(addYears(now, 2), "yyyy-MM-dd");
    const upcoming = expandEventOccurrences(relevantEvents, tomorrowISO, farFutureISO).sort((a, b) =>
      a.date === b.date ? (a.startTime ?? "").localeCompare(b.startTime ?? "") : a.date.localeCompare(b.date),
    );
    nextUpcomingEvent = upcoming[0] ?? null;
  }

  const nothingToday = dayEvents.length === 0;
  const allDone = !nothingToday && !currentEvent && !nextEventToday && openTasksCount === 0;

  // --- highlights: up to 3, strict priority order per spec §4 ---
  const highlights: BriefingHighlight[] = [];
  const usedEventIds = new Set<string>();

  function pushEventHighlight(event: CalendarEvent) {
    if (highlights.length >= 3 || usedEventIds.has(event.id)) return;
    usedEventIds.add(event.id);
    highlights.push({ icon: "calendar", text: `${event.title} · ${timeRangePhrase(event)}` });
  }

  if (currentEvent) pushEventHighlight(currentEvent);
  if (highlights.length < 3 && nextEventToday) pushEventHighlight(nextEventToday);

  if (highlights.length < 3 && overdueTasks.length > 0) {
    highlights.push({
      icon: "tasks",
      text: overdueTasks.length === 1 ? `Überfällig: „${overdueTasks[0].title}“` : `${overdueTasks.length} Aufgaben überfällig`,
    });
  } else if (highlights.length < 3 && todayTasks.length > 0) {
    highlights.push({
      icon: "tasks",
      text: todayTasks.length === 1 ? todayTasks[0].title : `${todayTasks.length} Aufgaben offen`,
    });
  }

  if (highlights.length < 3 && sharedEventToday) pushEventHighlight(sharedEventToday);

  if (highlights.length < 3 && (hausbauEventToday || hausbauTask)) {
    if (hausbauEventToday && !usedEventIds.has(hausbauEventToday.id)) {
      usedEventIds.add(hausbauEventToday.id);
      highlights.push({ icon: "hausbau", text: `${hausbauEventToday.title} · ${timeRangePhrase(hausbauEventToday)}` });
    } else if (!hausbauEventToday && hausbauTask) {
      highlights.push({ icon: "hausbau", text: hausbauTask.title });
    }
  }

  if (highlights.length < 3 && nextUpcomingEvent) {
    highlights.push({
      icon: "calendar",
      text: `${relativeDayLabel(fromISODate(nextUpcomingEvent.date))} · ${timeRangePhrase(nextUpcomingEvent)} — ${nextUpcomingEvent.title}`,
    });
  }

  const summaryLines = buildSummaryLines({
    todayISO,
    personId,
    hour,
    eventsTodayCount: dayEvents.length,
    openTasksCount,
    currentEvent,
    nextEventToday,
    nextUpcomingEvent,
    nothingToday,
    allDone,
  });

  return {
    greetingWord,
    name,
    dateLabel,
    summaryLines,
    highlights,
    nextEvent: currentEvent ?? nextEventToday ?? nextUpcomingEvent,
    eventsTodayCount: dayEvents.length,
    openTasksCount,
    openTaskItems: [...overdueTasks, ...todayTasks],
  };
}

interface SummaryContext {
  todayISO: string;
  personId: PersonId;
  hour: number;
  eventsTodayCount: number;
  openTasksCount: number;
  currentEvent: CalendarEvent | null;
  nextEventToday: CalendarEvent | null;
  nextUpcomingEvent: CalendarEvent | null;
  nothingToday: boolean;
  allDone: boolean;
}

function buildSummaryLines(ctx: SummaryContext): string[] {
  const seed = `${ctx.todayISO}-${ctx.personId}`;

  if (ctx.currentEvent) {
    return [
      pick(
        [
          `Gerade läuft: ${ctx.currentEvent.title}.`,
          `Ihr steckt gerade mitten in „${ctx.currentEvent.title}“.`,
        ],
        `${seed}-current`,
      ),
    ];
  }

  if (ctx.nothingToday && ctx.openTasksCount === 0 && !ctx.nextUpcomingEvent) {
    return pick(
      [
        ["Heute bleibt es ruhig.", "Ihr habt keine offenen Termine oder dringenden Aufgaben."],
        ["Ein ruhiger Tag liegt vor euch.", "Nichts Dringendes steht an."],
      ],
      `${seed}-empty`,
    );
  }

  if (ctx.nothingToday && ctx.openTasksCount === 0 && ctx.nextUpcomingEvent) {
    const when = relativeDayPhrase(fromISODate(ctx.nextUpcomingEvent.date));
    return [
      pick(["Heute ist nichts fest geplant.", "Für heute steht nichts Festes an."], `${seed}-none-lead`),
      `Euer nächster Termin ist ${when} ${startPhrase(ctx.nextUpcomingEvent)}.`.replace(/\s+/g, " "),
    ];
  }

  if (ctx.nothingToday && ctx.openTasksCount > 0) {
    const taskWord = ctx.openTasksCount === 1 ? "1 offene Aufgabe" : `${ctx.openTasksCount} offene Aufgaben`;
    const waitVerb = ctx.openTasksCount === 1 ? "wartet" : "warten";
    const lines = [
      pick(
        [`Heute steht kein Termin an, aber ${taskWord} ${waitVerb}.`, `Kein Termin heute — dafür ${taskWord} auf eurer Liste.`],
        `${seed}-tasks-only`,
      ),
    ];
    if (ctx.nextUpcomingEvent) {
      const when = relativeDayPhrase(fromISODate(ctx.nextUpcomingEvent.date));
      lines.push(`Der nächste Termin ist ${when} ${startPhrase(ctx.nextUpcomingEvent)}.`.replace(/\s+/g, " "));
    }
    return lines;
  }

  if (ctx.allDone) {
    return pick(
      ctx.hour >= 17
        ? [
            ["Für heute ist alles erledigt.", "Genießt euren Abend."],
            ["Alles im grünen Bereich.", "Der Rest des Tages gehört euch."],
          ]
        : [
            ["Für heute ist schon alles erledigt.", "Der Tag gehört jetzt euch."],
            ["Ihr seid für heute durch.", "Nichts Offenes mehr auf der Liste."],
          ],
      `${seed}-done`,
    );
  }

  const eventWord = ctx.eventsTodayCount === 1 ? "1 Termin" : `${ctx.eventsTodayCount} Termine`;
  const taskWord = ctx.openTasksCount === 1 ? "1 offene Aufgabe" : `${ctx.openTasksCount} offene Aufgaben`;
  const lines = [
    pick(
      [`Heute habt ihr ${eventWord} und ${taskWord}.`, `Für heute stehen ${eventWord} und ${taskWord} an.`],
      `${seed}-stat`,
    ),
  ];
  if (ctx.nextEventToday) {
    lines.push(
      pick(
        [
          `Als Nächstes: ${ctx.nextEventToday.title} ${startPhrase(ctx.nextEventToday)}.`,
          `Weiter geht's mit ${ctx.nextEventToday.title} ${startPhrase(ctx.nextEventToday)}.`,
        ],
        `${seed}-next`,
      ).replace(/\s+/g, " "),
    );
  }
  return lines;
}
