import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberProfile } from "./member-profile";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ groupId: string; memberId: string }>;
}) {
  const { groupId, memberId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error(userError.message);
  if (!user) notFound();

  const [{ data: group, error: groupError }, { data: viewer, error: viewerError }, { data: member, error: memberError }] = await Promise.all([
    supabase.from("groups").select("id, created_by").eq("id", groupId).maybeSingle(),
    supabase.from("group_members").select("id, role").eq("group_id", groupId).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("group_members")
      .select("id, group_id, user_id, display_name, avatar_url, role, is_claimed, venmo_handle, cashapp_handle, zelle_handle")
      .eq("id", memberId)
      .eq("group_id", groupId)
      .maybeSingle(),
  ]);

  if (groupError || viewerError || memberError) {
    throw new Error(groupError?.message ?? viewerError?.message ?? memberError?.message ?? "Could not load member profile");
  }
  if (!group || !viewer || !member) notFound();

  const permission = member.user_id === user.id
    || group.created_by === user.id
    || (viewer.role === "admin" && !member.is_claimed)
    ? "edit"
    : "view";

  return <MemberProfile initialMember={member} permission={permission} />;
}
