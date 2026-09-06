// Domain types shared by the demo data layer, the local store and the
// Supabase repository. Field names mirror the SQL schema in
// supabase/migrations so swapping the storage backend needs no reshaping.

export type PersonId = "domenico" | "elisabeth";
export type Assignee = PersonId | "gemeinsam";

export interface Profile {
  id: PersonId;
  name: string;
  initial: string;
  color: string;
  avatarColorVar: "domenico" | "elisabeth";
}

// A stable slug. The 9 seeded system categories keep these exact literal
// values; a custom category gets a slug generated from its name at creation
// time. Kept as a plain string (not a union) so runtime-created categories
// type-check without widening the union on every addition.
export type EventCategory = string;

export interface CategoryMeta {
  id: EventCategory;
  label: string;
  icon: string;
}

// A full category row as exposed by the store — system or custom, dynamic
// (fetched from Supabase / persisted locally in demo mode), unlike the
// static CategoryMeta list in lib/demo-data.ts which only covers the 9
// seeded defaults.
export interface CategoryDef {
  id: string;
  key: EventCategory;
  label: string;
  icon: string;
  color: string | null;
  isSystem: boolean;
}

export type RecurrenceRule =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date, yyyy-MM-dd
  startTime: string | null; // HH:mm, null when allDay
  endTime: string | null;
  allDay: boolean;
  assignee: Assignee;
  category: EventCategory | null;
  location?: string;
  notes?: string;
  reminderMinutesBefore?: number | null;
  recurrence: RecurrenceRule;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = "low" | "medium" | "high";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  assignee: Assignee;
  dueDate: string | null; // ISO date
  priority: TaskPriority;
  done: boolean;
  doneAt?: string | null;
  recurrence: RecurrenceRule;
  /** When true, completing a recurring task swaps the assignee (Domenico
   * <-> Elisabeth) on the auto-generated next occurrence. Ignored for
   * "gemeinsam" tasks and whenever recurrence is "none". Optional at
   * creation (defaults to false) since most tasks aren't recurring. */
  rotateAssignee?: boolean;
  isShopping: boolean;
  linkedEventId?: string | null;
  reminderMinutesBefore?: number | null;
  sortOrder: number;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface SavingsEntry {
  id: string;
  goalId: string;
  amount: number;
  contributor: Assignee;
  note?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  color: "domenico" | "elisabeth" | "together";
  createdAt: string;
}

// Represents a notification unread by the current user — the store's
// `notifications` array only ever holds unread items (see
// get_unread_notifications()); once read, an item is removed from it
// rather than flagged, since "read" is per-user, not a property of the
// notification row itself.
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type?: string | null;
  assignee?: Assignee | null;
  createdAt: string;
}

// A single shared note in the family's notes list (Apple-Notes-style: many
// independent notes, not one shared scratchpad). `updatedBy` lets the UI
// show "zuletzt von Elisabeth bearbeitet" without a join at render time.
export interface Note {
  id: string;
  title: string;
  body: string;
  updatedBy?: PersonId | null;
  createdAt: string;
  updatedAt: string;
}

// One entry in the family's activity feed. `message` is the pre-built,
// actor-agnostic action description (e.g. "„Bemusterung Haus" erstellt");
// the UI prefixes it with "Du" or the partner's name by comparing
// `actorId` against the viewer's own profile id.
export interface ActivityEntry {
  id: string;
  actorId: PersonId | null;
  message: string;
  createdAt: string;
}

export interface UserPreferences {
  activeProfile: PersonId;
  reducedMotionOverride: boolean | null;
  calendarFilters: Assignee[] | "alle";
  hasOnboarded: boolean;
}
