import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClaimFlow from "./claim-flow";

export default async function JoinWithCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  if (groupError || !group) {
    return (
      <section>
        <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Invalid code</h1>
        <p className="mt-1 text-[15px] text-ink-2">
          Check the code with your host and try again.
        </p>
        <div className="mt-7 rounded-2xl bg-surface-2 p-4 text-[15px] text-ink-2">
          That invite code doesn&apos;t match a group.
        </div>
        <Link
          className="mt-4 h-14 w-full rounded-full bg-surface-2 text-ink text-[17px] font-semibold active:scale-[0.98] transition flex items-center justify-center"
          href="/join"
        >
          Enter a different code
        </Link>
      </section>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      redirect(`/groups/${group.id}`);
    }
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("id, display_name, avatar_url, is_claimed")
    .eq("group_id", group.id)
    .order("display_name", { ascending: true });

  return <ClaimFlow group={group} members={members ?? []} />;
}
