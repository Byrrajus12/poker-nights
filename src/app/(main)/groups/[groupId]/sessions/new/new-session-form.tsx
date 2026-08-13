"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Group, GroupMember } from "@/types";

type NewSessionFormProps = {
  currentUserId: string;
  group: Group;
  initialMembers: GroupMember[];
};

export function NewSessionForm({
  currentUserId,
  group,
  initialMembers,
}: NewSessionFormProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [checkedMemberIds, setCheckedMemberIds] = useState<Set<string>>(
    () =>
      new Set(
        initialMembers
          .filter((member) => member.user_id === currentUserId)
          .map((member) => member.id),
      ),
  );
  const [newPlayerName, setNewPlayerName] = useState("");
  const [error, setError] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const checkedCount = checkedMemberIds.size;
  const canStartSession = checkedCount >= 2 && !isStartingSession && !isAddingPlayer;
  const sortedMembers = useMemo(
    () =>
      [...members].sort((first, second) =>
        first.display_name.localeCompare(second.display_name),
      ),
    [members],
  );

  function toggleMember(memberId: string) {
    setCheckedMemberIds((current) => {
      const next = new Set(current);

      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }

      return next;
    });
  }

  async function handleAddPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const displayName = newPlayerName.trim();
    if (!displayName || isAddingPlayer || isStartingSession) {
      return;
    }

    setError("");
    setIsAddingPlayer(true);

    const supabase = createClient();
    const { data: member, error: memberError } = await supabase
      .from("group_members")
      .insert({
        display_name: displayName,
        group_id: group.id,
        is_claimed: false,
        role: "member",
        user_id: null,
      })
      .select("id,group_id,user_id,display_name,role,is_claimed,created_at")
      .single();

    if (memberError) {
      setError(memberError.message);
      setIsAddingPlayer(false);
      return;
    }

    setMembers((current) => [...current, member]);
    setCheckedMemberIds((current) => new Set(current).add(member.id));
    setNewPlayerName("");
    setIsAddingPlayer(false);
  }

  async function handleStartSession() {
    if (!canStartSession) {
      return;
    }

    setError("");
    setIsStartingSession(true);

    const supabase = createClient();
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        banker_id: currentUserId,
        group_id: group.id,
        status: "active",
      })
      .select("id")
      .single();

    if (sessionError) {
      setError(sessionError.message);
      setIsStartingSession(false);
      return;
    }

    const sessionPlayers = Array.from(checkedMemberIds).map((memberId) => ({
      member_id: memberId,
      session_id: session.id,
    }));

    const { error: playersError } = await supabase
      .from("session_players")
      .insert(sessionPlayers);

    if (playersError) {
      setError(playersError.message);
      setIsStartingSession(false);
      return;
    }

    router.push(`/groups/${group.id}/sessions/${session.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col pb-28">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Start session
        </p>
        <h1 className="text-3xl font-semibold text-zinc-50">{group.name}</h1>
        <p className="text-zinc-400">Pick who is at the table tonight.</p>
      </div>

      <div className="mt-8 space-y-3">
        {sortedMembers.length > 0 ? (
          sortedMembers.map((member) => {
            const isChecked = checkedMemberIds.has(member.id);

            return (
              <label
                className={`flex min-h-12 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-4 text-left transition hover:border-zinc-600 ${
                  isStartingSession ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                }`}
                key={member.id}
              >
                <span className="pr-4 font-medium text-zinc-100">
                  {member.display_name}
                </span>
                <input
                  checked={isChecked}
                  className="h-5 w-5 shrink-0 accent-emerald-400"
                  disabled={isStartingSession}
                  onChange={() => toggleMember(member.id)}
                  type="checkbox"
                />
              </label>
            );
          })
        ) : (
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-5 text-zinc-300">
            No roster members yet. Add the first player below.
          </div>
        )}
      </div>

      <form className="mt-8 flex gap-3" onSubmit={handleAddPlayer}>
        <input
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 text-base text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isAddingPlayer || isStartingSession}
          maxLength={80}
          onChange={(event) => setNewPlayerName(event.target.value)}
          placeholder="Add new player"
          type="text"
          value={newPlayerName}
        />
        <button
          className="min-h-12 rounded-md bg-zinc-100 px-5 font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!newPlayerName.trim() || isAddingPlayer || isStartingSession}
          type="submit"
        >
          {isAddingPlayer ? "Adding..." : "Add"}
        </button>
      </form>

      {error ? (
        <p className="mt-5 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            className="min-h-12 w-full rounded-md bg-emerald-400 px-5 font-semibold text-zinc-950 shadow-lg shadow-emerald-950/40 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
            disabled={!canStartSession}
            onClick={handleStartSession}
            type="button"
          >
            {isStartingSession
              ? "Starting..."
              : checkedCount >= 2
                ? `Start session with ${checkedCount} players`
                : "Select at least 2 players"}
          </button>
        </div>
      </div>
    </div>
  );
}
