"use client";

import { cn } from "@/lib/utils";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: "var(--dl-text-dim)" }}>
      {children}
    </label>
  );
}

export function TextField({
  className,
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "box-border w-full min-w-0 max-w-full border text-[15px] outline-none transition-colors",
        "placeholder:text-[var(--dl-text-faint)] focus:border-[var(--dl-together)]",
        className,
      )}
      style={{
        height: "var(--field-height)",
        borderRadius: "var(--field-radius)",
        paddingInline: "var(--field-padding-x)",
        background: "var(--field-background)",
        borderColor: "var(--field-border)",
        color: "var(--dl-text)",
        ...style,
      }}
      {...props}
    />
  );
}

export function TextAreaField({
  className,
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "box-border w-full min-w-0 max-w-full resize-none border text-[15px] outline-none transition-colors",
        "placeholder:text-[var(--dl-text-faint)] focus:border-[var(--dl-together)]",
        className,
      )}
      style={{
        borderRadius: "var(--field-radius)",
        paddingInline: "var(--field-padding-x)",
        paddingBlock: 14,
        background: "var(--field-background)",
        borderColor: "var(--field-border)",
        color: "var(--dl-text)",
        ...style,
      }}
      {...props}
    />
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  colorFor,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  colorFor?: (value: T) => string | undefined;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        const color = colorFor?.(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className="min-h-[38px] rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-300"
            style={
              active
                ? {
                    borderColor: color ?? "var(--dl-together)",
                    background: color
                      ? `color-mix(in srgb, ${color} 18%, transparent)`
                      : "var(--dl-together-soft)",
                    color: color ?? "var(--dl-together)",
                  }
                : {
                    borderColor: "var(--dl-border)",
                    color: "var(--dl-text-dim)",
                  }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="box-border flex w-full min-w-0 max-w-full items-center justify-between border disabled:opacity-50"
      style={{
        height: "var(--field-height)",
        borderRadius: "var(--field-radius)",
        paddingInline: "var(--field-padding-x)",
        borderColor: "var(--field-border)",
        background: "var(--field-background)",
      }}
    >
      <span className="text-[14.5px]" style={{ color: "var(--dl-text)" }}>
        {label}
      </span>
      <span
        className="relative h-6 w-10 rounded-full transition-colors"
        style={{ background: checked ? "var(--dl-together)" : "var(--dl-border-strong)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}
