import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopyInviteButton } from "./copy-invite-button";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();

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

  const [
    { data: members, error: membersError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from("group_members")
      .select("id,group_id,user_id,display_name,role,is_claimed,created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true }),
    supabase
      .from("sessions")
      .select("id,group_id,banker_id,status,started_at,ended_at,notes")
      .eq("group_id", groupId)
      .order("started_at", { ascending: false }),
  ]);

  if (membersError) {
    throw new Error(membersError.message);
  }

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: sessionPlayers, error: playersError } =
    sessionIds.length > 0
      ? await supabase.from("session_players").select("session_id").in("session_id", sessionIds)
      : { data: [], error: null };

  if (playersError) {
    throw new Error(playersError.message);
  }

  const playerCounts = new Map<string, number>();
  for (const row of sessionPlayers ?? []) {
    playerCounts.set(row.session_id, (playerCounts.get(row.session_id) ?? 0) + 1);
  }

  const activeSession = sessions?.find((session) => session.status === "active");

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50">{group.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
              Invite code <span className="font-semibold text-zinc-50">{group.invite_code}</span>
            </span>
            <CopyInviteButton inviteCode={group.invite_code} />
          </div>
        </div>
        <Link
          className="flex min-h-12 items-center justify-center rounded-md bg-zinc-100 px-5 font-medium text-zinc-950 hover:bg-white"
          href={`/groups/${group.id}/sessions/new`}
        >
          Start session
        </Link>
      </div>

      {activeSession ? (
        <Link
          className="block rounded-md border border-emerald-700 bg-emerald-950/60 p-4 text-emerald-100 hover:border-emerald-500"
          href={`/groups/${group.id}/sessions/${activeSession.id}`}
        >
          Active session in progress. Tap to jump back in.
        </Link>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-50">Members</h2>
        <div className="grid gap-3">
          {(members ?? []).map((member) => (
            <div
              className="flex min-h-12 items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-4"
              key={member.id}
            >
              <span className="font-medium text-zinc-100">{member.display_name}</span>
              <span className="text-sm capitalize text-zinc-400">{member.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-50">Past sessions</h2>
        {sessions && sessions.length > 0 ? (
          <div className="grid gap-3">
            {sessions.map((session) => (
              <Link
                className="block rounded-md border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600"
                href={`/groups/${group.id}/sessions/${session.id}`}
                key={session.id}
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium text-zinc-100">
                      {new Date(session.started_at).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {playerCounts.get(session.id) ?? 0}{" "}
                      {(playerCounts.get(session.id) ?? 0) === 1 ? "player" : "players"}
                    </p>
                  </div>
                  <span className="text-sm capitalize text-zinc-300">{session.status}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-5 text-zinc-300">
            No sessions yet.
          </div>
        )}
      </section>
    </div>
  );
}
