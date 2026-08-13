"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) router.push(`/join/${encodeURIComponent(trimmed)}`);
  }
  return (
    <section>
      <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Join a group</h1>
      <p className="mt-1 text-[15px] text-ink-2">
        Enter the 6-character invite code from your host.
      </p>
      <form className="mt-7" onSubmit={handleSubmit}>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
          className="h-16 w-full rounded-2xl bg-surface-2 text-center text-[28px] font-bold tracking-[0.35em] uppercase tabular-nums text-ink outline-none placeholder:text-ink-3 placeholder:tracking-[0.35em] focus:ring-2 focus:ring-accent/30"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABC123"
          required
          value={code}
        />
        <button
          className="mt-4 h-14 w-full rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3"
          disabled={!code.trim()}
          type="submit"
        >
          Continue
        </button>
      </form>
    </section>
  );
}
