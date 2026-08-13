"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Group, GroupMember } from "@/types";
import { PlayerAvatar } from "@/components/ui/player-avatar";

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
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);

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
    setIsAddPlayerOpen(false);
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
    <div className="space-y-8 pb-28">
      <Link className="inline-flex h-11 items-center gap-1 text-[15px] font-medium text-ink-2" href={`/groups/${group.id}`}>
        <ChevronLeft className="h-5 w-5" />
        Back
      </Link>

      <div className="space-y-1">
        <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Who&apos;s playing?</h1>
        <p className="text-[15px] text-ink-2">Select everyone at the table.</p>
      </div>

      {sortedMembers.length > 0 || isAddPlayerOpen ? (
        <div className="grid grid-cols-2 gap-3">
          {sortedMembers.map((member) => {
            const isChecked = checkedMemberIds.has(member.id);

            return (
              <button
                aria-pressed={isChecked}
                className={`relative flex flex-col items-center gap-2 rounded-3xl p-4 text-center transition ${
                  isChecked ? "bg-surface-2 ring-2 ring-accent -translate-y-0.5" : "bg-surface"
                } ${isStartingSession ? "cursor-not-allowed opacity-70" : ""}`}
                disabled={isStartingSession}
                key={member.id}
                onClick={() => toggleMember(member.id)}
                type="button"
              >
                {isChecked ? (
                  <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink">
                    <Check size={12} strokeWidth={2.5} />
                  </span>
                ) : null}
                <PlayerAvatar name={member.display_name} size="lg" />
                <span className="w-full truncate text-[14px] font-semibold text-ink">
                  {member.display_name}
                </span>
              </button>
            );
          })}

          {isAddPlayerOpen ? (
            <form
              className="col-span-2 flex flex-col gap-2 rounded-3xl bg-surface p-4"
              onSubmit={handleAddPlayer}
            >
              <input
                autoComplete="off"
                autoFocus
                className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
                disabled={isAddingPlayer || isStartingSession}
                maxLength={80}
                onChange={(event) => setNewPlayerName(event.target.value)}
                placeholder="New player name"
                type="text"
                value={newPlayerName}
              />
              <div className="flex gap-2">
                <button
                  className="h-12 flex-1 rounded-full bg-surface-2 text-ink text-[15px] font-semibold active:scale-[0.98] transition"
                  disabled={isAddingPlayer || isStartingSession}
                  onClick={() => {
                    setIsAddPlayerOpen(false);
                    setNewPlayerName("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-12 flex-1 rounded-full bg-accent text-accent-ink text-[15px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3"
                  disabled={!newPlayerName.trim() || isAddingPlayer || isStartingSession}
                  type="submit"
                >
                  {isAddingPlayer ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          ) : (
            <button
              className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-2 p-4 text-center text-ink-2 transition disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isStartingSession}
              onClick={() => setIsAddPlayerOpen(true)}
              type="button"
            >
              <Plus className="h-6 w-6" />
              <span className="text-[14px] font-semibold">Add player</span>
            </button>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-ink-2">No players yet. Add the first one below.</p>
      )}

      {error ? (
        <p className="rounded-2xl bg-surface-2 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 hairline-t bg-bg/78 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            className="h-14 w-full rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3"
            disabled={!canStartSession}
            onClick={handleStartSession}
            type="button"
          >
            {isStartingSession
              ? "Starting…"
              : checkedCount >= 2
                ? `Start session · ${checkedCount} players`
                : "Select at least 2 players"}
          </button>
        </div>
      </div>
    </div>
  );
}
