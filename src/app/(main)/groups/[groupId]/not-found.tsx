import Link from "next/link";

export default function GroupNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div>
        <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Group not found</h1>
        <p className="mt-1 text-[15px] text-ink-2">
          This group does not exist or you no longer have access to it.
        </p>
      </div>
      <Link
        className="rounded-full bg-surface-2 px-5 py-3 text-[15px] font-semibold text-ink transition active:scale-[0.98]"
        href="/dashboard"
      >
        Back to groups
      </Link>
    </div>
  );
}
