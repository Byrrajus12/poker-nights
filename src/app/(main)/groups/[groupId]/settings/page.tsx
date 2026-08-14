import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MemberRoleManager } from "./member-role-manager";

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const [
    { data: group, error: groupError },
    { data: members, error: membersError },
    { data: { user }, error: userError },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id,name,created_by")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("id,group_id,user_id,display_name,avatar_url,role,is_claimed,venmo_handle,cashapp_handle,zelle_handle,created_at")
      .eq("group_id", groupId)
      .order("display_name", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (groupError || membersError || userError) {
    throw new Error(groupError?.message ?? membersError?.message ?? userError?.message ?? "Could not load group settings");
  }
  if (!group) notFound();

  const roster = members ?? [];
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
      <p className="mt-1 text-[15px] text-ink-2">Manage {group.name}&apos;s members and access.</p>

      <MemberRoleManager creatorId={group.created_by} currentUserId={user?.id ?? null} initialMembers={roster} />
    </section>
  );
}
