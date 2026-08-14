import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { AmountDisplay } from "@/components/ui/amount-display";
import { PotDisplay } from "@/components/ui/pot-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { FeltCard } from "@/components/ui/felt-card";
import { formatDuration, formatSessionDate } from "@/lib/utils";
import { CopyInviteButton } from "./copy-invite-button";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: group, error: groupError } = await supabase.from("groups").select("id,name,invite_code,created_by,buyin_presets,created_at").eq("id", groupId).maybeSingle();
  if (groupError) throw new Error(groupError.message);
  if (!group) notFound();

  const [membersResult, sessionsResult] = await Promise.all([
    supabase.from("group_members").select("id,group_id,user_id,display_name,role,is_claimed,payment_handle,payment_method,created_at").eq("group_id", groupId).order("created_at"),
    supabase.from("sessions").select("id,group_id,banker_id,status,started_at,ended_at,notes").eq("group_id", groupId).order("started_at", { ascending: false }),
  ]);
  if (membersResult.error || sessionsResult.error) throw new Error(membersResult.error?.message ?? sessionsResult.error?.message ?? "Could not load group");
  const members = membersResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const sessionIds = sessions.map((session) => session.id);
  const [playersResult, transactionsResult] = sessionIds.length ? await Promise.all([
    supabase.from("session_players").select("session_id").in("session_id", sessionIds),
    supabase.from("transactions").select("session_id,type,amount").in("session_id", sessionIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (playersResult.error || transactionsResult.error) throw new Error(playersResult.error?.message ?? transactionsResult.error?.message ?? "Could not load sessions");
  const playerCount = (id: string) => (playersResult.data ?? []).filter((row) => row.session_id === id).length;
  const pot = (id: string) => (transactionsResult.data ?? []).filter((row) => row.session_id === id && row.type === "buyin").reduce((sum, row) => sum + row.amount, 0);
  const activeSession = sessions.find((session) => session.status === "active");
  const history = sessions.filter((session) => session.status !== "active");

  return (
    <div className="space-y-8">
      <Link className="inline-flex h-11 items-center gap-1 text-[15px] font-medium text-ink-2" href="/dashboard">
        <ChevronLeft className="h-5 w-5" />
        Back
      </Link>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-[30px] font-bold tracking-[-0.02em] text-ink">{group.name}</h1>
          <Link aria-label="Group settings" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2" href={`/groups/${group.id}/settings`}>
            <Settings className="h-5 w-5 text-ink-2" />
          </Link>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-[13px] text-ink-2">{members.length} {members.length === 1 ? "member" : "members"}</span>
          <CopyInviteButton inviteCode={group.invite_code} />
        </div>
      </div>

      {activeSession ? (
        <Link className="block" href={`/groups/${group.id}/sessions/${activeSession.id}`}>
          <FeltCard variant="live">
            <div className="p-[22px]">
              <div className="flex items-center justify-between gap-3">
                <StatusBadge onFelt status="active" />
                <ChevronRight className="h-5 w-5 text-on-felt-dim" />
              </div>
              <p className="font-serif-accent mt-4 text-[17px] text-on-felt-dim">tonight&apos;s pot</p>
              <PotDisplay amount={pot(activeSession.id)} className="mt-1" />
              <p className="mt-3 text-[13px] text-on-felt-dim">
                {formatDuration(activeSession.started_at)} · {playerCount(activeSession.id)} {playerCount(activeSession.id) === 1 ? "player" : "players"}
              </p>
            </div>
          </FeltCard>
        </Link>
      ) : (
        <Link className="grid h-14 w-full place-items-center rounded-full bg-accent text-[17px] font-semibold text-accent-ink transition active:scale-[0.98]" href={`/groups/${group.id}/sessions/new`}>
          Start a session
        </Link>
      )}

      <section>
        <h2 className="mb-3 mt-8 text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3">Players</h2>
        <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none]">
          {members.map((member) => (
            <div className="flex shrink-0 flex-col items-center gap-2" key={member.id}>
              <PlayerAvatar name={member.display_name} size="lg" />
              <p className="max-w-14 truncate text-center text-[13px] text-ink-2">{member.display_name}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 mt-8 text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3">History</h2>
        {history.length ? (
          <div className="divide-y divide-line rounded-3xl bg-surface">
            {history.map((session) => (
              <Link className="flex items-center gap-3 px-4 py-3.5" href={`/groups/${group.id}/sessions/${session.id}`} key={session.id}>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{formatSessionDate(session.started_at)}</p>
                  <p className="mt-1 text-[13px] text-ink-2">{playerCount(session.id)} players · {formatDuration(session.started_at, session.ended_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <AmountDisplay amount={pot(session.id)} size="md" />
                  {session.status === "settling" ? (
                    <StatusBadge status="settling" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-ink-3" strokeWidth={2} />
                      <ChevronRight className="h-5 w-5 text-ink-3" />
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-surface p-4">
            <p className="text-[13px] text-ink-3">No sessions yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
