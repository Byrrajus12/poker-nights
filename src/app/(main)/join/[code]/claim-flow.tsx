"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Group, GroupMember } from "@/types";

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
      setError("That player was just claimed. Pick another name or join as new.");
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
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-50">
      <section className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-zinc-400">Invite accepted</p>
          <h1 className="text-3xl font-semibold">Join {group.name}</h1>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-medium text-zinc-200">
            Are you one of these players?
          </h2>

          {unclaimedMembers.length ? (
            <div className="space-y-2">
              {unclaimedMembers.map((member) => (
                <button
                  className="min-h-14 w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 text-left text-base font-medium text-zinc-50 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isBusy}
                  key={member.id}
                  onClick={() => claimMember(member.id)}
                  type="button"
                >
                  {pendingId === member.id ? "Claiming..." : member.display_name}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
              No unclaimed players are left.
            </p>
          )}
        </div>

        <button
          className="h-12 w-full rounded-md bg-zinc-50 px-4 text-base font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isBusy}
          onClick={joinAsNew}
          type="button"
        >
          {isJoiningNew ? "Joining..." : "I'm new to this group"}
        </button>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </section>
    </main>
  );
}
