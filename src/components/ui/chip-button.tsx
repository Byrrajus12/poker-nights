"use client";

type ChipButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean;
};

export function ChipButton({ pressed = false, className = "", children, disabled, ...rest }: ChipButtonProps) {
  return (
    <button
      className={`relative inline-flex min-h-10 items-center justify-center rounded-full px-3.5 py-2 text-[13px] font-bold tabular-nums transition-[background-color,color] duration-150 active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40 ${
        pressed ? "text-accent" : "text-ink-2"
      } ${className}`}
      style={{
        backgroundColor: pressed ? "oklch(0.85 0.115 88 / 0.16)" : "var(--surface-2)",
      }}
      disabled={disabled}
      type="button"
      {...rest}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[3px] rounded-full border-[1.5px] border-dashed transition-colors duration-150"
        style={{
          borderColor: pressed ? "oklch(0.85 0.115 88 / 0.55)" : "oklch(1 0 0 / 0.15)",
        }}
      />
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}
