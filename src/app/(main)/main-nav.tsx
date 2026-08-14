"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function MainNav({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login"); router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-bg/78 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-md items-center justify-between px-4">
        <Link className="text-[15px] font-semibold text-ink" href="/dashboard">
          Poker Nights
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            aria-expanded={open}
            aria-label="Open profile menu"
            className="rounded-[35%] p-1.5 outline-none transition hover:bg-surface-2 focus:outline-none focus-visible:outline-none"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <HeaderAvatar avatarUrl={avatarUrl} displayName={displayName} />
          </button>
          <AnimatePresence>
            {open ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-lg"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <p className="truncate px-3 py-2 text-[15px] font-semibold text-ink">{displayName}</p>
                <Link
                  className="flex h-11 items-center gap-2.5 rounded-lg px-3 text-[15px] font-medium text-ink hover:bg-surface-2"
                  href="/profile"
                  onClick={() => setOpen(false)}
                >
                  <User className="text-ink-2" size={18} strokeWidth={2} />
                  Profile
                </Link>
                <button
                  className="flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[15px] font-medium text-danger hover:bg-surface-2"
                  onClick={handleSignOut}
                  type="button"
                >
                  <LogOut size={18} strokeWidth={2} />
                  Sign out
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function HeaderAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (avatarUrl && failedUrl !== avatarUrl) {
    return (
      // Public Supabase avatar URLs are intentionally rendered without a hover tooltip.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-8 w-8 rounded-[35%] border border-white/10 object-cover"
        onError={() => setFailedUrl(avatarUrl)}
        src={avatarUrl}
      />
    );
  }

  return (
    <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-[35%] border border-white/10 bg-surface-2 text-xs font-semibold text-ink">
      {displayName.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
