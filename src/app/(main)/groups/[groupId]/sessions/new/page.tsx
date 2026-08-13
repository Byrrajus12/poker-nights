import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewSessionForm } from "./new-session-form";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    redirect("/login");
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id,name,invite_code,created_by,buyin_presets,created_at")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError) {
    throw new Error(groupError.message);
  }

  if (!group) {
    notFound();
  }

  const { data: activeSession, error: activeSessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSessionError) {
    throw new Error(activeSessionError.message);
  }

  if (activeSession) {
    redirect(`/groups/${groupId}/sessions/${activeSession.id}`);
  }

  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("id,group_id,user_id,display_name,role,is_claimed,created_at")
    .eq("group_id", groupId)
    .order("display_name", { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  return (
    <NewSessionForm
      currentUserId={user.id}
      group={group}
      initialMembers={members ?? []}
    />
  );
}
