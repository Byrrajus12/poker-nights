"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Camera, Check, Pencil, ShieldCheck, X } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { validateAvatarFile } from "@/lib/avatar-upload";
import { createClient } from "@/lib/supabase/client";
import type { GroupMember, MemberRole } from "@/types";
import { updateMemberAvatar, updateMemberName } from "./actions";

type Props = {
  creatorId: string;
  currentUserId: string | null;
  initialMembers: GroupMember[];
};

export function MemberRoleManager({ creatorId, currentUserId, initialMembers }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState(initialMembers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
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

  function beginNameEdit(member: GroupMember) {
    if (!isAdmin || member.is_claimed || busyId) return;
    setEditingId(member.id);
    setNameDraft(member.display_name);
    setError("");
  }

  async function saveName(member: GroupMember) {
    if (!nameDraft.trim() || busyId) return;
    setBusyId(member.id);
    setError("");
    const result = await updateMemberName(member.id, member.group_id, nameDraft);
    setBusyId(null);

    if ("error" in result) {
      setError(result.error ?? "Could not update the member name.");
      return;
    }

    const displayName = nameDraft.trim();
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, display_name: displayName } : item));
    setEditingId(null);
  }

  async function changeAvatar(member: GroupMember, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busyId) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setError(validation.error ?? "Choose a valid image.");
      return;
    }

    setBusyId(member.id);
    setError("");
    const formData = new FormData();
    formData.set("avatar", file);
    const result = await updateMemberAvatar(member.id, member.group_id, formData);
    setBusyId(null);

    if ("error" in result) {
      setError(result.error ?? "Could not update the member photo.");
      return;
    }

    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, avatar_url: result.avatarUrl } : item));
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
              <div className="relative shrink-0">
                <PlayerAvatar avatarUrl={member.avatar_url} name={member.display_name} size="md" />
                {isAdmin && !member.is_claimed ? (
                  <label className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-3 text-ink shadow-md transition active:scale-95" title={`Change ${member.display_name}'s photo`}>
                    <Camera aria-hidden size={12} />
                    <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(busyId)} onChange={(event) => void changeAvatar(member, event)} type="file" />
                    <span className="sr-only">Change {member.display_name}&apos;s photo</span>
                  </label>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {editingId === member.id ? (
                    <input
                      aria-label={`Name for ${member.display_name}`}
                      autoFocus
                      className="h-9 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-[15px] font-semibold text-ink outline-none focus:ring-2 focus:ring-white/15"
                      disabled={isBusy}
                      onChange={(event) => setNameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveName(member);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      value={nameDraft}
                    />
                  ) : (
                    <button className="min-w-0 truncate text-left text-[15px] font-semibold text-ink" disabled={!isAdmin || member.is_claimed || Boolean(busyId)} onClick={() => beginNameEdit(member)} type="button">
                      {member.display_name}
                    </button>
                  )}
                  {member.role === "admin" ? <ShieldCheck aria-label="Admin" className="shrink-0 text-accent" size={16} /> : null}
                  {isAdmin && !member.is_claimed && editingId !== member.id ? <Pencil aria-hidden className="shrink-0 text-ink-3" size={13} /> : null}
                </div>
                <p className="mt-0.5 text-[13px] text-ink-2">
                  <span className="capitalize">{member.role}</span>
                  <span aria-hidden> · </span>
                  {member.is_claimed ? "Has account" : "Unclaimed"}
                  {isCreator ? " · Creator" : ""}
                </p>
              </div>
              {editingId === member.id ? (
                <div className="flex shrink-0 gap-1">
                  <button aria-label="Save name" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-ink disabled:bg-surface-2 disabled:text-ink-3" disabled={isBusy || !nameDraft.trim()} onClick={() => void saveName(member)} type="button">
                    <Check size={17} />
                  </button>
                  <button aria-label="Cancel name edit" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2" disabled={isBusy} onClick={() => setEditingId(null)} type="button">
                    <X size={17} />
                  </button>
                </div>
              ) : null}
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
