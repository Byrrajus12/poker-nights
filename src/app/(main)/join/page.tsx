"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    router.push(`/join/${encodeURIComponent(trimmedCode)}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
      <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Join a group</h1>
          <p className="text-sm text-zinc-400">Enter your invite code.</p>
        </div>

        <label className="block space-y-2" htmlFor="invite-code">
          <span className="text-sm font-medium text-zinc-200">Invite code</span>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            className="h-12 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 text-center text-base tracking-widest text-zinc-50 outline-none placeholder:tracking-normal placeholder:text-zinc-500 focus:border-zinc-400"
            id="invite-code"
            onChange={(event) => setCode(event.target.value)}
            placeholder="ABC123"
            required
            value={code}
          />
        </label>

        <button
          className="h-12 w-full rounded-md bg-zinc-50 px-4 text-base font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!code.trim()}
          type="submit"
        >
          Join
        </button>
      </form>
    </main>
  );
}
