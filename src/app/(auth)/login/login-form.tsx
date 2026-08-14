"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "magic-link";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  function validateEmail() {
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }

    return true;
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!validateEmail()) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim();

      if (mode === "sign-up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setMessage("Account created. Taking you to your dashboard…");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!validateEmail()) return;

    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setMessage("Link sent. Check your email.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const isSignUp = mode === "sign-up";
  const isMagicLink = mode === "magic-link";

  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-10 mx-auto w-full max-w-md">
      <Link
        className="mb-6 inline-flex h-11 items-center gap-1 text-ink-2"
        href="/"
      >
        <ChevronLeft size={20} className="text-ink-2" />
        <span className="text-[15px]">Back</span>
      </Link>

      <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">
        {isMagicLink ? "Magic link" : isSignUp ? "Create an account" : "Sign in"}
      </h1>
      <p className="mt-1 text-[15px] text-ink-2">
        {isMagicLink
          ? "We’ll email you a one-time sign-in link."
          : isSignUp
            ? "Create your account to start hosting poker nights."
            : "Welcome back. Sign in to continue."}
      </p>

      <form
        className="mt-7"
        noValidate
        onSubmit={isMagicLink ? handleMagicLinkSubmit : handlePasswordSubmit}
      >
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

        {!isMagicLink ? (
          <>
            <label
              className="mb-2 mt-4 block text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15"
              id="password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              type="password"
              value={password}
            />

            {isSignUp ? (
              <>
                <label
                  className="mb-2 mt-4 block text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3"
                  htmlFor="confirm-password"
                >
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15"
                  id="confirm-password"
                  minLength={6}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  required
                  type="password"
                  value={confirmPassword}
                />
              </>
            ) : null}
          </>
        ) : null}

        <button
          className="mt-4 h-14 w-full rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3"
          disabled={isLoading}
          type="submit"
        >
          {isLoading
            ? isMagicLink
              ? "Sending…"
              : isSignUp
                ? "Creating account…"
                : "Signing in…"
            : isMagicLink
              ? "Send link"
              : isSignUp
                ? "Sign up"
                : "Sign in"}
        </button>

        {message ? (
          <p className="mt-4 rounded-2xl bg-surface p-3 text-sm text-positive" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <div className="mt-6 text-center text-[15px] text-ink-2">
        {isMagicLink ? (
          <button
            className="font-semibold text-accent disabled:text-ink-3"
            disabled={isLoading}
            onClick={() => changeMode("sign-in")}
            type="button"
          >
            Sign in with password
          </button>
        ) : (
          <>
            <button
              className="font-semibold text-accent disabled:text-ink-3"
              disabled={isLoading}
              onClick={() => changeMode("magic-link")}
              type="button"
            >
              Sign in with magic link
            </button>
            <div className="my-5 h-px bg-line" />
            <p>
              {isSignUp ? "Already have an account?" : "New to Poker Nights?"}{" "}
              <button
                className="font-semibold text-accent disabled:text-ink-3"
                disabled={isLoading}
                onClick={() => changeMode(isSignUp ? "sign-in" : "sign-up")}
                type="button"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
