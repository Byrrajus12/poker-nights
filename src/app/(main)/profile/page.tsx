"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadUserAvatar, validateAvatarFile } from "@/lib/avatar-upload";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import type { PaymentMethod } from "@/types";

const methods: { value: PaymentMethod; label: string }[] = [{ value: "venmo", label: "Venmo" }, { value: "cashapp", label: "Cash App" }, { value: "zelle", label: "Zelle" }];

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("Player");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("venmo");
  const [venmoHandle, setVenmoHandle] = useState("");
  const [cashappHandle, setCashappHandle] = useState("");
  const [zelleHandle, setZelleHandle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false);
        return;
      }
      setUserId(data.user.id); setEmail(data.user.email ?? "");
      const { data: profile } = await supabase.from("users").select("display_name,email,avatar_url,preferred_payment_method,venmo_handle,cashapp_handle,zelle_handle").eq("id", data.user.id).maybeSingle();
      setDisplayName(profile?.display_name || data.user.email?.split("@")[0] || "Player");
      setEmail(profile?.email || data.user.email || "");
      setAvatarUrl(profile?.avatar_url ?? null);
      if (profile?.preferred_payment_method) setMethod(profile.preferred_payment_method);
      setVenmoHandle(profile?.venmo_handle ?? "");
      setCashappHandle(profile?.cashapp_handle ?? "");
      setZelleHandle(profile?.zelle_handle ?? "");
      setLoading(false);
    });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!userId) return;
    const trimmedName = displayName.trim();
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("users").update({
      display_name: trimmedName,
      preferred_payment_method: method,
      venmo_handle: venmoHandle.trim().replace(/^@+/, "") || null,
      cashapp_handle: cashappHandle.trim().replace(/^\$+/, "") || null,
      zelle_handle: zelleHandle.trim() || null,
    }).eq("id", userId);

    if (error) {
      setBusy(false); setMessageType("error"); setMessage(error.message);
      return;
    }

    const { error: memberError } = await supabase
      .from("group_members")
      .update({ display_name: trimmedName })
      .eq("user_id", userId);

    setBusy(false);
    setMessageType(memberError ? "error" : "success");
    setMessage(memberError ? `Profile saved, but roster names could not sync: ${memberError.message}` : "Profile saved.");
    if (!memberError) router.refresh();
  }

  async function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setMessageType("error"); setMessage(validation.error ?? "Choose a valid image.");
      return;
    }

    setUploadingAvatar(true); setMessage("");
    const supabase = createClient();
    try {
      const nextAvatarUrl = await uploadUserAvatar(supabase, userId, file);
      setAvatarUrl(nextAvatarUrl);
      const { error: memberError } = await supabase
        .from("group_members")
        .update({ avatar_url: nextAvatarUrl })
        .eq("user_id", userId);
      if (memberError) {
        setMessageType("error");
        setMessage(`Photo uploaded, but roster photos could not sync: ${memberError.message}`);
        return;
      }

      setMessageType("success"); setMessage("Profile photo updated.");
      router.refresh();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Could not update your profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function signOut() {
    await createClient().auth.signOut(); router.push("/login"); router.refresh();
  }

  if (loading) return <ProfileSkeleton />;

  return (
    <section>
      <header className="flex items-center gap-4">
        <div className="relative shrink-0">
          <PlayerAvatar avatarUrl={avatarUrl} name={displayName} size="lg" />
          <label className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-3 text-ink shadow-lg transition active:scale-95" title="Change profile photo">
            <Camera aria-hidden size={14} />
            <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingAvatar} onChange={changeAvatar} type="file" />
            <span className="sr-only">Change profile photo</span>
          </label>
        </div>
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
          <p className={`rounded-2xl bg-surface-2 p-3 text-sm ${messageType === "success" ? "text-positive" : "text-danger"}`}>
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

function ProfileSkeleton() {
  return (
    <section aria-label="Loading profile" className="animate-pulse">
      <header className="flex h-14 items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-gray-800" />
        <div className="space-y-2">
          <div className="h-8 w-28 rounded-lg bg-gray-800" />
          <div className="h-4 w-40 rounded bg-gray-700" />
        </div>
      </header>

      <div className="mt-7 space-y-5 rounded-3xl bg-surface p-5">
        <SkeletonField />
        <div>
          <div className="mb-2 h-3 w-28 rounded bg-gray-700" />
          <div className="h-11 w-full rounded-xl bg-gray-800" />
        </div>
        <div className="space-y-3 border-t border-line pt-5">
          <div className="mb-2 h-3 w-32 rounded bg-gray-700" />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </div>
        <div className="h-14 w-full rounded-full bg-gray-800" />
      </div>

      <div className="mt-4 h-12 w-full rounded-full bg-gray-800" />
    </section>
  );
}

function SkeletonField() {
  return (
    <div>
      <div className="mb-2 h-3 w-24 rounded bg-gray-700" />
      <div className="h-12 w-full rounded-2xl bg-gray-800" />
    </div>
  );
}
