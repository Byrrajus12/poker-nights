"use client";

import { useEffect } from "react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <p className="text-center text-zinc-400">Something went wrong</p>
      <button
        className="rounded-lg bg-zinc-800 px-4 py-2 text-zinc-200 transition-colors hover:bg-zinc-700"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
