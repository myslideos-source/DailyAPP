import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function MenuRow({
  icon: Icon,
  label,
  description,
  href,
  onClick,
  danger,
  trailing,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  trailing?: React.ReactNode;
}) {
  const content = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: danger ? "color-mix(in srgb, var(--dl-danger) 16%, transparent)" : "var(--dl-card-raised)" }}
      >
        <Icon size={17} strokeWidth={1.8} style={{ color: danger ? "var(--dl-danger)" : "var(--dl-text-dim)" }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium" style={{ color: danger ? "var(--dl-danger)" : "var(--dl-text)" }}>
          {label}
        </span>
        {description && (
          <span className="block text-[12.5px]" style={{ color: "var(--dl-text-dim)" }}>
            {description}
          </span>
        )}
      </span>
      {trailing ?? ((href || onClick) && <ChevronRight size={17} style={{ color: "var(--dl-text-faint)" }} />)}
    </>
  );

  const className =
    "flex w-full min-h-[52px] items-center gap-3 rounded-[16px] border px-3.5 py-2.5 text-left";
  const style = { borderColor: "var(--dl-border)", background: "var(--dl-card)" };

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {content}
    </button>
  );
}
