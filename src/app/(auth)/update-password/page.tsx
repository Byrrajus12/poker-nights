"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        if (isMounted) {
          setIsCheckingSession(false);
        }
      } catch {
        router.replace("/login");
      }
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-10 mx-auto w-full max-w-md">
      <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">
        Set a new password
      </h1>

      <form className="mt-7" noValidate onSubmit={handleSubmit}>
        <label
          className="mb-2 block text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3"
          htmlFor="new-password"
        >
          New password
        </label>
        <input
          autoComplete="new-password"
          className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15"
          disabled={isCheckingSession}
          id="new-password"
          minLength={6}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="At least 6 characters"
          required
          type="password"
          value={newPassword}
        />

        <label
          className="mb-2 mt-4 block text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3"
          htmlFor="confirm-password"
        >
          Confirm password
        </label>
        <input
          autoComplete="new-password"
          className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15"
          disabled={isCheckingSession}
          id="confirm-password"
          minLength={6}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Enter your password again"
          required
          type="password"
          value={confirmPassword}
        />

        <button
          className="mt-4 h-14 w-full rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3"
          disabled={isCheckingSession || isLoading}
          type="submit"
        >
          {isCheckingSession
            ? "Checking session…"
            : isLoading
              ? "Updating…"
              : "Update password"}
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
    </main>
  );
}
