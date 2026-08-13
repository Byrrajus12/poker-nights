"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AmountDisplay } from "./amount-display";

type PotDisplayProps = {
  amount: number;
  variant?: "plain" | "display";
  className?: string;
};

export function PotDisplay({ amount, variant = "display", className = "" }: PotDisplayProps) {
  const previousAmount = useRef(amount);
  const [displayed, setDisplayed] = useState(amount);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const from = previousAmount.current;
    previousAmount.current = amount;
    if (from === amount) return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - started) / 300, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (amount - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amount]);

  return (
    <motion.span
      animate={reducedMotion ? undefined : { scale: [1, 1.015, 1] }}
      className="inline-block"
      key={amount}
      transition={{ duration: 0.25 }}
    >
      <AmountDisplay amount={displayed} className={className} size="xl" variant={variant} />
    </motion.span>
  );
}
