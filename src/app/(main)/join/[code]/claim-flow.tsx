"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Group, GroupMember } from "@/types";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { ChevronRight } from "lucide-react";
import { claimMember as claimMemberAction, joinAsNew as joinAsNewAction } from "./actions";

type ClaimFlowProps = {
  group: Pick<Group, "id" | "name">;
  members: Pick<GroupMember, "id" | "display_name" | "avatar_url" | "is_claimed">[];
};

export default function ClaimFlow({ group, members }: ClaimFlowProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isJoiningNew, setIsJoiningNew] = useState(false);

  const unclaimedMembers = useMemo(
    () => members.filter((member) => !member.is_claimed),
    [members],
  );

  async function claimMember(memberId: string) {
    setError("");
    setPendingId(memberId);

    try {
      const result = await claimMemberAction(memberId, group.id);
      if ("error" in result && result.error) {
        setError(result.error);
        router.refresh();
        return;
      }

      router.push(`/groups/${result.groupId}`);
    } catch {
      setError("We couldn't claim that player. Try again in a moment.");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function joinAsNew() {
    setError("");
    setIsJoiningNew(true);

    try {
      const result = await joinAsNewAction(group.id);
      if ("error" in result && result.error) {
        setError(result.error);
        router.refresh();
        return;
      }

      router.push(`/groups/${result.groupId}`);
    } catch {
      setError("We couldn't add you to the group. Try again in a moment.");
      router.refresh();
    } finally {
      setIsJoiningNew(false);
    }
  }

  const isBusy = pendingId !== null || isJoiningNew;

  return (
    <section>
      <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Join {group.name}</h1>
      <p className="mt-1 text-[15px] text-ink-2">
        Pick your name if the host already added you.
      </p>

      <div className="mt-7 rounded-3xl bg-surface divide-y divide-line overflow-hidden">
        {unclaimedMembers.length ? (
          unclaimedMembers.map((member) => (
            <button
              className="flex h-14 w-full items-center gap-3 px-4 text-left transition active:bg-surface-2 disabled:opacity-60"
              disabled={isBusy}
              key={member.id}
              onClick={() => claimMember(member.id)}
              type="button"
            >
              <PlayerAvatar avatarUrl={member.avatar_url} name={member.display_name} size="sm" />
              <span className="text-[15px] font-semibold text-ink">
                {pendingId === member.id ? "Claiming…" : member.display_name}
              </span>
              <ChevronRight size={18} className="ml-auto text-ink-3" />
            </button>
          ))
        ) : (
          <p className="px-4 py-3 text-[15px] text-ink-2">
            Everyone on the list has been claimed.
          </p>
        )}
      </div>

      <button
        className="mt-4 h-14 w-full rounded-full bg-surface-2 text-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:text-ink-3"
        disabled={isBusy}
        onClick={joinAsNew}
        type="button"
      >
        {isJoiningNew ? "Joining…" : "Join as a new player"}
      </button>

      {error ? (
        <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm text-danger">{error}</p>
      ) : null}
    </section>
  );
}
