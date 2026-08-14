"use client";

import { Banknote } from "lucide-react";
import { SiCashapp, SiVenmo, SiZelle } from "react-icons/si";
import type { SettlementPaymentMethod } from "@/types";

export interface PaymentMethodSelectorProps {
  value: SettlementPaymentMethod | null;
  onChange: (method: SettlementPaymentMethod) => void;
  size?: "sm" | "md";
  availableHandles?: { venmo: boolean; cashapp: boolean; zelle: boolean };
}

const choices = [
  { value: "venmo", label: "Venmo", Icon: SiVenmo, color: "#3D95CE" },
  { value: "cashapp", label: "CashApp", Icon: SiCashapp, color: "#00D632" },
  { value: "zelle", label: "Zelle", Icon: SiZelle, color: "#6D1ED4" },
  { value: "cash", label: "Cash", Icon: Banknote, color: "#C9A96E" },
] as const;

export function PaymentMethodIcon({ method, size = 18 }: { method: SettlementPaymentMethod; size?: number }) {
  const choice = choices.find((item) => item.value === method)!;
  return <choice.Icon aria-hidden color={choice.color} size={size} />;
}

export function PaymentMethodSelector({ value, onChange, size = "md", availableHandles }: PaymentMethodSelectorProps) {
  const compact = size === "sm";

  return (
    <div className={`flex flex-nowrap bg-surface-2 ${compact ? "w-fit shrink-0 gap-0.5 rounded-xl p-0.5" : "w-full gap-0.5 rounded-2xl p-1"}`} role="group" aria-label="Payment method">
      {choices.map(({ value: method, label, Icon, color }) => {
        const selected = value === method;
        const hasHandle = method !== "cash" && availableHandles?.[method];
        return (
          <button
            aria-label={label}
            aria-pressed={selected}
            className={`flex items-center justify-center overflow-hidden transition-all duration-150 ${selected ? "bg-surface-3 shadow-sm" : "bg-transparent"} ${compact ? "size-8 flex-none rounded-lg" : "min-h-11 min-w-0 flex-1 gap-1.5 rounded-xl px-0.5"}`}
            key={method}
            onClick={() => onChange(method)}
            title={label}
            type="button"
          >
            <span className="relative flex items-center justify-center">
              <Icon aria-hidden color={color} size={compact ? 16 : 19} className={selected ? "opacity-100" : "opacity-45"} />
              {compact && hasHandle ? <span aria-hidden className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-positive ring-1 ring-surface-2" /> : null}
            </span>
            {!compact ? <span className={`relative whitespace-nowrap pr-2 font-semibold ${method === "cashapp" ? "text-[9px]" : "text-[10px]"} ${selected ? "text-ink" : "text-ink-3"}`}>{label}{hasHandle ? <span aria-hidden className="absolute -top-0.5 right-0 size-1.5 rounded-full bg-positive" /> : null}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
