"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => data.user && router.push("/dashboard"));
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage(""); setIsLoading(true);
    const { error: signInError } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signInError) setError(signInError.message);
    else setMessage("Link sent. Check your email.");
    setIsLoading(false);
  }

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-10 mx-auto w-full max-w-md">
      <Link
        className="mb-6 inline-flex h-11 items-center gap-1 text-ink-2"
        href="/"
      >
        <ChevronLeft size={20} className="text-ink-2" />
        <span className="text-[15px]">Back</span>
      </Link>
      <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Sign in</h1>
      <p className="mt-1 text-[15px] text-ink-2">We&apos;ll email you a one-time sign-in link.</p>
      <form className="mt-7" onSubmit={handleSubmit}>
        <label className="block text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3 mb-2" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-accent/30"
          id="email"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        <button
          className="mt-4 h-14 w-full rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Sending…" : "Send sign-in link"}
        </button>
        {message ? (
          <p className="mt-4 rounded-2xl bg-surface p-3 text-sm text-positive">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm text-danger">{error}</p>
        ) : null}
      </form>
    </main>
  );
}
