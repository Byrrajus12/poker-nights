import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return (
    <section>
      <Link
        className="mb-6 inline-flex h-11 items-center gap-1 text-ink-2"
        href={`/groups/${groupId}`}
      >
        <ChevronLeft size={20} className="text-ink-2" />
        <span className="text-[15px]">Back</span>
      </Link>
      <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Group settings</h1>
      <p className="mt-1 text-[15px] text-ink-2">More controls are coming soon.</p>

      <div className="mt-7 rounded-2xl bg-surface-2 p-4">
        <p className="text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3">Group ID</p>
        <p className="mt-2 break-all text-[13px] text-ink-2">{groupId}</p>
      </div>
    </section>
  );
}
