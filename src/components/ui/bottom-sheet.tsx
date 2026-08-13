"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, eyebrow, children }: BottomSheetProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const sheetInitial = reducedMotion ? { opacity: 0 } : { y: "100%", opacity: 1 };
  const sheetAnimate = reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 };
  const sheetExit = reducedMotion ? { opacity: 0 } : { y: "100%", opacity: 1 };

  function handleDragEnd(_event: PointerEvent, info: PanInfo) {
    const threshold = 0.25 * (typeof window !== "undefined" ? window.innerHeight * 0.5 : 200);
    if (info.offset.y > threshold || info.velocity.y > 500) {
      onClose();
    }
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.2 }}
          />
          <motion.section
            animate={sheetAnimate}
            aria-modal="true"
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-t border-line bg-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-[28px] sm:border"
            drag={reducedMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            exit={sheetExit}
            initial={sheetInitial}
            onDragEnd={handleDragEnd}
            role="dialog"
            transition={reducedMotion ? { duration: 0.2 } : { type: "spring", stiffness: 420, damping: 42 }}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-2 sm:hidden" />
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                {eyebrow ? <p className="text-[13px] font-medium text-ink-3">{eyebrow}</p> : null}
                <h2 className="mt-1 text-xl font-semibold text-ink">{title}</h2>
              </div>
              <button
                aria-label="Close"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-2 transition hover:text-ink"
                onClick={onClose}
                type="button"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </header>
            {children}
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
