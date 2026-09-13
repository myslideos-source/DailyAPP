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

export interface DailyBriefingSettings {
  enabled: boolean;
  /** Show the floating briefing card automatically on the first open of a
   * new calendar day. When false, it's only ever reachable via the manual
   * briefing icon. */
  autoShow: boolean;
  frequency: "daily" | "weekdays";
  includeShared: boolean;
  includePersonal: boolean;
}

export interface WidgetPrivacySettings {
  showEventTitle: boolean;
  /** When true, the widget shows only the time of the next event, never
   * its title — independent of `hidePrivateContent`, which replaces the
   * title with a placeholder rather than omitting it entirely. */
  showTimeOnly: boolean;
  showTasks: boolean;
  hidePrivateContent: boolean;
}

export interface UserPreferences {
  activeProfile: PersonId;
  reducedMotionOverride: boolean | null;
  calendarFilters: Assignee[] | "alle";
  hasOnboarded: boolean;
  dailyBriefing: DailyBriefingSettings;
  widgetPrivacy: WidgetPrivacySettings;
  /** Per-person last-seen date for the automatic daily briefing (ISO
   * yyyy-MM-dd, Europe/Berlin). In Supabase mode only the signed-in
   * profile's own key is ever populated — user_preferences is private per
   * profile_id, so a partner's read state is never visible here, by
   * design. */
  dailyBriefingSeenDates: Partial<Record<PersonId, string>>;
}

// ---------------------------------------------------------------------------
// Hausbau-Kalkulation — house-build budget & expense tracking. All money
// fields are integer CENTS (never a float), matching the Postgres bigint
// columns exactly — a deliberate departure from SavingsGoal/SavingsEntry's
// numeric(12,2)/float, made explicit so it doesn't read as inconsistency.
// ---------------------------------------------------------------------------

export type HausbauPaymentSource = "bank" | "self";

/** "planned" = forecast only, excluded from availability. "ordered"/
 * "invoiced" = reserved (committed, not yet paid). "paid" = final. Exactly
 * one at a time, so a row can never be counted as both reserved and paid. */
export type HausbauExpenseStatus = "planned" | "ordered" | "invoiced" | "paid";

export interface HausbauBudget {
  projectName: string;
  bankFinancingCents: number;
  ownReserveCents: number;
  /** Shown separately, never folded into any "available" total (spec §2). */
  emergencyReserveCents: number;
  currency: string;
  startDate: string | null;
  createdBy: PersonId | null;
  updatedAt: string;
}

export interface HausbauCategory {
  id: string;
  key: string;
  label: string;
  icon: string;
  color: string | null;
  isSystem: boolean;
  isActive: boolean;
}

export interface HausbauExpense {
  id: string;
  title: string;
  categoryId: string | null;
  /** The forecast figure — set while status is "planned", left as-is once
   * the entry moves on so the original estimate survives for comparison. */
  plannedAmountCents: number | null;
  /** The committed/real figure — required for every status except
   * "planned". This is the number every calculation uses once an entry is
   * no longer just a forecast. */
  actualAmountCents: number | null;
  paymentSource: HausbauPaymentSource;
  status: HausbauExpenseStatus;
  invoiceDate: string | null;
  dueDate: string | null;
  vendor: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  receiptPath: string | null;
  linkedEventId: string | null;
  createdBy: PersonId | null;
  createdAt: string;
  updatedAt: string;
}

export interface HausbauSelfWork {
  id: string;
  title: string;
  categoryId: string | null;
  estimatedCompanyCostCents: number;
  actualMaterialCostCents: number;
  additionalExternalCostCents: number;
  hours: number | null;
  hourlyRateCents: number | null;
  /** Which pot the material/external costs were actually paid from —
   * always deducted immediately (self-work has no "planned"/"reserved"
   * status of its own). */
  paymentSource: HausbauPaymentSource;
  workDate: string | null;
  notes: string | null;
  documentPaths: string[];
  createdBy: PersonId | null;
  createdAt: string;
  updatedAt: string;
}
