import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ label = "Mehr" }: { label?: string }) {
  return (
    <Link href="/mehr" className="mb-3 inline-flex items-center gap-1 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
      <ChevronLeft size={16} /> {label}
    </Link>
  );
}
