"use client";

import { FormEvent, useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { createClient } from "@/lib/supabase/client";
import type { GroupMember } from "@/types";

type Props = { initialMembers: GroupMember[]; canEdit: boolean };

export function MemberHandleEditor({ initialMembers, canEdit }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState(initialMembers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [venmo, setVenmo] = useState("");
  const [cashapp, setCashapp] = useState("");
  const [zelle, setZelle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = members.find((member) => member.id === selectedId) ?? null;

  function open(member: GroupMember) {
    if (!canEdit || member.is_claimed) return;
    setSelectedId(member.id);
    setVenmo(member.venmo_handle ?? "");
    setCashapp(member.cashapp_handle ?? "");
    setZelle(member.zelle_handle ?? "");
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const handles = {
      venmo_handle: venmo.trim().replace(/^@+/, "") || null,
      cashapp_handle: cashapp.trim().replace(/^\$+/, "") || null,
      zelle_handle: zelle.trim() || null,
    };
    setBusy(true); setMessage("");
    const { error } = await supabase.from("group_members").update(handles).eq("id", selected.id);
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setMembers((current) => current.map((member) => member.id === selected.id ? { ...member, ...handles } : member));
    setSelectedId(null);
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none]">
        {members.map((member) => {
          const editable = canEdit && !member.is_claimed;
          return (
            <button className={`flex shrink-0 flex-col items-center gap-2 ${editable ? "cursor-pointer" : "cursor-default"}`} disabled={!editable} key={member.id} onClick={() => open(member)} type="button">
              <PlayerAvatar name={member.display_name} size="lg" />
              <span className="max-w-14 truncate text-center text-[13px] text-ink-2">{member.display_name}</span>
            </button>
          );
        })}
      </div>
      <BottomSheet onClose={() => setSelectedId(null)} open={Boolean(selected)} title={selected?.display_name ?? "Player"} eyebrow="Payment handles">
        <form className="space-y-3" onSubmit={save}>
          <HandleInput label="Venmo handle" onChange={setVenmo} placeholder="username, no @" value={venmo} />
          <HandleInput label="Cash App handle" onChange={setCashapp} placeholder="$cashtag, no $" value={cashapp} />
          <HandleInput label="Zelle handle" onChange={setZelle} placeholder="email or phone" value={zelle} />
          {message ? <p className="rounded-2xl bg-surface-2 p-3 text-sm text-danger">{message}</p> : null}
          <button className="h-14 w-full rounded-full bg-accent text-[17px] font-semibold text-accent-ink transition active:scale-[0.98] disabled:bg-surface-2 disabled:text-ink-3" disabled={busy} type="submit">{busy ? "Saving…" : "Save handles"}</button>
        </form>
      </BottomSheet>
    </>
  );
}

function HandleInput({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-[13px] font-medium text-ink-2">{label}</span><input className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} /></label>;
}
