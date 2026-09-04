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

export type EventCategory =
  | "familie"
  | "hausbau"
  | "kinder"
  | "arbeit"
  | "einkauf"
  | "freizeit"
  | "geburtstag"
  | "gesundheit"
  | "sonstiges";

export interface CategoryMeta {
  id: EventCategory;
  label: string;
  icon: string;
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
  category: EventCategory;
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
  isShopping: boolean;
  linkedEventId?: string | null;
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

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface UserPreferences {
  activeProfile: PersonId;
  reducedMotionOverride: boolean | null;
  calendarFilters: Assignee[] | "alle";
  hasOnboarded: boolean;
}
