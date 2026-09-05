"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
import { TaskGroup } from "@/components/tasks/TaskGroup";
import { ShoppingList } from "@/components/tasks/ShoppingList";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/app-store";
import { toISODate } from "@/lib/date-utils";

type StatusFilter = "offen" | "heute" | "erledigt";

export default function AufgabenPage() {
  const { tasks } = useAppStore();
  const [status, setStatus] = useState<StatusFilter>("heute");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const today = toISODate(new Date());

  const regular = useMemo(() => tasks.filter((t) => !t.isShopping), [tasks]);
  const shopping = useMemo(() => tasks.filter((t) => t.isShopping), [tasks]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, query]);

  const open = regular.filter((t) => !t.done);
  const done = regular
    .filter((t) => t.done)
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  const dueToday = open.filter((t) => (t.dueDate ?? "") <= today);
  const later = open.filter((t) => (t.dueDate ?? "") > today);

  // "Today" progress covers anything due today, plus anything actually
  // completed today even if its original due date was different.
  const todayRelevant = regular.filter(
    (t) => t.dueDate === today || (t.done && (t.doneAt ?? "").slice(0, 10) === today),
  );
  const todayDoneCount = todayRelevant.filter((t) => t.done).length;
  const todayTotalCount = todayRelevant.length;

  const STATUS_TABS: { value: StatusFilter; label: string; count: number }[] = [
    { value: "offen", label: "Offen", count: open.length },
    { value: "heute", label: "Heute", count: dueToday.length },
    { value: "erledigt", label: "Erledigt", count: done.length },
  ];

  const isEmpty = regular.length === 0;

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold" style={{ color: "var(--dl-text)" }}>
            Aufgaben
          </h1>
          <p className="mt-0.5 text-[14px]" style={{ color: "var(--dl-text-dim)" }}>
            Gemeinsam organisiert
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchOpen((s) => !s);
            setQuery("");
          }}
          aria-label={searchOpen ? "Suche schließen" : "Suchen"}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
          style={{
            borderColor: searchOpen ? "var(--dl-together)" : "var(--dl-border)",
            color: searchOpen ? "var(--dl-together)" : "var(--dl-text-dim)",
          }}
        >
          {searchOpen ? <X size={16} /> : <Search size={16} />}
        </button>
      </div>

      {searchOpen && (
        <div className="relative mt-4">
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
          <div
            className="mt-5 flex gap-1 rounded-full border p-1"
            style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
          >
            {STATUS_TABS.map((tab) => {
              const active = tab.value === status;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatus(tab.value)}
                  className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full text-[13.5px] font-semibold transition-colors duration-200"
                  style={
                    active
                      ? { background: "var(--dl-together)", color: "var(--dl-text)" }
                      : { color: "var(--dl-text-dim)" }
                  }
                >
                  {tab.label}
                  <span style={{ opacity: active ? 0.85 : 0.6 }}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          {todayTotalCount > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
                {todayDoneCount} von {todayTotalCount} heute erledigt
              </p>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--dl-border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(todayDoneCount / todayTotalCount) * 100}%`,
                    background: "var(--dl-together)",
                  }}
                />
              </div>
            </div>
          )}

          {isEmpty ? (
            <EmptyState
              icon={CheckCircle2}
              title="Keine Aufgaben"
              description="Erstellt eine neue Aufgabe über den Plus-Button."
            />
          ) : status === "erledigt" ? (
            <TaskGroup title="Erledigt" tasks={done} />
          ) : status === "heute" ? (
            <>
              <TaskGroup title="Heute" tasks={dueToday} />
              <TaskGroup title="Später" tasks={later.slice(0, 4)} />
            </>
          ) : (
            <>
              <TaskGroup title="Heute" tasks={dueToday} />
              <TaskGroup title="Später" tasks={later} />
            </>
          )}

          {status !== "erledigt" && <ShoppingList items={shopping} />}
        </>
      )}
    </div>
  );
}
