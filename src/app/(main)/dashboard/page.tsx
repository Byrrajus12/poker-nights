import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { FeltCard } from "@/components/ui/felt-card";
import { formatDuration, formatSessionDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships, error } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  const groupIds = [...new Set((memberships ?? []).map((row) => row.group_id))];

  const [groupsResult, membersResult, sessionsResult] = groupIds.length ? await Promise.all([
    supabase.from("groups").select("id,name,invite_code,created_by,buyin_presets,created_at").in("id", groupIds),
    supabase.from("group_members").select("group_id,display_name,avatar_url").in("group_id", groupIds).order("created_at"),
    supabase.from("sessions").select("id,group_id,status,started_at").in("group_id", groupIds).order("started_at", { ascending: false }),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (groupsResult.error || membersResult.error || sessionsResult.error) throw new Error(groupsResult.error?.message ?? membersResult.error?.message ?? sessionsResult.error?.message ?? "Could not load dashboard");

  const groups = (groupsResult.data ?? []).map((group) => {
    const members = (membersResult.data ?? []).filter((member) => member.group_id === group.id);
    const sessions = (sessionsResult.data ?? []).filter((session) => session.group_id === group.id);
    return { ...group, members, active: sessions.find((session) => session.status === "active"), latest: sessions[0] };
  }).sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || new Date(b.latest?.started_at ?? b.created_at).getTime() - new Date(a.latest?.started_at ?? a.created_at).getTime());

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Groups</h1>
        <Link aria-label="Create group" className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-ink transition active:scale-95" href="/groups/new">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </Link>
      </div>

      {groups.length ? (
        <div className="space-y-3">
          {groups.map((group) =>
            group.active ? (
              <Link className="block" href={`/groups/${group.id}`} key={group.id}>
                <FeltCard variant="live">
                  <div className="p-[22px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[17px] font-bold text-on-felt">{group.name}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge onFelt status="active" />
                        <span className="text-[13px] font-medium text-on-felt-dim">{formatDuration(group.active.started_at)}</span>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 4).map((member, index) => (
                          <PlayerAvatar avatarUrl={member.avatar_url} key={`${member.display_name}-${index}`} name={member.display_name} ring size="md" />
                        ))}
                      </div>
                      <span className="text-[15px] font-semibold text-on-felt">
                        {group.members.length} at the table
                      </span>
                    </div>
                  </div>
                </FeltCard>
              </Link>
            ) : (
              <Link className="block rounded-3xl bg-surface p-[18px]" href={`/groups/${group.id}`} key={group.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[16px] font-[650] text-ink">{group.name}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 4).map((member, index) => (
                      <PlayerAvatar avatarUrl={member.avatar_url} key={`${member.display_name}-${index}`} name={member.display_name} size="sm" />
                    ))}
                  </div>
                  <span className="text-[13px] text-ink-2">
                    {group.members.length} {group.members.length === 1 ? "player" : "players"} ·{" "}
                    {group.latest ? `Last game ${formatSessionDate(group.latest.started_at).toLowerCase()}` : "No games yet"}
                  </span>
                </div>
              </Link>
            )
          )}
        </div>
      ) : (
        <div className="py-16 text-center">
          <h2 className="text-[20px] font-semibold text-ink">No groups yet</h2>
          <p className="mt-1 text-[15px] text-ink-2">Create one for your game or join with an invite code.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link className="grid h-14 w-full place-items-center rounded-full bg-accent text-[17px] font-semibold text-accent-ink transition active:scale-[0.98]" href="/groups/new">
              Create a group
            </Link>
            <Link className="grid h-14 w-full place-items-center rounded-full bg-surface-2 text-[17px] font-semibold text-ink transition active:scale-[0.98]" href="/join">
              Join with a code
            </Link>
          </div>
        </div>
      )}

      {groups.length ? (
        <Link className="mt-6 grid h-12 place-items-center rounded-full bg-surface-2 text-[15px] font-medium text-ink-2" href="/join">
          Join with an invite code
        </Link>
      ) : null}
    </div>
  );
}
