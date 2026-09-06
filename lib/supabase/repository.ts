"use client";

// Maps between dayli's camelCase domain types (lib/types.ts) and the
// snake_case Supabase schema (supabase/migrations), and wraps every
// read/write the app store needs when a real project is connected.

import { getSupabaseClient } from "./client";
import type { Database } from "./types";
import {
  buildEventReminderMessage,
  buildTaskReminderMessage,
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
// time. A stored `message` carries prep-task-aware copy (see lib/reminder-
// messages.ts) so the edge function and the in-app bell don't re-derive it.
//
// A recurring event's reminder only ever tracks ONE upcoming occurrence —
// send-due-reminders itself advances remind_at to the next occurrence after
// firing (rather than marking it sent) for events with recurrence !== "none",
// so e.g. a yearly birthday reminder keeps repeating without the app needing
// to be reopened.
// ---------------------------------------------------------------------------

export async function syncEventReminder(familyId: string, event: CalendarEvent) {
  const supabase = client();

  if (!event.reminderMinutesBefore) {
    const { error } = await supabase.from("reminders").delete().eq("event_id", event.id);
    if (error) throw error;
    return;
  }

  const remindAt = computeEventRemindAt(event.date, event.startTime, event.reminderMinutesBefore).toISOString();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("linked_event_id", event.id)
    .eq("done", false);
  const message = buildEventReminderMessage(event, count ?? 0);

  const { error: deleteError } = await supabase.from("reminders").delete().eq("event_id", event.id);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase.from("reminders").insert({
    family_id: familyId,
    event_id: event.id,
    remind_at: remindAt,
    message,
    sent: false,
  });
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
  const message = buildTaskReminderMessage(task, linkedEvent);

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

  const reminderRelevant =
    patch.reminderMinutesBefore !== undefined ||
    patch.date !== undefined ||
    patch.startTime !== undefined ||
    patch.allDay !== undefined;
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

export { rowToEvent, rowToTask, rowToGoal, rowToEntry, rowToNotification, rowToCategory, rowToNote, rowToActivity };
