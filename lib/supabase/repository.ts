"use client";

// Maps between dayli's camelCase domain types (lib/types.ts) and the
// snake_case Supabase schema (supabase/migrations), and wraps every
// read/write the app store needs when a real project is connected.

import { getSupabaseClient } from "./client";
import type { Database } from "./types";
import {
  buildEventReminderPush,
  buildTaskReminderPush,
  computeEventRemindAt,
  computeTaskRemindAt,
} from "@/lib/reminder-messages";
import { slugifyCategoryKey } from "@/lib/category-utils";
import type {
  ActivityEntry,
  AppNotification,
  Assignee,
  CalendarEvent,
  CategoryDef,
  EventCategory,
  HausbauBudget,
  HausbauCategory,
  HausbauExpense,
  HausbauExpenseStatus,
  HausbauPaymentSource,
  HausbauSelfWork,
  Note,
  PersonId,
  RecurrenceRule,
  SavingsEntry,
  SavingsGoal,
  Subtask,
  TaskItem,
  TaskPriority,
} from "@/lib/types";

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

/** @deprecated use CategoryDef from lib/types — kept as an alias so
 * existing call sites passing a full category row still type-check. */
export type CategoryRef = CategoryDef;

function categoryKeyToId(categories: CategoryDef[], key: EventCategory | null): string | null {
  if (!key) return null;
  return categories.find((c) => c.key === key)?.id ?? null;
}

function categoryIdToKey(categories: CategoryDef[], id: string | null): EventCategory | null {
  if (!id) return null;
  return categories.find((c) => c.id === id)?.key ?? null;
}

// This app only ever has two family members, identified by display name —
// the same heuristic auth-context.tsx uses to derive the signed-in user's
// own personId. Needed here to resolve *other* rows' actor/updated-by uuids
// (activity_log, notes) back to "domenico"/"elisabeth" for display.
export interface FamilyProfileRef {
  id: string;
  personId: PersonId;
}

function resolvePersonId(profiles: FamilyProfileRef[], id: string | null): PersonId | null {
  if (!id) return null;
  return profiles.find((p) => p.id === id)?.personId ?? null;
}

// ---------------------------------------------------------------------------
// reminders — kept in sync with an event's/task's reminderMinutesBefore
// field so the send-due-reminders edge function (and pg_cron) has
// something to poll. computeEventRemindAt anchors all-day events (e.g.
// birthdays) to a fixed local time of day, since they have no intrinsic
// time. The stored `message` column holds only the push BODY (see
// lib/reminder-messages.ts) — never the title, which the edge function
// looks up fresh from the event's/task's current title at send time so a
// later rename is always reflected without needing to resync here.
//
// A recurring event's reminder only ever tracks ONE upcoming occurrence per
// row — send-due-reminders itself advances remind_at to the next occurrence
// after firing (rather than marking it sent) for events with recurrence !==
// "none", so e.g. a yearly birthday reminder keeps repeating without the app
// needing to be reopened. That advancing is per reminder row (by its own
// id), so it works the same whether an event has one reminder or several.
// ---------------------------------------------------------------------------

// Every event gets these two reminders automatically — the day before and
// an hour before — with no manual setup required. The reminders table has
// no unique constraint on event_id (see the migration), so more than one
// row per event is fine; each fires and advances independently.
const AUTOMATIC_EVENT_REMINDER_OFFSETS_MINUTES = [24 * 60, 60];

export async function syncEventReminder(familyId: string, event: CalendarEvent) {
  const supabase = client();

  const { error: deleteError } = await supabase.from("reminders").delete().eq("event_id", event.id);
  if (deleteError) throw deleteError;

  // The user's own explicit "Erinnerung" choice from the form joins the two
  // automatic offsets rather than replacing them — deduplicated via a Set
  // so picking exactly "1 Stunde vorher" doesn't create two identical rows.
  const offsets = new Set(AUTOMATIC_EVENT_REMINDER_OFFSETS_MINUTES);
  if (event.reminderMinutesBefore) offsets.add(event.reminderMinutesBefore);

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("linked_event_id", event.id)
    .eq("done", false);
  const { body: message } = buildEventReminderPush(event, count ?? 0);

  const rows = Array.from(offsets).map((minutesBefore) => ({
    family_id: familyId,
    event_id: event.id,
    remind_at: computeEventRemindAt(event.date, event.startTime, minutesBefore).toISOString(),
    message,
    sent: false,
  }));

  const { error: insertError } = await supabase.from("reminders").insert(rows);
  if (insertError) throw insertError;
}

export async function syncTaskReminder(familyId: string, task: TaskItem, linkedEvent?: CalendarEvent | null) {
  const supabase = client();

  if (!task.reminderMinutesBefore || !task.dueDate || task.done) {
    const { error } = await supabase.from("reminders").delete().eq("task_id", task.id);
    if (error) throw error;
    return;
  }

  const remindAt = computeTaskRemindAt(task.dueDate, task.reminderMinutesBefore).toISOString();
  const { body: message } = buildTaskReminderPush(task, linkedEvent);

  const { error: deleteError } = await supabase.from("reminders").delete().eq("task_id", task.id);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase.from("reminders").insert({
    family_id: familyId,
    task_id: task.id,
    remind_at: remindAt,
    message,
    sent: false,
  });
  if (insertError) throw insertError;
}

// ---------------------------------------------------------------------------
// initial load
// ---------------------------------------------------------------------------

export async function fetchFamilyData(familyId: string) {
  const supabase = client();

  const [
    profilesRes,
    categoriesRes,
    eventsRes,
    tasksRes,
    subtasksRes,
    goalsRes,
    entriesRes,
    notificationsRes,
    notesRes,
    activityRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("family_id", familyId),
    supabase.from("categories").select("*").eq("family_id", familyId).order("sort_order", { ascending: true }),
    supabase.from("events").select("*").eq("family_id", familyId),
    supabase.from("tasks").select("*").eq("family_id", familyId),
    supabase
      .from("task_subtasks")
      .select("*, tasks!inner(family_id)")
      .eq("tasks.family_id", familyId),
    supabase.from("savings_goals").select("*").eq("family_id", familyId),
    supabase
      .from("savings_entries")
      .select("*, savings_goals!inner(family_id)")
      .eq("savings_goals.family_id", familyId),
    // Unread-for-me only — see get_unread_notifications() in
    // supabase/migrations/20250101001200_notification_reads_and_categories.sql.
    supabase.rpc("get_unread_notifications"),
    supabase.from("notes").select("*").eq("family_id", familyId).order("updated_at", { ascending: false }),
    supabase
      .from("activity_log")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  for (const res of [
    profilesRes,
    categoriesRes,
    eventsRes,
    tasksRes,
    subtasksRes,
    goalsRes,
    entriesRes,
    notificationsRes,
    notesRes,
    activityRes,
  ]) {
    if (res.error) throw res.error;
  }

  // Same "elisabeth"-by-name heuristic as auth-context.tsx's personId — this
  // app only ever has two family members.
  const profiles: FamilyProfileRef[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    personId: p.display_name.toLowerCase() === "elisabeth" ? "elisabeth" : "domenico",
  }));

  const categories: CategoryDef[] = (categoriesRes.data ?? []).map(rowToCategory);

  const subtasksByTask = new Map<string, Subtask[]>();
  for (const row of subtasksRes.data ?? []) {
    const list = subtasksByTask.get(row.task_id) ?? [];
    list.push({ id: row.id, title: row.title, done: row.done });
    subtasksByTask.set(row.task_id, list);
  }

  const events: CalendarEvent[] = (eventsRes.data ?? []).map((row) => rowToEvent(row, categories));
  const tasks: TaskItem[] = (tasksRes.data ?? []).map((row) =>
    rowToTask(row, subtasksByTask.get(row.id) ?? []),
  );
  const savingsGoals: SavingsGoal[] = (goalsRes.data ?? []).map(rowToGoal);
  const savingsEntries: SavingsEntry[] = (entriesRes.data ?? []).map(rowToEntry);
  const notifications: AppNotification[] = (notificationsRes.data ?? []).map(rowToNotification);
  const notes: Note[] = (notesRes.data ?? []).map((row) => rowToNote(row, profiles));
  const activity: ActivityEntry[] = (activityRes.data ?? []).map((row) => rowToActivity(row, profiles));

  return { profiles, categories, events, tasks, savingsGoals, savingsEntries, notifications, notes, activity };
}

// ---------------------------------------------------------------------------
// row -> domain
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function rowToCategory(row: Row): CategoryDef {
  return {
    id: row.id as string,
    key: row.key as string,
    label: row.label as string,
    icon: row.icon as string,
    color: (row.color as string | null) ?? null,
    isSystem: row.is_system as boolean,
  };
}

function rowToEvent(row: Row, categories: CategoryDef[]): CalendarEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    startTime: (row.start_time as string | null)?.slice(0, 5) ?? null,
    endTime: (row.end_time as string | null)?.slice(0, 5) ?? null,
    allDay: row.all_day as boolean,
    assignee: row.assignee as Assignee,
    category: categoryIdToKey(categories, row.category_id as string | null),
    location: (row.location as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    reminderMinutesBefore: row.reminder_minutes_before as number | null,
    recurrence: row.recurrence_rule as RecurrenceRule,
    color: (row.color as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToTask(row: Row, subtasks: Subtask[]): TaskItem {
  return {
    id: row.id as string,
    title: row.title as string,
    assignee: row.assignee as Assignee,
    dueDate: (row.due_date as string | null) ?? null,
    priority: row.priority as TaskPriority,
    done: row.done as boolean,
    doneAt: (row.done_at as string | null) ?? null,
    recurrence: row.recurrence_rule as RecurrenceRule,
    rotateAssignee: (row.rotate_assignee as boolean | null) ?? false,
    isShopping: row.is_shopping as boolean,
    linkedEventId: (row.linked_event_id as string | null) ?? null,
    reminderMinutesBefore: (row.reminder_minutes_before as number | null) ?? null,
    sortOrder: (row.sort_order as number | null) ?? 0,
    subtasks,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToGoal(row: Row): SavingsGoal {
  return {
    id: row.id as string,
    title: row.title as string,
    targetAmount: Number(row.target_amount),
    color: row.color as SavingsGoal["color"],
    createdAt: row.created_at as string,
  };
}

function rowToEntry(row: Row): SavingsEntry {
  return {
    id: row.id as string,
    goalId: row.goal_id as string,
    amount: Number(row.amount),
    contributor: row.contributor as Assignee,
    note: (row.note as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function rowToNote(row: Row, profiles: FamilyProfileRef[]): Note {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    updatedBy: resolvePersonId(profiles, row.updated_by as string | null),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToActivity(row: Row, profiles: FamilyProfileRef[]): ActivityEntry {
  return {
    id: row.id as string,
    actorId: resolvePersonId(profiles, row.actor_id as string | null),
    message: row.message as string,
    createdAt: row.created_at as string,
  };
}

function rowToNotification(row: Row): AppNotification {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    type: (row.type as string | null) ?? null,
    assignee: (row.assignee as Assignee | null) ?? null,
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// writes
// ---------------------------------------------------------------------------

export async function insertEvent(
  familyId: string,
  categories: CategoryDef[],
  profileId: string,
  event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">,
) {
  const { data, error } = await client()
    .from("events")
    .insert({
      family_id: familyId,
      category_id: categoryKeyToId(categories, event.category),
      title: event.title,
      date: event.date,
      start_time: event.startTime,
      end_time: event.endTime,
      all_day: event.allDay,
      assignee: event.assignee,
      location: event.location ?? null,
      notes: event.notes ?? null,
      reminder_minutes_before: event.reminderMinutesBefore ?? null,
      recurrence_rule: event.recurrence,
      color: event.color ?? null,
      created_by: profileId,
    })
    .select()
    .single();
  if (error) throw error;
  const inserted = rowToEvent(data, categories);
  try {
    await syncEventReminder(familyId, inserted);
  } catch (reminderError) {
    console.error("Failed to sync reminder for new event", reminderError);
  }
  return inserted;
}

export async function updateEventRow(
  familyId: string,
  id: string,
  categories: CategoryDef[],
  patch: Partial<CalendarEvent>,
  merged: CalendarEvent,
) {
  const update: Database["public"]["Tables"]["events"]["Update"] = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.date !== undefined) update.date = patch.date;
  if (patch.startTime !== undefined) update.start_time = patch.startTime;
  if (patch.endTime !== undefined) update.end_time = patch.endTime;
  if (patch.allDay !== undefined) update.all_day = patch.allDay;
  if (patch.assignee !== undefined) update.assignee = patch.assignee;
  if (patch.category !== undefined) update.category_id = categoryKeyToId(categories, patch.category);
  if (patch.location !== undefined) update.location = patch.location ?? null;
  if (patch.notes !== undefined) update.notes = patch.notes ?? null;
  if (patch.reminderMinutesBefore !== undefined) update.reminder_minutes_before = patch.reminderMinutesBefore;
  if (patch.recurrence !== undefined) update.recurrence_rule = patch.recurrence;
  if (patch.color !== undefined) update.color = patch.color ?? null;

  const { error } = await client().from("events").update(update).eq("id", id);
  if (error) throw error;

  // The stored reminder message body carries the timing and (for events) a
  // short location, but never the title — that's looked up fresh from the
  // event at send time, so renaming an event doesn't need a resync. A
  // location edit does, though, since it's baked into the stored body.
  const reminderRelevant =
    patch.reminderMinutesBefore !== undefined ||
    patch.date !== undefined ||
    patch.startTime !== undefined ||
    patch.allDay !== undefined ||
    patch.location !== undefined;
  if (reminderRelevant) {
    try {
      await syncEventReminder(familyId, merged);
    } catch (reminderError) {
      console.error("Failed to sync reminder for updated event", reminderError);
    }
  }
}

export async function deleteEventRow(id: string) {
  const { error } = await client().from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function insertTask(
  familyId: string,
  profileId: string,
  task: Omit<TaskItem, "id" | "createdAt" | "updatedAt">,
  linkedEvent?: CalendarEvent | null,
) {
  const { data, error } = await client()
    .from("tasks")
    .insert({
      family_id: familyId,
      title: task.title,
      assignee: task.assignee,
      due_date: task.dueDate,
      priority: task.priority,
      done: task.done,
      recurrence_rule: task.recurrence,
      rotate_assignee: task.rotateAssignee ?? false,
      is_shopping: task.isShopping,
      linked_event_id: task.linkedEventId ?? null,
      reminder_minutes_before: task.reminderMinutesBefore ?? null,
      sort_order: task.sortOrder ?? 0,
      created_by: profileId,
      updated_by: profileId,
    })
    .select()
    .single();
  if (error) throw error;

  let subtasks: Subtask[] = [];
  if (task.subtasks.length > 0) {
    const { data: subRows, error: subError } = await client()
      .from("task_subtasks")
      .insert(task.subtasks.map((s, i) => ({ task_id: data.id, title: s.title, done: s.done, sort_order: i })))
      .select();
    if (subError) throw subError;
    subtasks = (subRows ?? []).map((r) => ({ id: r.id, title: r.title, done: r.done }));
  }

  const inserted = rowToTask(data, subtasks);
  try {
    await syncTaskReminder(familyId, inserted, linkedEvent);
  } catch (reminderError) {
    console.error("Failed to sync reminder for new task", reminderError);
  }
  return inserted;
}

export async function updateTaskRow(
  familyId: string,
  id: string,
  patch: Partial<TaskItem>,
  merged: TaskItem,
  updatedBy: string | null,
  linkedEvent?: CalendarEvent | null,
) {
  const update: Database["public"]["Tables"]["tasks"]["Update"] = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.assignee !== undefined) update.assignee = patch.assignee;
  if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.done !== undefined) update.done = patch.done;
  if (patch.doneAt !== undefined) update.done_at = patch.doneAt;
  if (patch.recurrence !== undefined) update.recurrence_rule = patch.recurrence;
  if (patch.rotateAssignee !== undefined) update.rotate_assignee = patch.rotateAssignee;
  if (patch.isShopping !== undefined) update.is_shopping = patch.isShopping;
  if (patch.linkedEventId !== undefined) update.linked_event_id = patch.linkedEventId ?? null;
  if (patch.reminderMinutesBefore !== undefined) update.reminder_minutes_before = patch.reminderMinutesBefore;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
  if (updatedBy) update.updated_by = updatedBy;

  const { error } = await client().from("tasks").update(update).eq("id", id);
  if (error) throw error;

  const reminderRelevant =
    patch.reminderMinutesBefore !== undefined ||
    patch.dueDate !== undefined ||
    patch.done !== undefined ||
    patch.linkedEventId !== undefined ||
    patch.title !== undefined;
  if (reminderRelevant) {
    try {
      await syncTaskReminder(familyId, merged, linkedEvent);
    } catch (reminderError) {
      console.error("Failed to sync reminder for updated task", reminderError);
    }
  }
}

export async function deleteTaskRow(id: string) {
  const { error } = await client().from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleSubtaskRow(subtaskId: string, done: boolean) {
  const { error } = await client().from("task_subtasks").update({ done }).eq("id", subtaskId);
  if (error) throw error;
}

export async function insertSavingsGoal(
  familyId: string,
  profileId: string,
  goal: Omit<SavingsGoal, "id" | "createdAt">,
) {
  const { data, error } = await client()
    .from("savings_goals")
    .insert({
      family_id: familyId,
      title: goal.title,
      target_amount: goal.targetAmount,
      color: goal.color,
      created_by: profileId,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToGoal(data);
}

export async function insertSavingsEntry(
  profileId: string | null,
  entry: Omit<SavingsEntry, "id" | "createdAt">,
) {
  const { data, error } = await client()
    .from("savings_entries")
    .insert({
      goal_id: entry.goalId,
      amount: entry.amount,
      contributor: entry.contributor,
      contributor_id: entry.contributor === "gemeinsam" ? null : profileId,
      note: entry.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

// Per-user read receipt — see notification_reads in
// supabase/migrations/20250101001200_notification_reads_and_categories.sql.
// ignoreDuplicates keeps a double-tap (or a race with another device of the
// same person) a harmless no-op rather than a constraint-violation error.
export async function markNotificationReadRow(notificationId: string, profileId: string) {
  const { error } = await client()
    .from("notification_reads")
    .upsert(
      { notification_id: notificationId, profile_id: profileId },
      { onConflict: "notification_id,profile_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function markAllNotificationsReadRows(notificationIds: string[], profileId: string) {
  if (notificationIds.length === 0) return;
  const { error } = await client()
    .from("notification_reads")
    .upsert(
      notificationIds.map((notificationId) => ({ notification_id: notificationId, profile_id: profileId })),
      { onConflict: "notification_id,profile_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// categories — system categories (seed_default_categories) are read-only
// from the client; only custom ones (is_system = false) can be created,
// renamed/recolored, or deleted, enforced by RLS as well as here.
// ---------------------------------------------------------------------------

export async function insertCategoryRow(
  familyId: string,
  profileId: string,
  existingKeys: string[],
  input: { label: string; icon: string; color: string },
): Promise<CategoryDef> {
  const key = slugifyCategoryKey(input.label, existingKeys);
  const { data, error } = await client()
    .from("categories")
    .insert({
      family_id: familyId,
      key,
      label: input.label.trim(),
      icon: input.icon,
      color: input.color,
      created_by: profileId,
      is_system: false,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToCategory(data);
}

export async function updateCategoryRow(
  id: string,
  patch: { label?: string; icon?: string; color?: string },
): Promise<void> {
  const update: Database["public"]["Tables"]["categories"]["Update"] = {};
  if (patch.label !== undefined) update.label = patch.label.trim();
  if (patch.icon !== undefined) update.icon = patch.icon;
  if (patch.color !== undefined) update.color = patch.color;
  const { error } = await client().from("categories").update(update).eq("id", id);
  if (error) throw error;
}

// Events referencing this category are reassigned to "no category" by the
// events.category_id foreign key's ON DELETE SET NULL — no manual
// reassignment step needed here.
export async function deleteCategoryRow(id: string): Promise<void> {
  const { error } = await client().from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// notes — a shared list (not a single scratchpad); any family member can
// create/edit/delete any note, mirroring the tasks/shopping-list model.
// ---------------------------------------------------------------------------

export async function insertNoteRow(
  familyId: string,
  profileId: string,
  input: { title: string; body: string },
  profiles: FamilyProfileRef[],
): Promise<Note> {
  const { data, error } = await client()
    .from("notes")
    .insert({
      family_id: familyId,
      title: input.title,
      body: input.body,
      created_by: profileId,
      updated_by: profileId,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToNote(data, profiles);
}

export async function updateNoteRow(
  id: string,
  profileId: string,
  patch: { title?: string; body?: string },
): Promise<void> {
  const update: Database["public"]["Tables"]["notes"]["Update"] = { updated_by: profileId };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.body !== undefined) update.body = patch.body;
  const { error } = await client().from("notes").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteNoteRow(id: string): Promise<void> {
  const { error } = await client().from("notes").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// activity log — best-effort: a failed write here never breaks the mutation
// it describes, so errors are logged rather than thrown.
// ---------------------------------------------------------------------------

export async function logActivity(familyId: string, actorId: string | null, message: string): Promise<void> {
  const { error } = await client().from("activity_log").insert({ family_id: familyId, actor_id: actorId, message });
  if (error) console.error("Failed to log activity", error);
}

// ---------------------------------------------------------------------------
// automatic backups — written weekly by the send-weekly-backup edge function
// ---------------------------------------------------------------------------

export interface BackupSnapshotRef {
  id: string;
  storagePath: string;
  createdAt: string;
}

export async function listBackupSnapshots(familyId: string): Promise<BackupSnapshotRef[]> {
  const { data, error } = await client()
    .from("backup_snapshots")
    .select("id, storage_path, created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    storagePath: row.storage_path as string,
    createdAt: row.created_at as string,
  }));
}

export async function getBackupSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await client().storage.from("backups").createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Hausbau-Kalkulation — separate fetch (not folded into fetchFamilyData) so
// the feature's own hook can load/subscribe independently. All money
// fields round-trip as plain integer cents; nothing here ever divides or
// floats them.
// ---------------------------------------------------------------------------

function rowToHausbauBudget(row: Row, profiles: FamilyProfileRef[]): HausbauBudget {
  return {
    projectName: row.project_name as string,
    bankFinancingCents: row.bank_financing_cents as number,
    ownReserveCents: row.own_reserve_cents as number,
    emergencyReserveCents: row.emergency_reserve_cents as number,
    currency: row.currency as string,
    startDate: (row.start_date as string | null) ?? null,
    createdBy: resolvePersonId(profiles, row.created_by as string | null),
    updatedAt: row.updated_at as string,
  };
}

function rowToHausbauCategory(row: Row): HausbauCategory {
  return {
    id: row.id as string,
    key: row.key as string,
    label: row.label as string,
    icon: row.icon as string,
    color: (row.color as string | null) ?? null,
    isSystem: row.is_system as boolean,
    isActive: row.is_active as boolean,
  };
}

function rowToHausbauExpense(row: Row, profiles: FamilyProfileRef[]): HausbauExpense {
  return {
    id: row.id as string,
    title: row.title as string,
    categoryId: (row.category_id as string | null) ?? null,
    plannedAmountCents: (row.planned_amount_cents as number | null) ?? null,
    actualAmountCents: (row.actual_amount_cents as number | null) ?? null,
    paymentSource: row.payment_source as HausbauPaymentSource,
    status: row.status as HausbauExpenseStatus,
    invoiceDate: (row.invoice_date as string | null) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    vendor: (row.vendor as string | null) ?? null,
    invoiceNumber: (row.invoice_number as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    receiptPath: (row.receipt_path as string | null) ?? null,
    linkedEventId: (row.linked_event_id as string | null) ?? null,
    createdBy: resolvePersonId(profiles, row.created_by as string | null),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToHausbauSelfWork(row: Row, profiles: FamilyProfileRef[]): HausbauSelfWork {
  return {
    id: row.id as string,
    title: row.title as string,
    categoryId: (row.category_id as string | null) ?? null,
    estimatedCompanyCostCents: row.estimated_company_cost_cents as number,
    actualMaterialCostCents: row.actual_material_cost_cents as number,
    additionalExternalCostCents: row.additional_external_cost_cents as number,
    hours: row.hours === null || row.hours === undefined ? null : Number(row.hours),
    hourlyRateCents: (row.hourly_rate_cents as number | null) ?? null,
    paymentSource: row.payment_source as HausbauPaymentSource,
    workDate: (row.work_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    documentPaths: (row.document_paths as string[] | null) ?? [],
    createdBy: resolvePersonId(profiles, row.created_by as string | null),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchHausbauData(familyId: string, profiles: FamilyProfileRef[]) {
  const supabase = client();

  const [budgetRes, categoriesRes, expensesRes, selfWorkRes] = await Promise.all([
    supabase.from("hausbau_budgets").select("*").eq("family_id", familyId).maybeSingle(),
    supabase.from("hausbau_categories").select("*").eq("family_id", familyId).order("sort_order", { ascending: true }),
    supabase.from("hausbau_expenses").select("*").eq("family_id", familyId),
    supabase.from("hausbau_self_work").select("*").eq("family_id", familyId),
  ]);

  for (const res of [budgetRes, categoriesRes, expensesRes, selfWorkRes]) {
    if (res.error) throw res.error;
  }

  const budget = budgetRes.data ? rowToHausbauBudget(budgetRes.data, profiles) : null;
  const categories: HausbauCategory[] = (categoriesRes.data ?? []).map(rowToHausbauCategory);
  const expenses: HausbauExpense[] = (expensesRes.data ?? []).map((row) => rowToHausbauExpense(row, profiles));
  const selfWork: HausbauSelfWork[] = (selfWorkRes.data ?? []).map((row) => rowToHausbauSelfWork(row, profiles));

  return { budget, categories, expenses, selfWork };
}

export async function upsertHausbauBudgetRow(
  familyId: string,
  profileId: string,
  input: {
    projectName: string;
    bankFinancingCents: number;
    ownReserveCents: number;
    emergencyReserveCents: number;
    startDate: string | null;
  },
  profiles: FamilyProfileRef[],
): Promise<HausbauBudget> {
  const { data, error } = await client()
    .from("hausbau_budgets")
    .upsert(
      {
        family_id: familyId,
        project_name: input.projectName,
        bank_financing_cents: input.bankFinancingCents,
        own_reserve_cents: input.ownReserveCents,
        emergency_reserve_cents: input.emergencyReserveCents,
        start_date: input.startDate,
        created_by: profileId,
      },
      { onConflict: "family_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return rowToHausbauBudget(data, profiles);
}

// ---------------------------------------------------------------------------
// Hausbau categories — same is_system/is_active pattern as event categories,
// except "deactivate" replaces "delete" for custom rows (spec §6: "eigene
// Kategorien ergänzen, bearbeiten und deaktivieren" — never remove one an
// expense might already reference).
// ---------------------------------------------------------------------------

export async function insertHausbauCategoryRow(
  familyId: string,
  profileId: string,
  existingKeys: string[],
  input: { label: string; icon: string; color: string },
): Promise<HausbauCategory> {
  const key = slugifyCategoryKey(input.label, existingKeys);
  const { data, error } = await client()
    .from("hausbau_categories")
    .insert({
      family_id: familyId,
      key,
      label: input.label.trim(),
      icon: input.icon,
      color: input.color,
      created_by: profileId,
      is_system: false,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToHausbauCategory(data);
}

export async function updateHausbauCategoryRow(
  id: string,
  patch: { label?: string; icon?: string; color?: string; isActive?: boolean },
): Promise<void> {
  const update: Database["public"]["Tables"]["hausbau_categories"]["Update"] = {};
  if (patch.label !== undefined) update.label = patch.label.trim();
  if (patch.icon !== undefined) update.icon = patch.icon;
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  const { error } = await client().from("hausbau_categories").update(update).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Hausbau expenses
// ---------------------------------------------------------------------------

export interface HausbauExpenseInput {
  title: string;
  categoryId: string | null;
  amountCents: number;
  paymentSource: HausbauPaymentSource;
  status: HausbauExpenseStatus;
  invoiceDate: string | null;
  dueDate: string | null;
  vendor: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  receiptPath: string | null;
  linkedEventId: string | null;
}

// The single "Betrag" field from the form always writes to the column
// matching the entry's CURRENT status — planned_amount_cents while
// "Geplant", actual_amount_cents for every other status — and never
// touches the other column, so an original planned estimate survives a
// later "beauftragt"/"bezahlt" edit for comparison (spec §4/§11).
function amountColumnsFor(status: HausbauExpenseStatus, amountCents: number) {
  return status === "planned"
    ? { planned_amount_cents: amountCents }
    : { actual_amount_cents: amountCents };
}

export async function insertHausbauExpenseRow(
  familyId: string,
  profileId: string,
  input: HausbauExpenseInput,
  profiles: FamilyProfileRef[],
): Promise<HausbauExpense> {
  const { data, error } = await client()
    .from("hausbau_expenses")
    .insert({
      family_id: familyId,
      title: input.title,
      category_id: input.categoryId,
      payment_source: input.paymentSource,
      status: input.status,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate,
      vendor: input.vendor,
      invoice_number: input.invoiceNumber,
      notes: input.notes,
      receipt_path: input.receiptPath,
      linked_event_id: input.linkedEventId,
      created_by: profileId,
      ...amountColumnsFor(input.status, input.amountCents),
    })
    .select()
    .single();
  if (error) throw error;
  return rowToHausbauExpense(data, profiles);
}

export async function updateHausbauExpenseRow(id: string, input: HausbauExpenseInput): Promise<void> {
  const { error } = await client()
    .from("hausbau_expenses")
    .update({
      title: input.title,
      category_id: input.categoryId,
      payment_source: input.paymentSource,
      status: input.status,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate,
      vendor: input.vendor,
      invoice_number: input.invoiceNumber,
      notes: input.notes,
      receipt_path: input.receiptPath,
      linked_event_id: input.linkedEventId,
      ...amountColumnsFor(input.status, input.amountCents),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHausbauExpenseRow(id: string): Promise<void> {
  const { error } = await client().from("hausbau_expenses").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Hausbau self-performed work ("Eigenleistung")
// ---------------------------------------------------------------------------

export interface HausbauSelfWorkInput {
  title: string;
  categoryId: string | null;
  estimatedCompanyCostCents: number;
  actualMaterialCostCents: number;
  additionalExternalCostCents: number;
  hours: number | null;
  hourlyRateCents: number | null;
  paymentSource: HausbauPaymentSource;
  workDate: string | null;
  notes: string | null;
  documentPaths: string[];
}

export async function insertHausbauSelfWorkRow(
  familyId: string,
  profileId: string,
  input: HausbauSelfWorkInput,
  profiles: FamilyProfileRef[],
): Promise<HausbauSelfWork> {
  const { data, error } = await client()
    .from("hausbau_self_work")
    .insert({
      family_id: familyId,
      title: input.title,
      category_id: input.categoryId,
      estimated_company_cost_cents: input.estimatedCompanyCostCents,
      actual_material_cost_cents: input.actualMaterialCostCents,
      additional_external_cost_cents: input.additionalExternalCostCents,
      hours: input.hours,
      hourly_rate_cents: input.hourlyRateCents,
      payment_source: input.paymentSource,
      work_date: input.workDate,
      notes: input.notes,
      document_paths: input.documentPaths,
      created_by: profileId,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToHausbauSelfWork(data, profiles);
}

export async function updateHausbauSelfWorkRow(id: string, input: HausbauSelfWorkInput): Promise<void> {
  const { error } = await client()
    .from("hausbau_self_work")
    .update({
      title: input.title,
      category_id: input.categoryId,
      estimated_company_cost_cents: input.estimatedCompanyCostCents,
      actual_material_cost_cents: input.actualMaterialCostCents,
      additional_external_cost_cents: input.additionalExternalCostCents,
      hours: input.hours,
      hourly_rate_cents: input.hourlyRateCents,
      payment_source: input.paymentSource,
      work_date: input.workDate,
      notes: input.notes,
      document_paths: input.documentPaths,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHausbauSelfWorkRow(id: string): Promise<void> {
  const { error } = await client().from("hausbau_self_work").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Hausbau documents — receipts/photos, private per-family folder (same
// bucket-scoping pattern as "backups"). Client-side upload is genuinely new
// infrastructure — no prior client upload helper existed anywhere in the
// app to copy from (the "backups" bucket is written server-side only).
// ---------------------------------------------------------------------------

const HAUSBAU_DOCUMENTS_BUCKET = "hausbau-documents";
const ALLOWED_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/heic", "image/webp", "application/pdf"];

export async function uploadHausbauDocument(familyId: string, file: File): Promise<string> {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    throw new Error("Nur Bilder (JPEG, PNG, HEIC, WebP) oder PDF-Dateien sind erlaubt.");
  }
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "dat";
  const path = `${familyId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await client().storage.from(HAUSBAU_DOCUMENTS_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getHausbauDocumentSignedUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from(HAUSBAU_DOCUMENTS_BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteHausbauDocument(path: string): Promise<void> {
  const { error } = await client().storage.from(HAUSBAU_DOCUMENTS_BUCKET).remove([path]);
  if (error) throw error;
}

export {
  rowToEvent,
  rowToTask,
  rowToGoal,
  rowToEntry,
  rowToNotification,
  rowToCategory,
  rowToNote,
  rowToActivity,
  rowToHausbauBudget,
  rowToHausbauCategory,
  rowToHausbauExpense,
  rowToHausbauSelfWork,
};
