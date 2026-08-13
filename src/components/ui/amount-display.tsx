import { formatCents } from "@/lib/utils";

type AmountDisplayProps = {
  amount: number;
  size?: "sm" | "md" | "lg" | "xl";
  showSign?: boolean;
  colored?: boolean;
  variant?: "plain" | "display";
  className?: string;
};

const sizes = {
  sm: "text-[13px] font-semibold",
  md: "text-[17px] font-semibold",
  lg: "text-2xl font-bold",
  xl: "text-[44px] leading-none font-bold",
};

const displaySizes = {
  sm: "text-[13px] font-semibold",
  md: "text-[17px] font-semibold",
  lg: "text-2xl font-bold",
  xl: "text-[56px] leading-none font-extrabold",
};

export function AmountDisplay({
  amount,
  size = "md",
  showSign = false,
  colored = false,
  variant = "plain",
  className = "",
}: AmountDisplayProps) {
  const sign = showSign && amount > 0 ? "+" : "";
  const color = colored
    ? amount > 0
      ? "text-positive"
      : amount < 0
        ? "text-negative"
        : "text-ink-2"
    : "text-ink";

  const formatted = formatCents(amount);

  if (variant === "display") {
    const decimalIndex = formatted.lastIndexOf(".");
    const wholePart = decimalIndex === -1 ? formatted : formatted.slice(0, decimalIndex);
    const centsPart = decimalIndex === -1 ? "" : formatted.slice(decimalIndex);

    return (
      <span
        className={`inline-flex items-start font-sans tabular-nums tracking-[-0.03em] ${displaySizes[size]} ${color} ${className}`}
      >
        {sign}
        {wholePart}
        {centsPart ? <span className="mt-[0.34em] text-[0.55em] font-bold opacity-70">{centsPart}</span> : null}
      </span>
    );
  }

  return (
    <span className={`font-sans tabular-nums tracking-tight ${sizes[size]} ${color} ${className}`}>
      {sign}
      {formatted}
    </span>
  );
}
