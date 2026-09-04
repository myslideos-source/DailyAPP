import { BackLink } from "@/components/mehr/BackLink";
import { CATEGORIES } from "@/lib/demo-data";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function KategorienPage() {
  return (
    <div className="pt-3">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Kategorien
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Diese Kategorien stehen euch beim Erstellen von Terminen zur Verfügung.
      </p>

      <div className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = (Icons as unknown as Record<string, LucideIcon>)[cat.icon] ?? Icons.CircleDot;
          return (
            <div
              key={cat.id}
              className="flex min-h-[52px] items-center gap-3 rounded-[16px] border px-3.5 py-2.5"
              style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--dl-together-soft)" }}
              >
                <Icon size={17} strokeWidth={1.8} style={{ color: "var(--dl-together)" }} />
              </span>
              <span className="text-[14.5px] font-medium" style={{ color: "var(--dl-text)" }}>
                {cat.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
