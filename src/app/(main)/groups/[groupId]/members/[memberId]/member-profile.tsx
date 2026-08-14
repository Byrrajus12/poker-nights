"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { Camera, ChevronLeft, ShieldCheck } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { validateAvatarFile } from "@/lib/avatar-upload";
import type { GroupMember } from "@/types";
import { updateMemberAvatar, updateMemberProfile } from "./actions";

type MemberData = Pick<GroupMember, "id" | "group_id" | "user_id" | "display_name" | "avatar_url" | "role" | "is_claimed" | "venmo_handle" | "cashapp_handle" | "zelle_handle">;

export function MemberProfile({ initialMember, permission }: { initialMember: MemberData; permission: "edit" | "view" }) {
  const [member, setMember] = useState(initialMember);
  const [displayName, setDisplayName] = useState(initialMember.display_name);
  const [venmoHandle, setVenmoHandle] = useState(initialMember.venmo_handle ?? "");
  const [cashappHandle, setCashappHandle] = useState(initialMember.cashapp_handle ?? "");
  const [zelleHandle, setZelleHandle] = useState(initialMember.zelle_handle ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (permission !== "edit" || busy) return;
    setBusy(true);
    setMessage("");
    const result = await updateMemberProfile(member.id, member.group_id, {
      display_name: displayName,
      venmo_handle: venmoHandle,
      cashapp_handle: cashappHandle,
      zelle_handle: zelleHandle,
    });
    setBusy(false);

    if ("error" in result) {
      setMessageType("error");
      setMessage(result.error ?? "Could not update the profile.");
      return;
    }

    setMember((current) => ({
      ...current,
      display_name: displayName.trim(),
      venmo_handle: venmoHandle.trim().replace(/^@+/, "") || null,
      cashapp_handle: cashappHandle.trim().replace(/^\$+/, "") || null,
      zelle_handle: zelleHandle.trim() || null,
    }));
    setDisplayName(displayName.trim());
    setMessageType("success");
    setMessage("Member profile saved.");
  }

  async function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || permission !== "edit" || uploading) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setMessageType("error");
      setMessage(validation.error ?? "Choose a valid image.");
      return;
    }

    setUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.set("avatar", file);
    const result = await updateMemberAvatar(member.id, member.group_id, formData);
    setUploading(false);

    if ("error" in result) {
      setMessageType("error");
      setMessage(result.error ?? "Could not update the photo.");
      return;
    }

    setMember((current) => ({ ...current, avatar_url: result.avatarUrl }));
    setMessageType("success");
    setMessage("Member photo updated.");
  }

  return (
    <section>
      <Link className="mb-6 inline-flex h-11 items-center gap-1 text-[15px] font-medium text-ink-2" href={`/groups/${member.group_id}`}>
        <ChevronLeft className="h-5 w-5" />
        Back
      </Link>

      <header className="flex items-center gap-4">
        <div className="relative shrink-0">
          <PlayerAvatar avatarUrl={member.avatar_url} name={member.display_name} size="lg" />
          {permission === "edit" ? (
            <label className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-3 text-ink shadow-lg transition active:scale-95" title="Change member photo">
              <Camera aria-hidden size={14} />
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(event) => void changeAvatar(event)} type="file" />
              <span className="sr-only">Change member photo</span>
            </label>
          ) : null}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[30px] font-bold tracking-[-0.02em] text-ink">{member.display_name}</h1>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-semibold capitalize text-ink-2">
            {member.role === "admin" ? <ShieldCheck aria-hidden className="text-accent" size={14} /> : null}
            {member.role}
          </span>
        </div>
      </header>

      {permission === "edit" ? (
        <form className="mt-7 space-y-5 rounded-3xl bg-surface p-5" onSubmit={save}>
          <ProfileInput label="Display name" onChange={setDisplayName} value={displayName} />
          <fieldset className="space-y-3 border-t border-line pt-5">
            <legend className="mb-2 text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3">Payment handles</legend>
            <ProfileInput label="Venmo handle" onChange={setVenmoHandle} placeholder="username, no @" value={venmoHandle} />
            <ProfileInput label="Cash App handle" onChange={setCashappHandle} placeholder="$cashtag, no $" value={cashappHandle} />
            <ProfileInput label="Zelle handle" onChange={setZelleHandle} placeholder="email or phone" value={zelleHandle} />
          </fieldset>
          {message ? <Message text={message} type={messageType} /> : null}
          <button className="h-14 w-full rounded-full bg-accent text-[17px] font-semibold text-accent-ink transition active:scale-[0.98] disabled:bg-surface-2 disabled:text-ink-3" disabled={busy || !displayName.trim()} type="submit">
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      ) : (
        <section className="mt-7 rounded-3xl bg-surface p-5">
          <h2 className="mb-4 text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3">Payment handles</h2>
          <div className="divide-y divide-line">
            <HandleRow label="Venmo" value={member.venmo_handle} />
            <HandleRow label="Cash App" value={member.cashapp_handle} />
            <HandleRow label="Zelle" value={member.zelle_handle} />
          </div>
        </section>
      )}
    </section>
  );
}

function ProfileInput({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-ink-2">{label}</span>
      <input className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-white/15" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

function HandleRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="text-[15px] text-ink-2">{label}</span>
      <span className={`truncate text-[15px] font-medium ${value ? "text-ink" : "text-ink-3"}`}>{value || "Not set"}</span>
    </div>
  );
}

function Message({ text, type }: { text: string; type: "success" | "error" }) {
  return <p className={`rounded-2xl bg-surface-2 p-3 text-sm ${type === "success" ? "text-positive" : "text-danger"}`}>{text}</p>;
}
