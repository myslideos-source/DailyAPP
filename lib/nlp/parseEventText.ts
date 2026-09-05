// Local, offline German quick-add parser.
//
// dayli has no AI/LLM service configured (no app/api route, no API key) —
// see AGENTS.md-adjacent research notes in this repo's history. Rather than
// require one, "Schnell eintragen" is powered entirely by this rule-based
// extractor, which turns a free-form German sentence into a structured,
// *always user-reviewed* draft (see components/sheets/QuickAddPreviewSheet).
// It never invents information: anything it can't determine confidently is
// left null/default and flagged via a `*Certain: false` + a clarifying
// question, which the preview screen must surface before saving anything.
//
// If a real AI/NLU service is added later, it should implement the same
// `ParsedEventDraft` shape so the preview screen and save flow don't change
// — see `parseEventTextLocally` as the reference implementation to swap or
// wrap.

import { addDays, nextDay, type Day } from "date-fns";
import { toISODate } from "@/lib/date-utils";
import type { Assignee, EventCategory } from "@/lib/types";

export interface ParsedEventDraft {
  rawText: string;

  title: string;
  titleCertain: boolean;
  titleQuestion?: string;

  date: string | null; // ISO yyyy-MM-dd
  dateCertain: boolean;
  dateQuestion?: string;

  allDay: boolean;
  startTime: string | null; // HH:mm
  startTimeCertain: boolean;
  endTime: string | null;

  location: string | null;
  locationCertain: boolean;

  category: EventCategory;
  categoryCertain: boolean;

  assignee: Assignee;
  assigneeCertain: boolean;
  assigneeQuestion?: string;

  /** Minutes before the event start the reminder should fire, if detected. */
  reminderMinutesBefore: number | null;
  /** Who explicitly asked to be reminded ("Elisabeth erinnern"), if anyone —
   * distinct from `assignee` (who the event itself is for/with). */
  reminderFor: Assignee | null;

  notes: string | null;

  /** Detected prep-task phrases ("Unterlagen bereitlegen"), each becoming a
   * checklist item linked to the event once saved. */
  prepTasks: string[];
}

const WEEKDAYS: { name: string; day: Day }[] = [
  { name: "sonntag", day: 0 },
  { name: "montag", day: 1 },
  { name: "dienstag", day: 2 },
  { name: "mittwoch", day: 3 },
  { name: "donnerstag", day: 4 },
  { name: "freitag", day: 5 },
  { name: "samstag", day: 6 },
];

const NUMBER_WORDS: Record<string, number> = {
  ein: 1,
  eins: 1,
  einem: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  fünf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  elf: 11,
  zwölf: 12,
};

const CATEGORY_KEYWORDS: { category: EventCategory; keywords: string[] }[] = [
  { category: "hausbau", keywords: ["tiefbauer", "baustelle", "bauleiter", "handwerker", "bemusterung", "grundstück", "fliesenleger", "notartermin", "höhenplan", "rohbau", "hausbau"] },
  { category: "gesundheit", keywords: ["arzt", "ärztin", "zahnarzt", "kontrolle", "termin beim", "praxis", "tierarzt", "impfung"] },
  { category: "kinder", keywords: ["schule", "kindergarten", "elternabend", "kita", "mia", "spielplatz"] },
  { category: "arbeit", keywords: ["meeting", "büro", "kunde", "projekt", "call", "teammeeting", "besprechung"] },
  { category: "einkauf", keywords: ["einkaufen", "einkauf", "supermarkt", "besorgen"] },
  { category: "freizeit", keywords: ["wanderung", "kino", "restaurant", "sport", "yoga", "ausflug"] },
  { category: "geburtstag", keywords: ["geburtstag"] },
];

const TASK_VERBS = [
  "bereitlegen",
  "anrufen",
  "notieren",
  "machen",
  "mitbringen",
  "abholen",
  "buchen",
  "bezahlen",
  "vorbereiten",
  "besorgen",
  "ausdrucken",
  "unterschreiben",
  "einpacken",
  "öffnen",
];

const REMINDER_PHRASES: { pattern: RegExp; minutes: number }[] = [
  { pattern: /eine\s+woche\s+vorher/i, minutes: 7 * 1440 },
  { pattern: /(\d+)\s*wochen?\s+vorher/i, minutes: 0 }, // minutes computed dynamically below
  { pattern: /drei\s+tage\s+vorher/i, minutes: 3 * 1440 },
  { pattern: /zwei\s+tage\s+vorher/i, minutes: 2 * 1440 },
  { pattern: /einen?\s+tag\s+vorher/i, minutes: 1440 },
  { pattern: /(\d+)\s*tage?\s+vorher/i, minutes: 0 },
  { pattern: /am\s+selben\s+morgen/i, minutes: 180 },
  { pattern: /(\d+)\s*minuten?\s+vorher/i, minutes: 0 },
  { pattern: /(\d+)\s*stunden?\s+vorher/i, minutes: 0 },
];

function stripDiacriticsLower(s: string) {
  return s.toLowerCase();
}

function findAssignees(text: string): Assignee[] {
  const found: Assignee[] = [];
  if (/domenico/i.test(text)) found.push("domenico");
  if (/elisabeth/i.test(text)) found.push("elisabeth");
  return found;
}

function parseDate(text: string, now: Date): { date: string | null; certain: boolean; rest: string; question?: string } {
  let rest = text;

  if (/\bheute\b/i.test(rest)) {
    rest = rest.replace(/\bheute\b/i, " ").replace(/\s+/g, " ").trim();
    return { date: toISODate(now), certain: true, rest };
  }
  if (/\bübermorgen\b/i.test(rest)) {
    rest = rest.replace(/\bübermorgen\b/i, " ").replace(/\s+/g, " ").trim();
    return { date: toISODate(addDays(now, 2)), certain: true, rest };
  }
  if (/\bmorgen\b/i.test(rest)) {
    rest = rest.replace(/\bmorgen\b/i, " ").replace(/\s+/g, " ").trim();
    return { date: toISODate(addDays(now, 1)), certain: true, rest };
  }

  // Explicit dd.mm. or dd.mm.yyyy
  const explicit = rest.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?\b/);
  if (explicit) {
    const day = Number(explicit[1]);
    const month = Number(explicit[2]) - 1;
    const year = explicit[3] ? (explicit[3].length === 2 ? 2000 + Number(explicit[3]) : Number(explicit[3])) : now.getFullYear();
    const d = new Date(year, month, day);
    rest = (rest.slice(0, explicit.index) + " " + rest.slice((explicit.index ?? 0) + explicit[0].length)).replace(/\s+/g, " ").trim();
    return { date: toISODate(d), certain: true, rest };
  }

  // "nächsten Freitag" / "kommenden Freitag" / bare "Freitag"
  for (const { name, day } of WEEKDAYS) {
    const nextPattern = new RegExp(`\\b(nächsten|nächste|kommenden|kommende)\\s+${name}\\b`, "i");
    const nextMatch = rest.match(nextPattern);
    if (nextMatch) {
      const d = nextDay(now, day); // date-fns nextDay always returns a date strictly after `now`
      rest = (rest.slice(0, nextMatch.index) + " " + rest.slice((nextMatch.index ?? 0) + nextMatch[0].length)).replace(/\s+/g, " ").trim();
      return { date: toISODate(d), certain: true, rest };
    }
    const barePattern = new RegExp(`\\b(am\\s+)?${name}\\b`, "i");
    const bareMatch = rest.match(barePattern);
    if (bareMatch) {
      const d = nextDay(now, day);
      rest = (rest.slice(0, bareMatch.index) + " " + rest.slice((bareMatch.index ?? 0) + bareMatch[0].length)).replace(/\s+/g, " ").trim();
      // A bare weekday name is common and usually means "the next one" —
      // treated as certain, matching the spec's own example ("Freitag um
      // 9 Uhr" -> nächster Freitag), but still editable in the preview.
      return { date: toISODate(d), certain: true, rest };
    }
  }

  return { date: null, certain: false, rest, question: "Welches Datum meinst du?" };
}

function parseTime(text: string): { time: string | null; certain: boolean; rest: string } {
  let rest = text;

  // HH:MM (Uhr)?
  const hhmm = rest.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*(uhr)?\b/i);
  if (hhmm) {
    const h = hhmm[1].padStart(2, "0");
    rest = (rest.slice(0, hhmm.index) + " " + rest.slice((hhmm.index ?? 0) + hhmm[0].length)).replace(/\s+/g, " ").trim();
    return { time: `${h}:${hhmm[2]}`, certain: true, rest };
  }

  // "halb <wort>" -> 30 min before that hour
  const halb = rest.match(/\bhalb\s+(\w+)\b/i);
  if (halb) {
    const word = halb[1].toLowerCase();
    const n = NUMBER_WORDS[word] ?? (Number.isFinite(Number(word)) ? Number(word) : null);
    if (n !== null) {
      const hour = ((n - 1 + 24) % 24).toString().padStart(2, "0");
      rest = (rest.slice(0, halb.index) + " " + rest.slice((halb.index ?? 0) + halb[0].length)).replace(/\s+/g, " ").trim();
      return { time: `${hour}:30`, certain: true, rest };
    }
  }

  // "um <wort|zahl>( Uhr)?"
  const um = rest.match(/\bum\s+(\d{1,2}|\w+)(\s*uhr)?\b/i);
  if (um) {
    const word = um[1].toLowerCase();
    const n = NUMBER_WORDS[word] ?? (Number.isFinite(Number(word)) ? Number(word) : null);
    if (n !== null && n >= 0 && n <= 23) {
      const hour = n.toString().padStart(2, "0");
      rest = (rest.slice(0, um.index) + " " + rest.slice((um.index ?? 0) + um[0].length)).replace(/\s+/g, " ").trim();
      return { time: `${hour}:00`, certain: true, rest };
    }
  }

  return { time: null, certain: false, rest };
}

function parseReminder(text: string): { minutes: number | null; rest: string } {
  let rest = text;
  for (const { pattern, minutes } of REMINDER_PHRASES) {
    const m = rest.match(pattern);
    if (!m) continue;
    let value = minutes;
    if (value === 0 && m[1]) {
      const n = Number(m[1]);
      if (/minute/i.test(m[0])) value = n;
      else if (/stunde/i.test(m[0])) value = n * 60;
      else if (/woche/i.test(m[0])) value = n * 7 * 1440;
      else value = n * 1440;
    }
    rest = (rest.slice(0, m.index) + " " + rest.slice((m.index ?? 0) + m[0].length)).replace(/\s+/g, " ").trim();
    return { minutes: value, rest };
  }
  return { minutes: null, rest };
}

function parseReminderTarget(text: string): { assignee: Assignee | null; rest: string } {
  const m = text.match(/\b(domenico|elisabeth)\s+erinnern\b/i);
  if (m) {
    const rest = (text.slice(0, m.index) + " " + text.slice((m.index ?? 0) + m[0].length)).replace(/\s+/g, " ").trim();
    return { assignee: m[1].toLowerCase() as Assignee, rest };
  }
  return { assignee: null, rest: text };
}

function parseLocation(text: string): { location: string | null; rest: string } {
  // "auf die/der/dem X" / "in X" / "im X" — X is the run of capitalized-ish
  // words up to the next punctuation or connector.
  const m = text.match(/\b(?:auf\s+(?:die|der|dem)|in|im)\s+([A-ZÄÖÜ][\wäöüß-]*(?:\s+[A-ZÄÖÜ][\wäöüß-]*)*)/);
  if (m) {
    const rest = (text.slice(0, m.index) + " " + text.slice((m.index ?? 0) + m[0].length)).replace(/\s+/g, " ").trim();
    return { location: m[1].trim(), rest };
  }
  return { location: null, rest: text };
}

function parseCategory(text: string): { category: EventCategory; certain: boolean } {
  const lower = stripDiacriticsLower(text);
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return { category, certain: true };
  }
  return { category: "familie", certain: false };
}

/** Splits off clauses ending in a known task verb ("... bereitlegen", "...
 * anrufen") as prep-task titles, typically found after "und"/"," near the
 * end of the sentence — matching phrasing like "Elisabeth erinnern und
 * einen Tag vorher Unterlagen bereitlegen." */
function parsePrepTasks(text: string): { tasks: string[]; rest: string } {
  const tasks: string[] = [];
  let rest = text;

  const verbGroup = TASK_VERBS.join("|");
  const clausePattern = new RegExp(
    `([A-ZÄÖÜa-zäöüß][\\wäöüß-]*(?:\\s+[\\wäöüß-]+)*?)\\s+(${verbGroup})\\b`,
    "gi",
  );

  let match: RegExpExecArray | null;
  const spans: { start: number; end: number; title: string }[] = [];
  while ((match = clausePattern.exec(text)) !== null) {
    const words = match[1].trim().split(/\s+/).filter((w) => !["und", "dann", "auch", "sowie"].includes(w.toLowerCase()));
    const title = `${words.slice(-3).join(" ")} ${match[2]}`.trim();
    spans.push({ start: match.index, end: match.index + match[0].length, title: capitalize(title) });
  }

  for (const span of spans.reverse()) {
    tasks.unshift(span.title);
    rest = (rest.slice(0, span.start) + " " + rest.slice(span.end)).replace(/\s+/g, " ").trim();
  }

  return { tasks, rest };
}

function capitalize(s: string) {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

const FILLER_EDGE_WORDS = new Set([
  "und", "am", "um", "auf", "in", "im", "die", "der", "das", "den", "dem",
  "kommt", "ist", "findet", "statt", "ein", "eine", "für", "mit", "bei",
]);

function cleanTitle(text: string): string {
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/^[.,;:!?]+|[.,;:!?]+$/g, ""))
    .filter(Boolean);
  while (words.length > 0 && FILLER_EDGE_WORDS.has(words[0].toLowerCase())) words.shift();
  while (words.length > 0 && FILLER_EDGE_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  return capitalize(words.join(" ").trim());
}

export function parseEventTextLocally(rawText: string, now: Date = new Date()): ParsedEventDraft {
  const original = rawText.trim();
  let working = original;

  const { assignee: reminderFor, rest: r1 } = parseReminderTarget(working);
  working = r1;

  const { minutes: reminderMinutesBefore, rest: r2 } = parseReminder(working);
  working = r2;

  const { tasks: prepTasks, rest: r3 } = parsePrepTasks(working);
  working = r3;

  const { date, certain: dateCertain, rest: r4, question: dateQuestion } = parseDate(working, now);
  working = r4;

  const { time: startTime, certain: startTimeCertain, rest: r5 } = parseTime(working);
  working = r5;

  const { location, rest: r6 } = parseLocation(working);
  working = r6;

  const { category, certain: categoryCertain } = parseCategory(original);

  // Mentions checked on r1 (post reminder-target-phrase removal) so that
  // "Elisabeth erinnern" alone doesn't get counted as her *attending* the
  // event too — those are different facts the text may or may not both state.
  const mentioned = findAssignees(r1);
  let assignee: Assignee = "gemeinsam";
  let assigneeCertain = true;
  let assigneeQuestion: string | undefined;
  if (mentioned.length === 2) {
    assignee = "gemeinsam";
  } else if (mentioned.length === 1) {
    assignee = mentioned[0];
  } else if (reminderFor) {
    // Only the reminder target was named — a real but different fact from
    // who the event is for, so ask rather than assume.
    assignee = reminderFor;
    assigneeCertain = false;
    assigneeQuestion = `Soll ${reminderFor === "domenico" ? "Domenico" : "Elisabeth"} teilnehmen oder nur erinnert werden?`;
  } else {
    assigneeCertain = false;
    assigneeQuestion = "Für wen ist dieser Termin — Domenico, Elisabeth oder gemeinsam?";
  }
  // Strip person names from the title candidate regardless of how the
  // assignee was resolved.
  working = working.replace(/\b(domenico|elisabeth)\b/gi, " ").replace(/\s+/g, " ").trim();

  const title = cleanTitle(working);
  const titleCertain = title.length >= 3;

  return {
    rawText: original,
    title: titleCertain ? title : original,
    titleCertain,
    titleQuestion: titleCertain ? undefined : "Wie soll der Termin heißen?",
    date,
    dateCertain,
    dateQuestion,
    allDay: false,
    startTime,
    startTimeCertain,
    endTime: null,
    location,
    locationCertain: location !== null,
    category,
    categoryCertain,
    assignee,
    assigneeCertain,
    assigneeQuestion,
    reminderMinutesBefore,
    reminderFor,
    notes: null,
    prepTasks,
  };
}
