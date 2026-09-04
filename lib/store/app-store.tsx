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
import { createDemoDataset, DEMO_NOTIFICATIONS } from "@/lib/demo-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SupabaseAuthProvider, useSupabaseAuth } from "@/lib/store/auth-context";
import * as repo from "@/lib/supabase/repository";
import type { CategoryRef } from "@/lib/supabase/repository";
import type {
  AppNotification,
  Assignee,
  CalendarEvent,
  PersonId,
  SavingsEntry,
  SavingsGoal,
  Subtask,
  TaskItem,
  UserPreferences,
} from "@/lib/types";

const STORAGE_KEY = "dayli:data:v1";
const PREFS_KEY = "dayli:prefs:v1";

interface AppState {
  events: CalendarEvent[];
  tasks: TaskItem[];
  savingsGoals: SavingsGoal[];
  savingsEntries: SavingsEntry[];
  notifications: AppNotification[];
}

const EMPTY_STATE: AppState = {
  events: [],
  tasks: [],
  savingsGoals: [],
  savingsEntries: [],
  notifications: [],
};

type Action =
  | { type: "ADD_EVENT"; payload: CalendarEvent }
  | { type: "UPDATE_EVENT"; payload: CalendarEvent }
  | { type: "DELETE_EVENT"; payload: { id: string } }
  | { type: "ADD_TASK"; payload: TaskItem }
  | { type: "UPDATE_TASK"; payload: TaskItem }
  | { type: "DELETE_TASK"; payload: { id: string } }
  | { type: "TOGGLE_TASK"; payload: { id: string } }
  | { type: "TOGGLE_SUBTASK"; payload: { taskId: string; subtaskId: string } }
  | { type: "SET_SUBTASK_DONE"; payload: { taskId: string; subtaskId: string; done: boolean } }
  | { type: "ADD_SAVINGS_GOAL"; payload: SavingsGoal }
  | { type: "ADD_SAVINGS_ENTRY"; payload: SavingsEntry }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: string } }
  | { type: "UPSERT_NOTIFICATION"; payload: AppNotification }
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
    case "TOGGLE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id
            ? {
                ...t,
                done: !t.done,
                doneAt: !t.done ? new Date().toISOString() : null,
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
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
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload.id ? { ...n, read: true } : n,
        ),
      };
    case "UPSERT_NOTIFICATION": {
      const exists = state.notifications.some((n) => n.id === action.payload.id);
      return {
        ...state,
        notifications: exists
          ? state.notifications.map((n) => (n.id === action.payload.id ? action.payload : n))
          : [action.payload, ...state.notifications],
      };
    }
    default:
      return state;
  }
}

function loadInitialState(): AppState {
  const demo = createDemoDataset();
  return { ...demo, notifications: DEMO_NOTIFICATIONS };
}

interface Toast {
  id: string;
  message: string;
}

interface AppStoreValue extends AppState {
  ready: boolean;
  preferences: UserPreferences;
  setActiveProfile: (id: PersonId) => void;
  setCalendarFilters: (filters: Assignee[] | "alle") => void;
  setReducedMotionOverride: (value: boolean | null) => void;
  addEvent: (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  addTask: (task: Omit<TaskItem, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "createdAt">) => void;
  addSavingsEntry: (entry: Omit<SavingsEntry, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  /** Appends a device-local notification (e.g. a fired reminder) straight
   * into the bell list without a round-trip — never synced to other
   * devices, since it's derived from this device's own reminder check. */
  addLocalNotification: (notification: { title: string; body: string }) => void;
  /** Demo mode only — replaces all local data with a previously exported
   * backup. Returns false (and leaves data untouched) when unsupported,
   * e.g. in Supabase mode where restoring shared family data from a local
   * file risks clobbering the other person's device. */
  restoreFromBackup: (data: AppState) => boolean;
  toasts: Toast[];
  showToast: (message: string) => void;
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
  const showToast = useCallback((message: string) => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
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

  const value = useMemo<AppStoreValue>(() => {
    const now = () => new Date().toISOString();
    return {
      ...state,
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
      addEvent: (event) =>
        dispatch({
          type: "ADD_EVENT",
          payload: { ...event, id: uuid(), createdAt: now(), updatedAt: now() },
        }),
      updateEvent: (id, patch) => {
        const existing = state.events.find((e) => e.id === id);
        if (!existing) return;
        dispatch({
          type: "UPDATE_EVENT",
          payload: { ...existing, ...patch, updatedAt: now() },
        });
      },
      deleteEvent: (id) => dispatch({ type: "DELETE_EVENT", payload: { id } }),
      addTask: (task) =>
        dispatch({
          type: "ADD_TASK",
          payload: { ...task, id: uuid(), createdAt: now(), updatedAt: now() },
        }),
      updateTask: (id, patch) => {
        const existing = state.tasks.find((t) => t.id === id);
        if (!existing) return;
        dispatch({
          type: "UPDATE_TASK",
          payload: { ...existing, ...patch, updatedAt: now() },
        });
      },
      deleteTask: (id) => dispatch({ type: "DELETE_TASK", payload: { id } }),
      toggleTask: (id) => dispatch({ type: "TOGGLE_TASK", payload: { id } }),
      toggleSubtask: (taskId, subtaskId) =>
        dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId } }),
      addSavingsGoal: (goal) =>
        dispatch({
          type: "ADD_SAVINGS_GOAL",
          payload: { ...goal, id: uuid(), createdAt: now() },
        }),
      addSavingsEntry: (entry) =>
        dispatch({
          type: "ADD_SAVINGS_ENTRY",
          payload: { ...entry, id: uuid(), createdAt: now() },
        }),
      markNotificationRead: (id) =>
        dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } }),
      addLocalNotification: (notification) =>
        dispatch({
          type: "UPSERT_NOTIFICATION",
          payload: { ...notification, id: uuid(), read: false, createdAt: now() },
        }),
      restoreFromBackup: (data) => {
        dispatch({ type: "HYDRATE", payload: data });
        return true;
      },
    };
  }, [state, ready, preferences, toasts, showToast]);

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
  const [categories, setCategories] = useState<CategoryRef[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [userPrefs, setUserPrefs] = useState<{ reducedMotionOverride: boolean | null; calendarFilters: Assignee[] | "alle" }>({
    reducedMotionOverride: null,
    calendarFilters: "alle",
  });
  const { toasts, showToast } = useToasts();
  const stateRef = useRef(state);
  const categoriesRef = useRef(categories);
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
        dispatch({
          type: "HYDRATE",
          payload: {
            events: data.events,
            tasks: data.tasks,
            savingsGoals: data.savingsGoals,
            savingsEntries: data.savingsEntries,
            notifications: data.notifications,
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  const value = useMemo<AppStoreValue>(() => {
    const requireFamily = () => {
      if (!familyId || !profile) throw new Error("no active family");
      return { familyId, profileId: profile.id };
    };

    return {
      ...state,
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
        repo.insertEvent(familyId, categoriesRef.current, profileId, event).then((row) =>
          dispatch({ type: "ADD_EVENT", payload: row }),
        );
      },
      updateEvent: (id, patch) => {
        const existing = stateRef.current.events.find((e) => e.id === id);
        if (!existing) return;
        const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        dispatch({ type: "UPDATE_EVENT", payload: merged });
        const { familyId } = requireFamily();
        void repo.updateEventRow(familyId, id, categoriesRef.current, patch, merged);
      },
      deleteEvent: (id) => {
        dispatch({ type: "DELETE_EVENT", payload: { id } });
        void repo.deleteEventRow(id);
      },
      addTask: (task) => {
        const { familyId, profileId } = requireFamily();
        repo.insertTask(familyId, profileId, task).then((row) =>
          dispatch({ type: "ADD_TASK", payload: row }),
        );
      },
      updateTask: (id, patch) => {
        const existing = stateRef.current.tasks.find((t) => t.id === id);
        if (!existing) return;
        const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        dispatch({ type: "UPDATE_TASK", payload: merged });
        void repo.updateTaskRow(id, patch);
      },
      deleteTask: (id) => {
        dispatch({ type: "DELETE_TASK", payload: { id } });
        void repo.deleteTaskRow(id);
      },
      toggleTask: (id) => {
        const existing = stateRef.current.tasks.find((t) => t.id === id);
        if (!existing) return;
        const done = !existing.done;
        const doneAt = done ? new Date().toISOString() : null;
        dispatch({ type: "UPDATE_TASK", payload: { ...existing, done, doneAt, updatedAt: new Date().toISOString() } });
        void repo.updateTaskRow(id, { done, doneAt });
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
        repo.insertSavingsGoal(familyId, profileId, goal).then((row) =>
          dispatch({ type: "ADD_SAVINGS_GOAL", payload: row }),
        );
      },
      addSavingsEntry: (entry) => {
        repo.insertSavingsEntry(profile?.id ?? null, entry).then((row) =>
          dispatch({ type: "ADD_SAVINGS_ENTRY", payload: row }),
        );
      },
      markNotificationRead: (id) => {
        dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });
        void repo.markNotificationReadRow(id);
      },
      addLocalNotification: (notification) =>
        dispatch({
          type: "UPSERT_NOTIFICATION",
          payload: { ...notification, id: uuid(), read: false, createdAt: new Date().toISOString() },
        }),
      restoreFromBackup: () => false,
    };
  }, [state, authReady, session, dataReady, personId, userPrefs, toasts, showToast, familyId, profile]);

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
