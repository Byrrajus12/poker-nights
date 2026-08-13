import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GroupMember, SessionPlayer } from "@/types";
import { ActiveSession } from "./active-session";

export type SessionPlayerWithMember = SessionPlayer & {
  member: Pick<GroupMember, "id" | "display_name">;
};

export default async function SessionPage({
  params,
}: {
  params: Promise<{ groupId: string; sessionId: string }>;
}) {
  const { groupId, sessionId } = await params;
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id,group_id,banker_id,status,started_at,ended_at,notes")
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    notFound();
  }

  if (session.status === "settling") {
    redirect(`/groups/${groupId}/sessions/${sessionId}/settle`);
  }

  if (session.status === "settled") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Session</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-50">Session settled</h1>
        </div>
        <Link
          className="inline-flex min-h-12 items-center rounded-md bg-zinc-100 px-5 font-medium text-zinc-950 hover:bg-white"
          href={`/groups/${groupId}`}
        >
          Back to group
        </Link>
      </div>
    );
  }

  const [
    { data: group, error: groupError },
    { data: sessionPlayers, error: playersError },
    { data: transactions, error: transactionsError },
    { data: rosterMembers, error: rosterError },
    {
      data: { user },
      error: userError,
    },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id,name,invite_code,created_by,buyin_presets,created_at")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("session_players")
      .select("id,session_id,member_id,joined_at")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id,session_id,member_id,type,amount,created_by,created_at,payment_method")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("group_members")
      .select("id,group_id,user_id,display_name,role,is_claimed,created_at")
      .eq("group_id", groupId)
      .order("display_name", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (groupError) {
    throw new Error(groupError.message);
  }

  if (!group) {
    notFound();
  }

  if (playersError) {
    throw new Error(playersError.message);
  }

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }

  if (rosterError) {
    throw new Error(rosterError.message);
  }

  if (userError) {
    throw new Error(userError.message);
  }

  const membersById = new Map((rosterMembers ?? []).map((member) => [member.id, member]));
  const players: SessionPlayerWithMember[] = (sessionPlayers ?? []).flatMap((player) => {
    const member = membersById.get(player.member_id);

    if (!member) {
      return [];
    }

    return [
      {
        ...player,
        member: {
          id: member.id,
          display_name: member.display_name,
        },
      },
    ];
  });

  return (
    <ActiveSession
      currentUserId={user?.id ?? null}
      group={group}
      groupMembers={rosterMembers ?? []}
      initialTransactions={transactions ?? []}
      isBanker={user?.id === session.banker_id}
      players={players}
      session={session}
    />
  );
}
