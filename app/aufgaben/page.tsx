"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
import { TaskGroup } from "@/components/tasks/TaskGroup";
import { ShoppingList } from "@/components/tasks/ShoppingList";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";
import { assigneeColor } from "@/lib/theme";
import { toISODate } from "@/lib/date-utils";
import type { Assignee } from "@/lib/types";

const FILTERS: { value: Assignee | "alle"; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "domenico", label: "Domenico" },
  { value: "elisabeth", label: "Elisabeth" },
  { value: "gemeinsam", label: "Gemeinsam" },
];

export default function AufgabenPage() {
  const { tasks } = useAppStore();
  const [filter, setFilter] = useState<Assignee | "alle">("alle");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const today = toISODate(new Date());

  const regular = useMemo(
    () => tasks.filter((t) => !t.isShopping && (filter === "alle" || t.assignee === filter)),
    [tasks, filter],
  );
  const shopping = useMemo(() => tasks.filter((t) => t.isShopping), [tasks]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, query]);

  const open = regular.filter((t) => !t.done);
  const done = regular.filter((t) => t.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const noDate = open.filter((t) => !t.dueDate);
  const dueToday = open.filter((t) => t.dueDate === today);
  const later = open.filter((t) => t.dueDate && t.dueDate > today);

  const isEmpty = regular.length === 0;

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
          Aufgaben
        </h1>
        <button
          type="button"
          onClick={() => {
            setSearchOpen((s) => !s);
            setQuery("");
          }}
          aria-label={searchOpen ? "Suche schließen" : "Suchen"}
          className="flex h-9 w-9 items-center justify-center rounded-full border"
          style={{
            borderColor: searchOpen ? "var(--dl-together)" : "var(--dl-border)",
            color: searchOpen ? "var(--dl-together)" : "var(--dl-text-dim)",
          }}
        >
          {searchOpen ? <X size={16} /> : <Search size={16} />}
        </button>
      </div>

      {searchOpen && (
        <div className="relative mt-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--dl-text-faint)" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Aufgaben durchsuchen …"
            className="w-full rounded-full border py-2.5 pl-10 pr-4 text-[14px] outline-none"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)", color: "var(--dl-text)" }}
          />
        </div>
      )}

      {searchResults ? (
        <div className="mt-5">
          <TaskGroup title="Suchergebnisse" tasks={searchResults} />
          {searchResults.length === 0 && (
            <EmptyState icon={Search} title="Keine Ergebnisse" description="Keine Aufgabe passt zu deiner Suche." />
          )}
        </div>
      ) : (
        <>
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => {
              const active = f.value === filter;
              const color = f.value === "alle" ? "var(--dl-together)" : assigneeColor(f.value as Assignee);
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className="shrink-0 min-h-[36px] rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300"
                  style={
                    active
                      ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }
                      : { borderColor: "var(--dl-border)", color: "var(--dl-text-dim)" }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {isEmpty ? (
            <EmptyState
              icon={CheckCircle2}
              title="Keine Aufgaben"
              description="Erstellt eine neue Aufgabe über den Plus-Button."
            />
          ) : (
            <>
              <TaskGroup title="Überfällig" tasks={overdue} />
              <TaskGroup title="Heute" tasks={dueToday} />
              <TaskGroup title="Später" tasks={later} />
              <TaskGroup title="Ohne Datum" tasks={noDate} />
              <TaskGroup title="Erledigt" tasks={done} />
            </>
          )}

          <ShoppingList items={shopping} />
        </>
      )}
    </div>
  );
}
