"use client";

// Maps between dayli's camelCase domain types (lib/types.ts) and the
// snake_case Supabase schema (supabase/migrations), and wraps every
// read/write the app store needs when a real project is connected.

import { getSupabaseClient } from "./client";
import type { Database } from "./types";
import type {
  AppNotification,
  Assignee,
  CalendarEvent,
  EventCategory,
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

export interface CategoryRef {
  id: string;
  key: EventCategory;
}

function categoryKeyToId(categories: CategoryRef[], key: EventCategory) {
  return categories.find((c) => c.key === key)?.id ?? null;
}

function categoryIdToKey(categories: CategoryRef[], id: string | null): EventCategory {
  return (categories.find((c) => c.id === id)?.key as EventCategory) ?? "sonstiges";
}

// ---------------------------------------------------------------------------
// initial load
// ---------------------------------------------------------------------------

export async function fetchFamilyData(familyId: string) {
  const supabase = client();

  const [categoriesRes, eventsRes, tasksRes, subtasksRes, goalsRes, entriesRes, notificationsRes] =
    await Promise.all([
      supabase.from("categories").select("id, key").eq("family_id", familyId),
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
      supabase
        .from("notifications")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false }),
    ]);

  for (const res of [categoriesRes, eventsRes, tasksRes, subtasksRes, goalsRes, entriesRes, notificationsRes]) {
    if (res.error) throw res.error;
  }

  const categories: CategoryRef[] = (categoriesRes.data ?? []).map((c) => ({
    id: c.id,
    key: c.key as EventCategory,
  }));

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

  return { categories, events, tasks, savingsGoals, savingsEntries, notifications };
}

// ---------------------------------------------------------------------------
// row -> domain
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function rowToEvent(row: Row, categories: CategoryRef[]): CalendarEvent {
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
    isShopping: row.is_shopping as boolean,
    linkedEventId: (row.linked_event_id as string | null) ?? null,
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

function rowToNotification(row: Row): AppNotification {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    read: row.read as boolean,
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// writes
// ---------------------------------------------------------------------------

export async function insertEvent(
  familyId: string,
  categories: CategoryRef[],
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
  return rowToEvent(data, categories);
}

export async function updateEventRow(
  id: string,
  categories: CategoryRef[],
  patch: Partial<CalendarEvent>,
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
}

export async function deleteEventRow(id: string) {
  const { error } = await client().from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function insertTask(
  familyId: string,
  profileId: string,
  task: Omit<TaskItem, "id" | "createdAt" | "updatedAt">,
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
      is_shopping: task.isShopping,
      linked_event_id: task.linkedEventId ?? null,
      created_by: profileId,
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

  return rowToTask(data, subtasks);
}

export async function updateTaskRow(id: string, patch: Partial<TaskItem>) {
  const update: Database["public"]["Tables"]["tasks"]["Update"] = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.assignee !== undefined) update.assignee = patch.assignee;
  if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.done !== undefined) update.done = patch.done;
  if (patch.doneAt !== undefined) update.done_at = patch.doneAt;
  if (patch.recurrence !== undefined) update.recurrence_rule = patch.recurrence;
  if (patch.isShopping !== undefined) update.is_shopping = patch.isShopping;

  const { error } = await client().from("tasks").update(update).eq("id", id);
  if (error) throw error;
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

export async function markNotificationReadRow(id: string) {
  const { error } = await client().from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export { rowToEvent, rowToTask, rowToGoal, rowToEntry, rowToNotification };
