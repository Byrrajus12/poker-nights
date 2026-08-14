"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidId(value: string) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isMembershipConstraint(error: { details?: string; message: string }) {
  return `${error.message} ${error.details ?? ""}`.toLowerCase().includes("user_id");
}

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export async function claimMember(memberId: string, groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" } as const;
  if (!isValidId(memberId) || !isValidId(groupId)) {
    return { error: "Invalid claim request." } as const;
  }

  try {
    const adminSupabase = createAdminClient();
    const { data: member, error: memberError } = await adminSupabase
      .from("group_members")
      .select("id, display_name, avatar_url, venmo_handle, cashapp_handle, zelle_handle")
      .eq("id", memberId)
      .eq("group_id", groupId)
      .eq("is_claimed", false)
      .is("user_id", null)
      .maybeSingle();

    if (memberError) {
      return { error: "We couldn't verify that player. Try again in a moment." } as const;
    }
    if (!member) {
      return { error: "That name was just claimed. Pick another or join as new." } as const;
    }

    const { data: existingMember, error: membershipError } = await adminSupabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return { error: "We couldn't verify your membership. Try again in a moment." } as const;
    }
    if (existingMember) {
      return { error: "You're already a member of this group." } as const;
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("users")
      .select("display_name, avatar_url, venmo_handle, cashapp_handle, zelle_handle")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { error: "We couldn't load your profile. Try again in a moment." } as const;
    }

    const { data: claimedMember, error: claimError } = await adminSupabase
      .from("group_members")
      .update({
        user_id: user.id,
        is_claimed: true,
        ...(!member.avatar_url && profile?.avatar_url ? { avatar_url: profile.avatar_url } : {}),
      })
      .eq("id", memberId)
      .eq("group_id", groupId)
      .eq("is_claimed", false)
      .is("user_id", null)
      .select("id")
      .maybeSingle();

    if (claimError?.code === UNIQUE_VIOLATION) {
      return { error: "You're already a member of this group." } as const;
    }
    if (claimError) {
      return { error: "We couldn't claim that player. Try again in a moment." } as const;
    }
    if (!claimedMember) {
      return { error: "That name was just claimed. Pick another or join as new." } as const;
    }

    const profileUpdates: {
      display_name?: string;
      venmo_handle?: string;
      cashapp_handle?: string;
      zelle_handle?: string;
    } = {};
    const emailPrefix = user.email?.split("@")[0]?.trim() ?? "";
    const profileName = profile?.display_name?.trim() ?? "";
    const hasDefaultName = Boolean(
      emailPrefix
      && !/\s/.test(profileName)
      && profileName.toLowerCase() === emailPrefix.toLowerCase(),
    );

    if (hasDefaultName && member.display_name.trim()) {
      profileUpdates.display_name = member.display_name.trim();
    }
    if (!hasValue(profile?.venmo_handle) && hasValue(member.venmo_handle)) {
      profileUpdates.venmo_handle = member.venmo_handle!.trim();
    }
    if (!hasValue(profile?.cashapp_handle) && hasValue(member.cashapp_handle)) {
      profileUpdates.cashapp_handle = member.cashapp_handle!.trim();
    }
    if (!hasValue(profile?.zelle_handle) && hasValue(member.zelle_handle)) {
      profileUpdates.zelle_handle = member.zelle_handle!.trim();
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileUpdateError } = await adminSupabase
        .from("users")
        .update(profileUpdates)
        .eq("id", user.id);

      if (profileUpdateError) {
        return {
          error: "Your player was claimed, but we couldn't sync the roster details to your profile.",
        } as const;
      }
    }

    return { success: true, groupId } as const;
  } catch {
    return { error: "We couldn't claim that player. Try again in a moment." } as const;
  }
}

export async function joinAsNew(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" } as const;
  if (!isValidId(groupId)) return { error: "Invalid group." } as const;

  try {
    const adminSupabase = createAdminClient();
    const { data: existingMember, error: membershipError } = await adminSupabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return { error: "We couldn't verify your membership. Try again in a moment." } as const;
    }
    if (existingMember) {
      return { error: "You're already a member of this group." } as const;
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("users")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { error: "We couldn't load your profile. Try again in a moment." } as const;
    }

    const displayName = profile?.display_name?.trim() || user.email?.split("@")[0] || "New player";
    const { error: insertError } = await adminSupabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      display_name: displayName,
      avatar_url: profile?.avatar_url ?? null,
      role: "member",
      is_claimed: true,
    });

    if (insertError?.code === UNIQUE_VIOLATION) {
      if (isMembershipConstraint(insertError)) {
        return { error: "You're already a member of this group." } as const;
      }
      return {
        error: "A player with that name is already in this group. Claim that name instead.",
      } as const;
    }
    if (insertError?.code === FOREIGN_KEY_VIOLATION) {
      return { error: "That group is no longer available." } as const;
    }
    if (insertError) {
      return { error: "We couldn't add you to the group. Try again in a moment." } as const;
    }

    return { success: true, groupId } as const;
  } catch {
    return { error: "We couldn't add you to the group. Try again in a moment." } as const;
  }
}
