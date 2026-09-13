// Color/label rules for the Hausbau list (spec §8) — deliberately muted,
// no red/green banking colors. Two independent dimensions: WHERE the money
// comes from (bank/self/self-work — the leading dot) and WHETHER it's
// already settled (the status text).
import type { HausbauExpenseStatus, HausbauPaymentSource } from "@/lib/types";

export function hausbauSourceDotStyle(
  source: HausbauPaymentSource,
  kind: "expense" | "selfwork",
): React.CSSProperties {
  if (kind === "selfwork") {
    // "Kombination aus Cyan und Rosé zu Lavendel" — a two-tone gradient
    // dot, visually distinct from the flat bank/self colors below.
    return { background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))" };
  }
  return { background: source === "bank" ? "var(--dl-together)" : "var(--dl-domenico)" };
}

export function hausbauStatusLabel(status: HausbauExpenseStatus): string {
  switch (status) {
    case "planned":
      return "Geplant";
    case "ordered":
      return "Beauftragt";
    case "invoiced":
      return "Rechnung erhalten";
    case "paid":
      return "Bezahlt";
  }
}

export function hausbauStatusColor(status: HausbauExpenseStatus): string {
  if (status === "paid") return "var(--dl-text)";
  if (status === "ordered" || status === "invoiced") return "var(--dl-elisabeth)";
  return "var(--dl-text-dim)";
}

export function hausbauPaymentSourceLabel(source: HausbauPaymentSource): string {
  return source === "bank" ? "Bank" : "Selbst bezahlt";
}
