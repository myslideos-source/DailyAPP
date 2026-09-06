import type {
  ActivityEntry,
  AppNotification,
  CalendarEvent,
  Note,
  SavingsEntry,
  SavingsGoal,
  TaskItem,
} from "./types";

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  events: CalendarEvent[];
  tasks: TaskItem[];
  savingsGoals: SavingsGoal[];
  savingsEntries: SavingsEntry[];
  notifications: AppNotification[];
  notes: Note[];
  activity: ActivityEntry[];
}

export function serializeBackup(data: Omit<BackupPayload, "version" | "exportedAt">): string {
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackup(json: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Die Datei enthält kein gültiges JSON.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    !Array.isArray((parsed as BackupPayload).events) ||
    !Array.isArray((parsed as BackupPayload).tasks) ||
    !Array.isArray((parsed as BackupPayload).savingsGoals) ||
    !Array.isArray((parsed as BackupPayload).savingsEntries)
  ) {
    throw new Error("Das sieht nicht nach einer dayli-Sicherung aus.");
  }

  const data = parsed as BackupPayload;
  return {
    version: 1,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    events: data.events,
    tasks: data.tasks,
    savingsGoals: data.savingsGoals,
    savingsEntries: data.savingsEntries,
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    activity: Array.isArray(data.activity) ? data.activity : [],
  };
}

export function downloadBackup(json: string, filename = `dayli-backup-${new Date().toISOString().slice(0, 10)}.json`) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
