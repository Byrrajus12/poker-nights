"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      // In Supabase Authentication > Email Templates, ensure the Reset Password
      // template uses {{ .ConfirmationURL }} so this redirectTo reaches the callback.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: `${window.location.origin}/auth/reset-callback` },
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setIsSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-10 mx-auto w-full max-w-md">
      <Link
        className="mb-6 inline-flex h-11 items-center gap-1 text-ink-2"
        href="/login"
      >
        <ChevronLeft size={20} className="text-ink-2" />
        <span className="text-[15px]">Back to login</span>
      </Link>

      <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">
        Reset your password
      </h1>
      <p className="mt-1 text-[15px] text-ink-2">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {isSent ? (
        <p
          className="mt-7 rounded-2xl bg-surface p-4 text-sm text-positive"
          role="status"
        >
          Check your email for a reset link.
        </p>
      ) : (
        <form className="mt-7" noValidate onSubmit={handleSubmit}>
          <label
            className="mb-2 block text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3"
            htmlFor="email"
          >
            Email
          </label>
          <input
            autoComplete="email"
            className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15"
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
            {isLoading ? "Sending…" : "Send reset link"}
          </button>

          {error ? (
            <p
              className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </form>
      )}
    </main>
  );
}
