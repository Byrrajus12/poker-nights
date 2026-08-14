"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { createClient } from "@/lib/supabase/client";
import type { GroupMember, MemberRole } from "@/types";

type Props = {
  creatorId: string;
  currentUserId: string | null;
  initialMembers: GroupMember[];
};

export function MemberRoleManager({ creatorId, currentUserId, initialMembers }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState(initialMembers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const isAdmin = Boolean(currentUserId && members.some((member) => member.user_id === currentUserId && member.role === "admin"));

  async function setRole(member: GroupMember, role: MemberRole) {
    if (!isAdmin || busyId || (member.user_id === creatorId && role === "member")) return;

    setBusyId(member.id);
    setError("");
    const { data, error: updateError } = await supabase
      .from("group_members")
      .update({ role })
      .eq("id", member.id)
      .eq("group_id", member.group_id)
      .select("role")
      .single();
    setBusyId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role: data.role } : item));
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3">Members</h2>
      {error ? <p className="mb-3 rounded-2xl bg-surface-2 p-3 text-sm text-danger">{error}</p> : null}
      <div className="divide-y divide-line rounded-3xl bg-surface">
        {members.map((member) => {
          const isCreator = member.user_id === creatorId;
          const isBusy = busyId === member.id;

          return (
            <article className="flex items-center gap-3 p-3.5" key={member.id}>
              <PlayerAvatar name={member.display_name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[15px] font-semibold text-ink">{member.display_name}</p>
                  {member.role === "admin" ? <ShieldCheck aria-label="Admin" className="shrink-0 text-accent" size={16} /> : null}
                </div>
                <p className="mt-0.5 text-[13px] text-ink-2">
                  <span className="capitalize">{member.role}</span>
                  <span aria-hidden> · </span>
                  {member.is_claimed ? "Has account" : "Unclaimed"}
                  {isCreator ? " · Creator" : ""}
                </p>
              </div>
              {isAdmin && member.is_claimed && !isCreator ? (
                <button
                  className="min-h-10 shrink-0 rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-ink transition active:scale-[0.98] disabled:text-ink-3"
                  disabled={Boolean(busyId)}
                  onClick={() => void setRole(member, member.role === "admin" ? "member" : "admin")}
                  type="button"
                >
                  {isBusy ? "Saving…" : member.role === "admin" ? "Remove admin" : "Make admin"}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
