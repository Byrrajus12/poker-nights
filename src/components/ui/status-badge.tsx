import { Check } from "lucide-react";
import type { SessionStatus } from "@/types";

export function StatusBadge({ status, onFelt = false }: { status: SessionStatus; onFelt?: boolean }) {
  const shellClassName = onFelt
    ? "inline-flex items-center gap-1.5 rounded-full text-on-felt backdrop-blur-sm px-2.5 py-1 text-[13px] font-semibold"
    : "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[13px] font-semibold";

  return (
    <span className={shellClassName} style={onFelt ? { backgroundColor: "oklch(0 0 0 / 0.28)" } : undefined}>
      {status === "active" ? (
        <>
          <span className="animate-live-pulse h-1.5 w-1.5 rounded-full bg-positive" />
          <span className={onFelt ? "text-on-felt" : "text-ink"}>Live</span>
        </>
      ) : status === "settling" ? (
        <span className={onFelt ? "text-on-felt-dim" : "text-ink-2"}>Settling</span>
      ) : (
        <>
          <Check className={onFelt ? "text-on-felt-dim" : "text-ink-3"} size={14} strokeWidth={2} />
          <span className={onFelt ? "text-on-felt-dim" : "text-ink-3"}>Settled</span>
        </>
      )}
    </span>
  );
}
