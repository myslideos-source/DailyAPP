"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import { createDemoDataset, CATEGORIES, DEMO_NOTIFICATIONS, PROFILES } from "@/lib/demo-data";
import { slugifyCategoryKey, validateCategoryName } from "@/lib/category-utils";
import { nextTaskOccurrence } from "@/lib/recurrence";
import {
  categoryCreatedMessage,
  categoryDeletedMessage,
  eventCreatedMessage,
  eventDeletedMessage,
  noteCreatedMessage,
  savingsEntryAddedMessage,
  savingsGoalCreatedMessage,
  taskCreatedMessage,
  taskDeletedMessage,
  taskDoneMessage,
} from "@/lib/activity-messages";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SupabaseAuthProvider, useSupabaseAuth } from "@/lib/store/auth-context";
import * as repo from "@/lib/supabase/repository";
import type {
  ActivityEntry,
  AppNotification,
  Assignee,
  CalendarEvent,
  CategoryDef,
  Note,
  PersonId,
  SavingsEntry,
  SavingsGoal,
  Subtask,
  TaskItem,
  UserPreferences,
} from "@/lib/types";

const STORAGE_KEY = "dayli:data:v1";
const PREFS_KEY = "dayli:prefs:v1";
const NOTIF_READS_KEY = "dayli:notif-reads:v1";
const CATEGORIES_KEY = "dayli:categories:v1";

const SYSTEM_CATEGORIES: CategoryDef[] = CATEGORIES.map((c) => ({
  id: c.id,
  key: c.id,
  label: c.label,
  icon: c.icon,
  color: null,
  isSystem: true,
}));

export interface CategoryInput {
  label: string;
  icon: string;
  color: string;
}

interface AppState {
  events: CalendarEvent[];
  tasks: TaskItem[];
  savingsGoals: SavingsGoal[];
  savingsEntries: SavingsEntry[];
  notifications: AppNotification[];
  /** A shared list of independent notes (Apple-Notes-style), not one
   * scratchpad — see the Note type. */
  notes: Note[];
  /** Quick-skim feed of who did what, most recent first — creations,
   * completions, deletions only, never a field-level diff. */
  activity: ActivityEntry[];
}

const EMPTY_STATE: AppState = {
  events: [],
  tasks: [],
  savingsGoals: [],
  savingsEntries: [],
  notifications: [],
  notes: [],
  activity: [],
};

// Keeps the feed to a quick skim rather than an ever-growing list; older
// entries simply scroll out rather than being deleted anywhere.
const MAX_ACTIVITY_ENTRIES = 200;

type Action =
  | { type: "ADD_EVENT"; payload: CalendarEvent }
  | { type: "UPDATE_EVENT"; payload: CalendarEvent }
  | { type: "DELETE_EVENT"; payload: { id: string } }
  | { type: "ADD_TASK"; payload: TaskItem }
  | { type: "UPDATE_TASK"; payload: TaskItem }
  | { type: "DELETE_TASK"; payload: { id: string } }
  | { type: "TOGGLE_SUBTASK"; payload: { taskId: string; subtaskId: string } }
  | { type: "SET_SUBTASK_DONE"; payload: { taskId: string; subtaskId: string; done: boolean } }
  | { type: "ADD_SAVINGS_GOAL"; payload: SavingsGoal }
  | { type: "ADD_SAVINGS_ENTRY"; payload: SavingsEntry }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: string } }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "UPSERT_NOTIFICATION"; payload: AppNotification }
  | { type: "UPSERT_NOTE"; payload: Note }
  | { type: "DELETE_NOTE"; payload: { id: string } }
  | { type: "ADD_ACTIVITY"; payload: ActivityEntry }
  | { type: "HYDRATE"; payload: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "ADD_EVENT": {
      const exists = state.events.some((e) => e.id === action.payload.id);
      return {
        ...state,
        events: exists
          ? state.events.map((e) => (e.id === action.payload.id ? action.payload : e))
          : [...state.events, action.payload],
      };
    }
    case "UPDATE_EVENT":
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_EVENT":
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.payload.id),
      };
    case "ADD_TASK": {
      const exists = state.tasks.some((t) => t.id === action.payload.id);
      return {
        ...state,
        tasks: exists
          ? state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t))
          : [...state.tasks, action.payload],
      };
    }
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        ),
      };
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload.id),
      };
    case "TOGGLE_SUBTASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((s: Subtask) =>
                  s.id === action.payload.subtaskId
                    ? { ...s, done: !s.done }
                    : s,
                ),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      };
    case "SET_SUBTASK_DONE":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((s: Subtask) =>
                  s.id === action.payload.subtaskId ? { ...s, done: action.payload.done } : s,
                ),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      };
    case "ADD_SAVINGS_GOAL": {
      const exists = state.savingsGoals.some((g) => g.id === action.payload.id);
      return {
        ...state,
        savingsGoals: exists
          ? state.savingsGoals.map((g) => (g.id === action.payload.id ? action.payload : g))
          : [...state.savingsGoals, action.payload],
      };
    }
    case "ADD_SAVINGS_ENTRY": {
      const exists = state.savingsEntries.some((e) => e.id === action.payload.id);
      return {
        ...state,
        savingsEntries: exists ? state.savingsEntries : [...state.savingsEntries, action.payload],
      };
    }
    // Only ever dispatched in Supabase mode, where `notifications` holds
    // exclusively unread-for-me rows (see get_unread_notifications()) — so
    // "read" means "no longer belongs in this array", not a flag flip. Demo
    // mode tracks per-profile read state separately (see readsByProfile in
    // DemoAppStoreProvider) and never dispatches these two actions, since it
    // must keep every notification physically in state regardless of who
    // has read it.
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload.id),
      };
    case "MARK_ALL_NOTIFICATIONS_READ":
      return { ...state, notifications: [] };
    case "UPSERT_NOTIFICATION": {
      const exists = state.notifications.some((n) => n.id === action.payload.id);
      return {
        ...state,
        notifications: exists
          ? state.notifications.map((n) => (n.id === action.payload.id ? action.payload : n))
          : [action.payload, ...state.notifications],
      };
    }
    case "UPSERT_NOTE": {
      const exists = state.notes.some((n) => n.id === action.payload.id);
      return {
        ...state,
        notes: exists
          ? state.notes.map((n) => (n.id === action.payload.id ? action.payload : n))
          : [action.payload, ...state.notes],
      };
    }
    case "DELETE_NOTE":
      return { ...state, notes: state.notes.filter((n) => n.id !== action.payload.id) };
    case "ADD_ACTIVITY": {
      if (state.activity.some((a) => a.id === action.payload.id)) return state;
      return { ...state, activity: [action.payload, ...state.activity].slice(0, MAX_ACTIVITY_ENTRIES) };
    }
    default:
      return state;
  }
}

function loadInitialState(): AppState {
  const demo = createDemoDataset();
  return { ...demo, notifications: DEMO_NOTIFICATIONS, notes: [], activity: [] };
}

interface Toast {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface AppStoreValue extends AppState {
  ready: boolean;
  preferences: UserPreferences;
  setActiveProfile: (id: PersonId) => void;
  setCalendarFilters: (filters: Assignee[] | "alle") => void;
  setReducedMotionOverride: (value: boolean | null) => void;
  addEvent: (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => Promise<CalendarEvent>;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  /** `deleteLinkedTasks` decides the fate of prep tasks pointing at this
   * event via linkedEventId: true deletes them too, false only detaches
   * them (linkedEventId cleared, task itself kept). Omit when the event
   * has no linked tasks — the caller is expected to ask first otherwise. */
  deleteEvent: (id: string, deleteLinkedTasks?: boolean) => void;
  addTask: (task: Omit<TaskItem, "id" | "createdAt" | "updatedAt" | "sortOrder"> & { sortOrder?: number }) => Promise<TaskItem>;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "createdAt">) => void;
  addSavingsEntry: (entry: Omit<SavingsEntry, "id" | "createdAt">) => void;
  /** Marks read for the CURRENTLY ACTIVE profile only — never affects the
   * partner's own unread state for the same (shared) notification. */
  markNotificationRead: (id: string) => void;
  /** "Alle gelesen" — marks every currently-unread (for me) notification
   * read in one action, again scoped to the active profile only. */
  markAllNotificationsRead: () => void;
  /** Appends a device-local notification (e.g. a fired reminder) straight
   * into the bell list without a round-trip — never synced to other
   * devices, since it's derived from this device's own reminder check. */
  addLocalNotification: (notification: { title: string; body: string }) => void;
  /** System categories (Familie, Hausbau, …) plus any custom ones, in
   * display order. The single source of truth for category lookups —
   * event forms/pickers should read from here rather than the static
   * CATEGORIES constant, so a newly created category appears immediately. */
  categories: CategoryDef[];
  /** Throws with a user-facing German message on invalid/duplicate names —
   * callers should catch and surface `error.message` directly. */
  addCategory: (input: CategoryInput) => Promise<CategoryDef>;
  updateCategory: (id: string, patch: Partial<CategoryInput>) => Promise<void>;
  /** Reassigns any events using this category to "no category" (native FK
   * behavior in Supabase mode; done manually here in demo mode) before
   * removing it. Refuses (throws) for system categories. */
  deleteCategory: (id: string) => Promise<void>;
  /** Creates an empty untitled note and returns it immediately so the UI
   * can navigate straight into editing it (Apple-Notes-style). */
  addNote: () => Promise<Note>;
  /** Called ~800ms after the user stops typing (debounced by the editor
   * itself, not here) — "live" for this app means "syncs shortly after a
   * typing pause", not character-by-character co-editing. */
  updateNote: (id: string, patch: { title?: string; body?: string }) => void;
  deleteNote: (id: string) => void;
  /** Demo mode only — replaces all local data with a previously exported
   * backup. Returns false (and leaves data untouched) when unsupported,
   * e.g. in Supabase mode where restoring shared family data from a local
   * file risks clobbering the other person's device. */
  restoreFromBackup: (data: AppState) => boolean;
  toasts: Toast[];
  showToast: (message: string, action?: { label: string; onClick: () => void }) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

const DEFAULT_PREFS: UserPreferences = {
  activeProfile: "domenico",
  reducedMotionOverride: null,
  calendarFilters: "alle",
  hasOnboarded: false,
};

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, message, action }]);
    window.setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
      action ? 4200 : 2600,
    );
  }, []);
  return { toasts, showToast };
}

// ---------------------------------------------------------------------------
// Demo mode — everything lives in localStorage. Used whenever no Supabase
// project is configured, so dayli always works standalone.
// ---------------------------------------------------------------------------

function DemoAppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  // Per-profile read receipts, keyed by notification id — the demo-mode
  // equivalent of the Supabase notification_reads table. Notifications
  // themselves (state.notifications) are never deleted; only which
  // profiles have read which id changes here, so Domenico reading one
  // never marks it read for Elisabeth.
  const [readsByProfile, setReadsByProfile] = useState<Record<string, PersonId[]>>({});
  const [categories, setCategories] = useState<CategoryDef[]>(SYSTEM_CATEGORIES);
  const [ready, setReady] = useState(false);
  const { toasts, showToast } = useToasts();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        dispatch({ type: "HYDRATE", payload: JSON.parse(raw) });
      }
      const rawPrefs = window.localStorage.getItem(PREFS_KEY);
      if (rawPrefs) {
        setPreferences({ ...DEFAULT_PREFS, ...JSON.parse(rawPrefs) });
      }
      const rawReads = window.localStorage.getItem(NOTIF_READS_KEY);
      if (rawReads) {
        setReadsByProfile(JSON.parse(rawReads));
      }
      const rawCategories = window.localStorage.getItem(CATEGORIES_KEY);
      if (rawCategories) {
        const custom = JSON.parse(rawCategories) as CategoryDef[];
        setCategories([...SYSTEM_CATEGORIES, ...custom]);
      }
    } catch {
      // Corrupt or blocked storage: fall back silently to the seeded demo state.
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable (private mode) — data still lives in memory.
    }
  }, [ready, state]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {
      // ignore
    }
  }, [ready, preferences]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(NOTIF_READS_KEY, JSON.stringify(readsByProfile));
    } catch {
      // ignore
    }
  }, [ready, readsByProfile]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories.filter((c) => !c.isSystem)));
    } catch {
      // ignore
    }
  }, [ready, categories]);

  const activeProfile = preferences.activeProfile;
  const unreadNotifications = useMemo(
    () => state.notifications.filter((n) => !(readsByProfile[n.id] ?? []).includes(activeProfile)),
    [state.notifications, readsByProfile, activeProfile],
  );

  const value = useMemo<AppStoreValue>(() => {
    const now = () => new Date().toISOString();
    return {
      ...state,
      notifications: unreadNotifications,
      categories,
      ready,
      preferences,
      toasts,
      showToast,
      setActiveProfile: (id) =>
        setPreferences((p) => ({ ...p, activeProfile: id, hasOnboarded: true })),
      setCalendarFilters: (filters) =>
        setPreferences((p) => ({ ...p, calendarFilters: filters })),
      setReducedMotionOverride: (value) =>
        setPreferences((p) => ({ ...p, reducedMotionOverride: value })),
      addEvent: (event) => {
        const created: CalendarEvent = { ...event, id: uuid(), createdAt: now(), updatedAt: now() };
        dispatch({ type: "ADD_EVENT", payload: created });
        dispatch({
          type: "ADD_ACTIVITY",
          payload: { id: uuid(), actorId: activeProfile, message: eventCreatedMessage(created.title), createdAt: now() },
        });
        return Promise.resolve(created);
      },
      updateEvent: (id, patch) => {
        const existing = state.events.find((e) => e.id === id);
        if (!existing) return;
        dispatch({
          type: "UPDATE_EVENT",
          payload: { ...existing, ...patch, updatedAt: now() },
        });
      },
      deleteEvent: (id, deleteLinkedTasks) => {
        const deletedTitle = state.events.find((e) => e.id === id)?.title ?? "";
        dispatch({ type: "DELETE_EVENT", payload: { id } });
        dispatch({
          type: "ADD_ACTIVITY",
          payload: { id: uuid(), actorId: activeProfile, message: eventDeletedMessage(deletedTitle), createdAt: now() },
        });
        const linked = state.tasks.filter((t) => t.linkedEventId === id);
        for (const task of linked) {
          if (deleteLinkedTasks) {
            dispatch({ type: "DELETE_TASK", payload: { id: task.id } });
          } else {
            dispatch({ type: "UPDATE_TASK", payload: { ...task, linkedEventId: null, updatedAt: now() } });
          }
        }
      },
      addTask: (task) => {
        const created: TaskItem = {
          ...task,
          sortOrder: task.sortOrder ?? 0,
          id: uuid(),
          createdAt: now(),
          updatedAt: now(),
        };
        dispatch({ type: "ADD_TASK", payload: created });
        if (!created.isShopping) {
          dispatch({
            type: "ADD_ACTIVITY",
            payload: { id: uuid(), actorId: activeProfile, message: taskCreatedMessage(created.title), createdAt: now() },
          });
        }
        return Promise.resolve(created);
      },
      updateTask: (id, patch) => {
        const existing = state.tasks.find((t) => t.id === id);
        if (!existing) return;
        dispatch({
          type: "UPDATE_TASK",
          payload: { ...existing, ...patch, updatedAt: now() },
        });
      },
      deleteTask: (id) => {
        const deleted = state.tasks.find((t) => t.id === id);
        dispatch({ type: "DELETE_TASK", payload: { id } });
        if (deleted && !deleted.isShopping) {
          dispatch({
            type: "ADD_ACTIVITY",
            payload: { id: uuid(), actorId: activeProfile, message: taskDeletedMessage(deleted.title), createdAt: now() },
          });
        }
      },
      toggleTask: (id) => {
        const existing = state.tasks.find((t) => t.id === id);
        if (!existing) return;
        const done = !existing.done;
        const merged = { ...existing, done, doneAt: done ? now() : null, updatedAt: now() };
        dispatch({ type: "UPDATE_TASK", payload: merged });
        if (!done || existing.isShopping) return;
        dispatch({
          type: "ADD_ACTIVITY",
          payload: { id: uuid(), actorId: activeProfile, message: taskDoneMessage(existing.title), createdAt: now() },
        });
        const next = nextTaskOccurrence(merged);
        if (next) {
          dispatch({ type: "ADD_TASK", payload: { ...next, id: uuid(), createdAt: now(), updatedAt: now() } });
        }
      },
      toggleSubtask: (taskId, subtaskId) =>
        dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId } }),
      addSavingsGoal: (goal) => {
        const created: SavingsGoal = { ...goal, id: uuid(), createdAt: now() };
        dispatch({ type: "ADD_SAVINGS_GOAL", payload: created });
        dispatch({
          type: "ADD_ACTIVITY",
          payload: { id: uuid(), actorId: activeProfile, message: savingsGoalCreatedMessage(created.title), createdAt: now() },
        });
      },
      addSavingsEntry: (entry) => {
        const created: SavingsEntry = { ...entry, id: uuid(), createdAt: now() };
        dispatch({ type: "ADD_SAVINGS_ENTRY", payload: created });
        const goalTitle = state.savingsGoals.find((g) => g.id === entry.goalId)?.title ?? "";
        dispatch({
          type: "ADD_ACTIVITY",
          payload: {
            id: uuid(),
            actorId: activeProfile,
            message: savingsEntryAddedMessage(created.amount, goalTitle),
            createdAt: now(),
          },
        });
      },
      markNotificationRead: (id) =>
        setReadsByProfile((prev) => {
          const list = prev[id] ?? [];
          if (list.includes(activeProfile)) return prev;
          return { ...prev, [id]: [...list, activeProfile] };
        }),
      markAllNotificationsRead: () =>
        setReadsByProfile((prev) => {
          const next = { ...prev };
          for (const n of unreadNotifications) {
            const list = next[n.id] ?? [];
            if (!list.includes(activeProfile)) next[n.id] = [...list, activeProfile];
          }
          return next;
        }),
      addLocalNotification: (notification) =>
        dispatch({
          type: "UPSERT_NOTIFICATION",
          payload: { ...notification, id: uuid(), type: null, assignee: null, createdAt: now() },
        }),
      addCategory: (input) => {
        const error = validateCategoryName(input.label, categories.map((c) => c.label));
        if (error) return Promise.reject(new Error(error));
        const key = slugifyCategoryKey(
          input.label,
          categories.map((c) => c.key),
        );
        const created: CategoryDef = {
          id: uuid(),
          key,
          label: input.label.trim(),
          icon: input.icon,
          color: input.color,
          isSystem: false,
        };
        setCategories((prev) => [...prev, created]);
        dispatch({
          type: "ADD_ACTIVITY",
          payload: { id: uuid(), actorId: activeProfile, message: categoryCreatedMessage(created.label), createdAt: now() },
        });
        return Promise.resolve(created);
      },
      updateCategory: (id, patch) => {
        const existing = categories.find((c) => c.id === id);
        if (!existing) return Promise.reject(new Error("Kategorie nicht gefunden."));
        if (existing.isSystem) return Promise.reject(new Error("Diese Kategorie kann nicht geändert werden."));
        if (patch.label !== undefined) {
          const error = validateCategoryName(
            patch.label,
            categories.filter((c) => c.id !== id).map((c) => c.label),
          );
          if (error) return Promise.reject(new Error(error));
        }
        setCategories((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, label: patch.label?.trim() ?? c.label, icon: patch.icon ?? c.icon, color: patch.color ?? c.color }
              : c,
          ),
        );
        return Promise.resolve();
      },
      deleteCategory: (id) => {
        const existing = categories.find((c) => c.id === id);
        if (!existing) return Promise.reject(new Error("Kategorie nicht gefunden."));
        if (existing.isSystem) return Promise.reject(new Error("Diese Kategorie kann nicht gelöscht werden."));
        setCategories((prev) => prev.filter((c) => c.id !== id));
        for (const event of state.events) {
          if (event.category === existing.key) {
            dispatch({ type: "UPDATE_EVENT", payload: { ...event, category: null, updatedAt: now() } });
          }
        }
        dispatch({
          type: "ADD_ACTIVITY",
          payload: { id: uuid(), actorId: activeProfile, message: categoryDeletedMessage(existing.label), createdAt: now() },
        });
        return Promise.resolve();
      },
      addNote: () => {
        const created: Note = { id: uuid(), title: "", body: "", updatedBy: activeProfile, createdAt: now(), updatedAt: now() };
        dispatch({ type: "UPSERT_NOTE", payload: created });
        dispatch({
          type: "ADD_ACTIVITY",
          payload: { id: uuid(), actorId: activeProfile, message: noteCreatedMessage(""), createdAt: now() },
        });
        return Promise.resolve(created);
      },
      updateNote: (id, patch) => {
        const existing = state.notes.find((n) => n.id === id);
        if (!existing) return;
        dispatch({
          type: "UPSERT_NOTE",
          payload: { ...existing, ...patch, updatedBy: activeProfile, updatedAt: now() },
        });
      },
      deleteNote: (id) => dispatch({ type: "DELETE_NOTE", payload: { id } }),
      restoreFromBackup: (data) => {
        dispatch({ type: "HYDRATE", payload: data });
        return true;
      },
    };
  }, [state, unreadNotifications, categories, activeProfile, ready, preferences, toasts, showToast]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

// ---------------------------------------------------------------------------
// Supabase mode — reads/writes go straight to Postgres; a Realtime
// subscription keeps every open device (Domenico's and Elisabeth's phones)
// in sync. Every mutation awaits the write, dispatches locally with the
// server-confirmed row, and the following Realtime echo of that same
// change is a harmless, idempotent no-op (see the reducer above).
// ---------------------------------------------------------------------------

function SupabaseAppStoreProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady, session, profile, personId } = useSupabaseAuth();
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [userPrefs, setUserPrefs] = useState<{ reducedMotionOverride: boolean | null; calendarFilters: Assignee[] | "alle" }>({
    reducedMotionOverride: null,
    calendarFilters: "alle",
  });
  const { toasts, showToast } = useToasts();
  const stateRef = useRef(state);
  const categoriesRef = useRef(categories);
  // The family's two profile rows (uuid <-> personId), needed to resolve
  // Realtime payloads for notes/activity_log — both store a raw profile
  // uuid, unlike events/tasks which already store "domenico"/"elisabeth"
  // directly. Never exposed on AppStoreValue; purely an internal lookup.
  const profilesRef = useRef<repo.FamilyProfileRef[]>([]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const familyId = profile?.familyId ?? null;

  // Initial data load once we know which family we're in.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!familyId) {
      dispatch({ type: "HYDRATE", payload: EMPTY_STATE });
      setDataReady(false);
      return;
    }
    let cancelled = false;
    setDataReady(false);
    repo.fetchFamilyData(familyId).then(
      (data) => {
        if (cancelled) return;
        setCategories(data.categories);
        profilesRef.current = data.profiles;
        dispatch({
          type: "HYDRATE",
          payload: {
            events: data.events,
            tasks: data.tasks,
            savingsGoals: data.savingsGoals,
            savingsEntries: data.savingsEntries,
            notifications: data.notifications,
            notes: data.notes,
            activity: data.activity,
          },
        });
        setDataReady(true);
      },
      () => setDataReady(true),
    );
    return () => {
      cancelled = true;
    };
  }, [familyId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Own preferences row (private, never shared via Realtime).
  useEffect(() => {
    if (!profile) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from("user_preferences")
      .select("reduced_motion_override, calendar_filters")
      .eq("profile_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setUserPrefs({
          reducedMotionOverride: data.reduced_motion_override,
          calendarFilters: (data.calendar_filters as Assignee[] | "alle") ?? "alle",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  // Realtime: mirror every change either phone makes.
  useEffect(() => {
    if (!familyId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`family-${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `family_id=eq.${familyId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            dispatch({ type: "DELETE_EVENT", payload: { id: (payload.old as { id: string }).id } });
          } else {
            const event = repo.rowToEvent(payload.new as Record<string, unknown>, categoriesRef.current);
            dispatch({ type: payload.eventType === "INSERT" ? "ADD_EVENT" : "UPDATE_EVENT", payload: event });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `family_id=eq.${familyId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            dispatch({ type: "DELETE_TASK", payload: { id: (payload.old as { id: string }).id } });
          } else {
            const row = payload.new as Record<string, unknown>;
            const existing = stateRef.current.tasks.find((t) => t.id === row.id);
            const task = repo.rowToTask(row, existing?.subtasks ?? []);
            dispatch({ type: payload.eventType === "INSERT" ? "ADD_TASK" : "UPDATE_TASK", payload: task });

            // Surface the partner's shopping-list checks live, so ticking
            // something off feels shared instead of silent.
            const updatedBy = row.updated_by as string | null;
            if (
              payload.eventType === "UPDATE" &&
              task.isShopping &&
              task.done &&
              existing &&
              !existing.done &&
              updatedBy &&
              updatedBy !== profile?.id
            ) {
              const otherName = personId === "domenico" ? PROFILES.elisabeth.name : PROFILES.domenico.name;
              showToast(`${otherName} hat „${task.title}“ abgehakt`);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_subtasks" },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
          const taskId = row.task_id as string;
          if (!stateRef.current.tasks.some((t) => t.id === taskId)) return;
          if (payload.eventType === "DELETE") {
            dispatch({
              type: "UPDATE_TASK",
              payload: {
                ...stateRef.current.tasks.find((t) => t.id === taskId)!,
                subtasks: stateRef.current.tasks
                  .find((t) => t.id === taskId)!
                  .subtasks.filter((s) => s.id !== row.id),
              },
            });
          } else {
            dispatch({
              type: "SET_SUBTASK_DONE",
              payload: { taskId, subtaskId: row.id as string, done: row.done as boolean },
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "savings_goals", filter: `family_id=eq.${familyId}` },
        (payload) => {
          if (payload.eventType !== "DELETE") {
            dispatch({ type: "ADD_SAVINGS_GOAL", payload: repo.rowToGoal(payload.new as Record<string, unknown>) });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "savings_entries" },
        (payload) => {
          dispatch({ type: "ADD_SAVINGS_ENTRY", payload: repo.rowToEntry(payload.new as Record<string, unknown>) });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `family_id=eq.${familyId}` },
        (payload) => {
          if (payload.eventType !== "DELETE") {
            dispatch({
              type: "UPSERT_NOTIFICATION",
              payload: repo.rowToNotification(payload.new as Record<string, unknown>),
            });
          }
        },
      )
      // My own read receipts only — reading it as Domenico must never
      // touch Elisabeth's copy of this same shared notification, so this
      // is filtered to MY profile id, not the family. Covers this device's
      // own optimistic mark-as-read echoing back, plus a read made from a
      // second device signed in as the same person.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_reads", filter: `profile_id=eq.${profile?.id}` },
        (payload) => {
          const row = payload.new as { notification_id: string };
          dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id: row.notification_id } });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `family_id=eq.${familyId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setCategories((prev) => prev.filter((c) => c.id !== id));
          } else {
            const row = repo.rowToCategory(payload.new as Record<string, unknown>);
            setCategories((prev) =>
              prev.some((c) => c.id === row.id) ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row],
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `family_id=eq.${familyId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            dispatch({ type: "DELETE_NOTE", payload: { id: (payload.old as { id: string }).id } });
          } else {
            const note = repo.rowToNote(payload.new as Record<string, unknown>, profilesRef.current);
            dispatch({ type: "UPSERT_NOTE", payload: note });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter: `family_id=eq.${familyId}` },
        (payload) => {
          const entry = repo.rowToActivity(payload.new as Record<string, unknown>, profilesRef.current);
          dispatch({ type: "ADD_ACTIVITY", payload: entry });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Resubscribes only when the family changes; profile/personId/showToast
    // are read fresh inside the handler on each event, not captured stale —
    // they only ever change together with familyId in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const value = useMemo<AppStoreValue>(() => {
    const requireFamily = () => {
      if (!familyId || !profile) throw new Error("no active family");
      return { familyId, profileId: profile.id };
    };

    return {
      ...state,
      categories,
      ready: authReady && (!session || dataReady),
      preferences: {
        activeProfile: personId ?? "domenico",
        reducedMotionOverride: userPrefs.reducedMotionOverride,
        calendarFilters: userPrefs.calendarFilters,
        hasOnboarded: Boolean(session && profile?.familyId),
      },
      toasts,
      showToast,
      setActiveProfile: () => {
        // Identity comes from the signed-in account in Supabase mode.
      },
      setCalendarFilters: (filters) => {
        setUserPrefs((p) => ({ ...p, calendarFilters: filters }));
        if (!profile) return;
        void getSupabaseClient()
          ?.from("user_preferences")
          .update({ calendar_filters: filters })
          .eq("profile_id", profile.id);
      },
      setReducedMotionOverride: (value) => {
        setUserPrefs((p) => ({ ...p, reducedMotionOverride: value }));
        if (!profile) return;
        void getSupabaseClient()
          ?.from("user_preferences")
          .update({ reduced_motion_override: value })
          .eq("profile_id", profile.id);
      },
      addEvent: (event) => {
        const { familyId, profileId } = requireFamily();
        return repo.insertEvent(familyId, categoriesRef.current, profileId, event).then((row) => {
          dispatch({ type: "ADD_EVENT", payload: row });
          void repo.logActivity(familyId, profileId, eventCreatedMessage(row.title));
          return row;
        });
      },
      updateEvent: (id, patch) => {
        const existing = stateRef.current.events.find((e) => e.id === id);
        if (!existing) return;
        const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        dispatch({ type: "UPDATE_EVENT", payload: merged });
        const { familyId } = requireFamily();
        void repo.updateEventRow(familyId, id, categoriesRef.current, patch, merged);
      },
      deleteEvent: (id, deleteLinkedTasks) => {
        const deletedTitle = stateRef.current.events.find((e) => e.id === id)?.title ?? "";
        const linked = stateRef.current.tasks.filter((t) => t.linkedEventId === id);
        const { familyId, profileId } = requireFamily();
        dispatch({ type: "DELETE_EVENT", payload: { id } });
        void repo.deleteEventRow(id);
        void repo.logActivity(familyId, profileId, eventDeletedMessage(deletedTitle));
        for (const task of linked) {
          if (deleteLinkedTasks) {
            dispatch({ type: "DELETE_TASK", payload: { id: task.id } });
            void repo.deleteTaskRow(task.id);
          } else {
            const unlinked = { ...task, linkedEventId: null, updatedAt: new Date().toISOString() };
            dispatch({ type: "UPDATE_TASK", payload: unlinked });
            void repo.updateTaskRow(familyId, task.id, { linkedEventId: null }, unlinked, profile?.id ?? null, null);
          }
        }
      },
      addTask: (task) => {
        const { familyId, profileId } = requireFamily();
        const linkedEvent = task.linkedEventId
          ? (stateRef.current.events.find((e) => e.id === task.linkedEventId) ?? null)
          : null;
        return repo
          .insertTask(familyId, profileId, { ...task, sortOrder: task.sortOrder ?? 0 }, linkedEvent)
          .then((row) => {
            dispatch({ type: "ADD_TASK", payload: row });
            if (!row.isShopping) void repo.logActivity(familyId, profileId, taskCreatedMessage(row.title));
            return row;
          });
      },
      updateTask: (id, patch) => {
        const existing = stateRef.current.tasks.find((t) => t.id === id);
        if (!existing) return;
        const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        dispatch({ type: "UPDATE_TASK", payload: merged });
        const { familyId } = requireFamily();
        const linkedEvent = merged.linkedEventId
          ? (stateRef.current.events.find((e) => e.id === merged.linkedEventId) ?? null)
          : null;
        void repo.updateTaskRow(familyId, id, patch, merged, profile?.id ?? null, linkedEvent);
      },
      deleteTask: (id) => {
        const deleted = stateRef.current.tasks.find((t) => t.id === id);
        dispatch({ type: "DELETE_TASK", payload: { id } });
        void repo.deleteTaskRow(id);
        if (deleted && !deleted.isShopping) {
          const { familyId, profileId } = requireFamily();
          void repo.logActivity(familyId, profileId, taskDeletedMessage(deleted.title));
        }
      },
      toggleTask: (id) => {
        const existing = stateRef.current.tasks.find((t) => t.id === id);
        if (!existing) return;
        const done = !existing.done;
        const doneAt = done ? new Date().toISOString() : null;
        const merged = { ...existing, done, doneAt, updatedAt: new Date().toISOString() };
        dispatch({ type: "UPDATE_TASK", payload: merged });
        const { familyId, profileId } = requireFamily();
        const linkedEvent = merged.linkedEventId
          ? (stateRef.current.events.find((e) => e.id === merged.linkedEventId) ?? null)
          : null;
        void repo.updateTaskRow(familyId, id, { done, doneAt }, merged, profile?.id ?? null, linkedEvent);
        if (done && !existing.isShopping) {
          void repo.logActivity(familyId, profileId, taskDoneMessage(existing.title));
        }
        if (done) {
          const next = nextTaskOccurrence(merged);
          if (next) {
            repo
              .insertTask(familyId, profileId, next, null)
              .then((row) => dispatch({ type: "ADD_TASK", payload: row }));
          }
        }
      },
      toggleSubtask: (taskId, subtaskId) => {
        const task = stateRef.current.tasks.find((t) => t.id === taskId);
        const subtask = task?.subtasks.find((s) => s.id === subtaskId);
        if (!subtask) return;
        const done = !subtask.done;
        dispatch({ type: "SET_SUBTASK_DONE", payload: { taskId, subtaskId, done } });
        void repo.toggleSubtaskRow(subtaskId, done);
      },
      addSavingsGoal: (goal) => {
        const { familyId, profileId } = requireFamily();
        repo.insertSavingsGoal(familyId, profileId, goal).then((row) => {
          dispatch({ type: "ADD_SAVINGS_GOAL", payload: row });
          void repo.logActivity(familyId, profileId, savingsGoalCreatedMessage(row.title));
        });
      },
      addSavingsEntry: (entry) => {
        const { familyId, profileId } = requireFamily();
        const goalTitle = stateRef.current.savingsGoals.find((g) => g.id === entry.goalId)?.title ?? "";
        repo.insertSavingsEntry(profile?.id ?? null, entry).then((row) => {
          dispatch({ type: "ADD_SAVINGS_ENTRY", payload: row });
          void repo.logActivity(familyId, profileId, savingsEntryAddedMessage(row.amount, goalTitle));
        });
      },
      markNotificationRead: (id) => {
        dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });
        if (!profile) return;
        void repo.markNotificationReadRow(id, profile.id);
      },
      markAllNotificationsRead: () => {
        const ids = stateRef.current.notifications.map((n) => n.id);
        dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
        if (!profile) return;
        void repo.markAllNotificationsReadRows(ids, profile.id);
      },
      addLocalNotification: (notification) =>
        dispatch({
          type: "UPSERT_NOTIFICATION",
          payload: { ...notification, id: uuid(), type: null, assignee: null, createdAt: new Date().toISOString() },
        }),
      addCategory: (input) => {
        const { familyId, profileId } = requireFamily();
        const error = validateCategoryName(input.label, categoriesRef.current.map((c) => c.label));
        if (error) return Promise.reject(new Error(error));
        return repo
          .insertCategoryRow(
            familyId,
            profileId,
            categoriesRef.current.map((c) => c.key),
            input,
          )
          .then((row) => {
            setCategories((prev) => [...prev, row]);
            void repo.logActivity(familyId, profileId, categoryCreatedMessage(row.label));
            return row;
          });
      },
      updateCategory: (id, patch) => {
        const existing = categoriesRef.current.find((c) => c.id === id);
        if (!existing) return Promise.reject(new Error("Kategorie nicht gefunden."));
        if (existing.isSystem) return Promise.reject(new Error("Diese Kategorie kann nicht geändert werden."));
        if (patch.label !== undefined) {
          const error = validateCategoryName(
            patch.label,
            categoriesRef.current.filter((c) => c.id !== id).map((c) => c.label),
          );
          if (error) return Promise.reject(new Error(error));
        }
        setCategories((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, label: patch.label?.trim() ?? c.label, icon: patch.icon ?? c.icon, color: patch.color ?? c.color }
              : c,
          ),
        );
        return repo.updateCategoryRow(id, patch);
      },
      deleteCategory: (id) => {
        const existing = categoriesRef.current.find((c) => c.id === id);
        if (!existing) return Promise.reject(new Error("Kategorie nicht gefunden."));
        if (existing.isSystem) return Promise.reject(new Error("Diese Kategorie kann nicht gelöscht werden."));
        setCategories((prev) => prev.filter((c) => c.id !== id));
        // events.category_id has ON DELETE SET NULL — no manual
        // reassignment needed; the Realtime UPDATE echo for each affected
        // event will land here with category: null once Postgres applies it.
        return repo.deleteCategoryRow(id).then(() => {
          if (familyId) void repo.logActivity(familyId, profile?.id ?? null, categoryDeletedMessage(existing.label));
        });
      },
      addNote: () => {
        const { familyId, profileId } = requireFamily();
        return repo.insertNoteRow(familyId, profileId, { title: "", body: "" }, profilesRef.current).then((row) => {
          dispatch({ type: "UPSERT_NOTE", payload: row });
          void repo.logActivity(familyId, profileId, noteCreatedMessage(""));
          return row;
        });
      },
      updateNote: (id, patch) => {
        const existing = stateRef.current.notes.find((n) => n.id === id);
        if (!existing) return;
        const { profileId } = requireFamily();
        const merged = { ...existing, ...patch, updatedBy: personId, updatedAt: new Date().toISOString() };
        dispatch({ type: "UPSERT_NOTE", payload: merged });
        void repo.updateNoteRow(id, profileId, patch);
      },
      deleteNote: (id) => {
        dispatch({ type: "DELETE_NOTE", payload: { id } });
        void repo.deleteNoteRow(id);
      },
      restoreFromBackup: () => false,
    };
  }, [state, categories, authReady, session, dataReady, personId, userPrefs, toasts, showToast, familyId, profile]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return <DemoAppStoreProvider>{children}</DemoAppStoreProvider>;
  }
  return (
    <SupabaseAuthProvider>
      <SupabaseAppStoreProvider>{children}</SupabaseAppStoreProvider>
    </SupabaseAuthProvider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
