import Link from "next/link";
import { FeltCard } from "@/components/ui/felt-card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { AmountDisplay } from "@/components/ui/amount-display";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col px-6 pt-10 pb-8 mx-auto w-full max-w-md">
      <p className="text-[15px] font-semibold text-ink-2">Poker Nights</p>

      <div className="mt-10">
        <h1 className="text-[40px] font-bold tracking-tight leading-[1.05] text-ink">
          Track the <span className="font-serif-accent">table</span>.
        </h1>
        <p className="mt-3 text-[15px] text-ink-2">
          Buy-ins, cashouts, and settling up, handled.
        </p>
      </div>

      <div className="mt-10 px-2 pointer-events-none" aria-hidden="true">
        <FeltCard
          className="rotate-[-2deg] p-6"
          variant="live"
        >
          <p className="font-serif-accent text-[17px] text-on-felt-dim">tonight&apos;s pot</p>
          <div className="mt-2">
            <AmountDisplay amount={124000} size="xl" variant="display" className="!text-on-felt" />
          </div>
          <p className="mt-3 text-[13px] text-on-felt-dim">6 players · 2h 14m</p>
          <div className="mt-5 flex -space-x-2">
            {["Maya", "Jordan", "Sam", "Dev"].map((name) => (
              <PlayerAvatar
                key={name}
                name={name}
                size="md"
                className="ring-2 ring-felt"
              />
            ))}
          </div>
        </FeltCard>
      </div>

      <div className="mt-auto pt-10 flex flex-col gap-3">
        <Link
          className="h-14 w-full rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition flex items-center justify-center"
          href="/login"
        >
          Sign in
        </Link>
        <Link
          className="h-14 w-full rounded-full bg-surface-2 text-ink text-[17px] font-semibold active:scale-[0.98] transition flex items-center justify-center"
          href="/join"
        >
          Join with an invite code
        </Link>
      </div>
    </main>
  );
}
