"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import { createDemoDataset, DEMO_NOTIFICATIONS } from "@/lib/demo-data";
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

type Action =
  | { type: "ADD_EVENT"; payload: CalendarEvent }
  | { type: "UPDATE_EVENT"; payload: CalendarEvent }
  | { type: "DELETE_EVENT"; payload: { id: string } }
  | { type: "ADD_TASK"; payload: TaskItem }
  | { type: "UPDATE_TASK"; payload: TaskItem }
  | { type: "DELETE_TASK"; payload: { id: string } }
  | { type: "TOGGLE_TASK"; payload: { id: string } }
  | { type: "TOGGLE_SUBTASK"; payload: { taskId: string; subtaskId: string } }
  | { type: "ADD_SAVINGS_GOAL"; payload: SavingsGoal }
  | { type: "ADD_SAVINGS_ENTRY"; payload: SavingsEntry }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: string } }
  | { type: "HYDRATE"; payload: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.payload] };
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
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.payload] };
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
    case "ADD_SAVINGS_GOAL":
      return { ...state, savingsGoals: [...state.savingsGoals, action.payload] };
    case "ADD_SAVINGS_ENTRY":
      return { ...state, savingsEntries: [...state.savingsEntries, action.payload] };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload.id ? { ...n, read: true } : n,
        ),
      };
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

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // One-time localStorage hydration: must run client-only (SSR has no
  // localStorage), so the server/first-paint state is intentionally the
  // seeded default and this effect reconciles it immediately after mount.
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
    // Flip `ready` only after the loaded state/preferences above are queued
    // in the same batch, so the write-effects below never fire with the
    // pre-hydration defaults and clobber what's actually on disk.
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

  const showToast = useCallback((message: string) => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

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
    };
  }, [state, ready, preferences, toasts, showToast]);

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
