"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import type { PaymentMethod } from "@/types";

const methods: { value: PaymentMethod; label: string }[] = [{ value: "venmo", label: "Venmo" }, { value: "cashapp", label: "Cash App" }, { value: "zelle", label: "Zelle" }];

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("Player");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("venmo");
  const [venmoHandle, setVenmoHandle] = useState("");
  const [cashappHandle, setCashappHandle] = useState("");
  const [zelleHandle, setZelleHandle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id); setEmail(data.user.email ?? "");
      const { data: profile } = await supabase.from("users").select("display_name,email,preferred_payment_method,venmo_handle,cashapp_handle,zelle_handle").eq("id", data.user.id).maybeSingle();
      setDisplayName(profile?.display_name || data.user.email?.split("@")[0] || "Player");
      setEmail(profile?.email || data.user.email || "");
      if (profile?.preferred_payment_method) setMethod(profile.preferred_payment_method);
      setVenmoHandle(profile?.venmo_handle ?? "");
      setCashappHandle(profile?.cashapp_handle ?? "");
      setZelleHandle(profile?.zelle_handle ?? "");
    });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!userId) return;
    setBusy(true); setMessage("");
    const { error } = await createClient().from("users").update({
      display_name: displayName.trim(),
      preferred_payment_method: method,
      venmo_handle: venmoHandle.trim().replace(/^@+/, "") || null,
      cashapp_handle: cashappHandle.trim().replace(/^\$+/, "") || null,
      zelle_handle: zelleHandle.trim() || null,
    }).eq("id", userId);
    setBusy(false); setMessage(error ? error.message : "Profile saved.");
    if (!error) router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut(); router.push("/login"); router.refresh();
  }

  return (
    <section>
      <header className="flex items-center gap-4">
        <PlayerAvatar name={displayName} size="lg" />
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Profile</h1>
          <p className="text-[15px] text-ink-2">{email}</p>
        </div>
      </header>

      <form className="mt-7 rounded-3xl bg-surface p-5 space-y-5" onSubmit={save}>
        <label className="block">
          <span className="block text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3 mb-2">Display name</span>
          <input
            className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15"
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
        </label>

        <fieldset>
          <legend className="text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3 mb-2">Payment method</legend>
          <div className="flex h-11 items-center rounded-xl bg-surface-2 p-1">
            {methods.map((item) => (
              <button
                className={`flex-1 h-full rounded-lg text-[13px] font-semibold transition ${
                  method === item.value ? "bg-surface-3 text-ink" : "text-ink-2"
                }`}
                key={item.value}
                onClick={() => setMethod(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3 border-t border-line pt-5">
          <legend className="mb-2 text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3">Payment handles</legend>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-ink-2">Venmo handle</span>
            <input className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15" onChange={(event) => setVenmoHandle(event.target.value)} placeholder="username, no @" value={venmoHandle} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-ink-2">Cash App handle</span>
            <input className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15" onChange={(event) => setCashappHandle(event.target.value)} placeholder="$cashtag, no $" value={cashappHandle} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-ink-2">Zelle handle</span>
            <input className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15" onChange={(event) => setZelleHandle(event.target.value)} placeholder="email or phone" value={zelleHandle} />
          </label>
        </fieldset>

        {message ? (
          <p className={`rounded-2xl bg-surface-2 p-3 text-sm ${message === "Profile saved." ? "text-positive" : "text-danger"}`}>
            {message}
          </p>
        ) : null}

        <button
          className="h-14 w-full rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3"
          disabled={busy || !displayName.trim()}
          type="submit"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>

      <button
        className="mt-4 h-12 w-full rounded-full bg-transparent text-danger text-[15px] font-semibold transition hover:bg-surface"
        onClick={signOut}
        type="button"
      >
        Sign out
      </button>
    </section>
  );
}
