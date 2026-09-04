import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-md)]", className)}
      style={{ background: "var(--dl-card)" }}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
