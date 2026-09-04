import { cn } from "@/lib/utils";
import type { Assignee } from "@/lib/types";
import { assigneeColor, assigneeInitials } from "@/lib/theme";

const SIZE = {
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-[13px]",
  lg: "h-10 w-10 text-[15px]",
};

export function PersonAvatar({
  assignee,
  size = "md",
  className,
}: {
  assignee: Assignee;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const initials = assigneeInitials(assignee);

  if (initials.length === 1) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border font-semibold",
          SIZE[size],
          className,
        )}
        style={{
          color: assigneeColor(assignee),
          borderColor: assigneeColor(assignee),
          background: "color-mix(in srgb, currentColor 14%, transparent)",
        }}
        aria-hidden
      >
        {initials[0]}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex shrink-0 -space-x-2", className)} aria-hidden>
      {initials.map((initial, i) => (
        <span
          key={initial}
          className={cn(
            "inline-flex items-center justify-center rounded-full border font-semibold",
            SIZE[size],
          )}
          style={{
            color: assigneeColor(i === 0 ? "domenico" : "elisabeth"),
            borderColor: assigneeColor(i === 0 ? "domenico" : "elisabeth"),
            background: "var(--dl-card)",
            zIndex: initials.length - i,
          }}
        >
          {initial}
        </span>
      ))}
    </span>
  );
}
