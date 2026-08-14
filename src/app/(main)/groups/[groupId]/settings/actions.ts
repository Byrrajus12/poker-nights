"use server";

import { revalidatePath } from "next/cache";
import { uploadMemberAvatar } from "@/lib/avatar-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function authorizeUnclaimedMember(memberId: string, groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." } as const;

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: "Only group admins can edit unclaimed members." } as const;
  }

  const { data: member, error: memberError } = await supabase
    .from("group_members")
    .select("id")
    .eq("id", memberId)
    .eq("group_id", groupId)
    .eq("is_claimed", false)
    .is("user_id", null)
    .maybeSingle();

  if (memberError || !member) {
    return { error: "That unclaimed member could not be found." } as const;
  }

  return { supabase } as const;
}

export async function updateMemberAvatar(memberId: string, groupId: string, formData: FormData) {
  const authorization = await authorizeUnclaimedMember(memberId, groupId);
  if ("error" in authorization) return { error: authorization.error };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };

  try {
    const avatarUrl = await uploadMemberAvatar(createAdminClient(), memberId, file);
    revalidatePath(`/groups/${groupId}/settings`);
    return { success: true as const, avatarUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the photo." };
  }
}

export async function updateMemberName(memberId: string, groupId: string, newName: string) {
  const authorization = await authorizeUnclaimedMember(memberId, groupId);
  if ("error" in authorization) return { error: authorization.error };

  const displayName = newName.trim();
  if (!displayName) return { error: "Name cannot be empty." };

  const { data: updatedMember, error } = await authorization.supabase
    .from("group_members")
    .update({ display_name: displayName })
    .eq("id", memberId)
    .eq("group_id", groupId)
    .eq("is_claimed", false)
    .is("user_id", null)
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") return { error: "That name is already in this group." };
  if (error) return { error: error.message };
  if (!updatedMember) return { error: "That member has already been claimed." };

  revalidatePath(`/groups/${groupId}/settings`);
  return { success: true as const };
}
