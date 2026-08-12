"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MainNav({ displayName }: { displayName: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link className="text-lg font-semibold" href="/dashboard">
          Poker Nights
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-300 sm:inline">{displayName}</span>
          <button
            className="min-h-10 rounded-md border border-zinc-700 px-4 text-sm font-medium text-zinc-100 hover:border-zinc-500"
            onClick={handleSignOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
