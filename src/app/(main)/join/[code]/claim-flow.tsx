"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Group, GroupMember } from "@/types";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { ChevronRight } from "lucide-react";

type ClaimFlowProps = {
  group: Pick<Group, "id" | "name">;
  members: Pick<GroupMember, "id" | "display_name" | "is_claimed">[];
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

  async function getCurrentUser() {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return null;
    }

    return user;
  }

  async function claimMember(memberId: string) {
    setError("");
    setPendingId(memberId);

    const user = await getCurrentUser();
    if (!user) return;

    const supabase = createClient();
    const { data, error: claimError } = await supabase
      .from("group_members")
      .update({ user_id: user.id, is_claimed: true })
      .eq("id", memberId)
      .eq("group_id", group.id)
      .eq("is_claimed", false)
      .is("user_id", null)
      .select("id")
      .maybeSingle();

    setPendingId(null);

    if (claimError || !data) {
      setError("That name was just claimed. Pick another or join as new.");
      router.refresh();
      return;
    }

    router.push(`/groups/${group.id}`);
  }

  async function joinAsNew() {
    setError("");
    setIsJoiningNew(true);

    const user = await getCurrentUser();
    if (!user) return;

    const supabase = createClient();
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setError("We couldn't load your profile. Try again in a moment.");
      setIsJoiningNew(false);
      return;
    }

    const displayName =
      profile?.display_name ?? user.email?.split("@")[0] ?? "New player";

    const { error: insertError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      display_name: displayName,
      role: "member",
      is_claimed: true,
    });

    setIsJoiningNew(false);

    if (insertError) {
      setError(insertError.message);
      router.refresh();
      return;
    }

    router.push(`/groups/${group.id}`);
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
              <PlayerAvatar name={member.display_name} size="sm" />
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
