import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "var(--dl-card)" }}
      >
        <Icon size={24} strokeWidth={1.6} style={{ color: "var(--dl-text-dim)" }} />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-medium" style={{ color: "var(--dl-text)" }}>
          {title}
        </p>
        {description && (
          <p className="text-[13px]" style={{ color: "var(--dl-text-dim)" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
