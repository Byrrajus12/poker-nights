"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const INVITE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const UNIQUE_VIOLATION = "23505";

function randomInviteCode() {
  return Array.from({ length: 6 }, () =>
    INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)],
  ).join("");
}

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function getInviteCode() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("generate_invite_code");

    if (error || !data) {
      return randomInviteCode();
    }

    return data;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createClient();
    const trimmedName = name.trim();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You need to be signed in to create a group.");
      setIsLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("display_name,email")
      .eq("id", user.id)
      .maybeSingle();

    const displayName =
      profile?.display_name || user.user_metadata?.display_name || profile?.email || user.email || "Player";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inviteCode = attempt === 0 ? await getInviteCode() : randomInviteCode();

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          created_by: user.id,
          invite_code: inviteCode,
          name: trimmedName,
        })
        .select()
        .single();

      if (groupError) {
        if (groupError.code === UNIQUE_VIOLATION && attempt < 4) {
          continue;
        }

        setError(groupError.message);
        setIsLoading(false);
        return;
      }

      const { error: memberError } = await supabase.from("group_members").insert({
        display_name: displayName,
        group_id: group.id,
        is_claimed: true,
        role: "admin",
        user_id: user.id,
      });

      if (memberError) {
        setError(memberError.message);
        setIsLoading(false);
        return;
      }

      router.push(`/groups/${group.id}`);
      router.refresh();
      return;
    }

    setError("Could not generate a unique invite code. Please try again.");
    setIsLoading(false);
  }

  return (
    <div className="space-y-7">
      <Link className="inline-flex h-11 items-center gap-1 text-[15px] font-medium text-ink-2" href="/dashboard">
        <ChevronLeft className="h-5 w-5" />
        Back
      </Link>

      <div>
        <h1 className="text-[30px] font-bold tracking-[-0.02em] text-ink">Create a group</h1>
        <p className="mt-1 text-[15px] text-ink-2">You&apos;ll get an invite code to share.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-[11px] font-[650] uppercase tracking-[0.10em] text-ink-3" htmlFor="group-name">
            Group name
          </label>
          <input
            autoComplete="off"
            className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[17px] text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-white/15"
            id="group-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Friday night game"
            required
            type="text"
            value={name}
          />
        </div>

        {error ? <p className="rounded-2xl bg-surface-2 p-3 text-sm text-danger">{error}</p> : null}

        <button
          className="h-14 w-full rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3"
          disabled={isLoading || !name.trim()}
          type="submit"
        >
          {isLoading ? "Creating…" : "Create group"}
        </button>
      </form>
    </div>
  );
}
