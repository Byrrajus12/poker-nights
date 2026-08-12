"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-50">Create group</h1>
        <p className="mt-2 text-zinc-400">Name your poker crew and get an invite code.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-200" htmlFor="group-name">
            Group name
          </label>
          <input
            autoComplete="off"
            className="h-12 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 text-base text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
            id="group-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Friday Night Poker"
            required
            type="text"
            value={name}
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          className="min-h-12 w-full rounded-md bg-zinc-100 px-5 font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading || !name.trim()}
          type="submit"
        >
          {isLoading ? "Creating..." : "Create group"}
        </button>
      </form>
    </div>
  );
}
