"use server";

import { revalidatePath } from "next/cache";
import { uploadMemberAvatar, uploadUserAvatar } from "@/lib/avatar-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type MemberProfileUpdate = {
  display_name?: string;
  venmo_handle?: string;
  cashapp_handle?: string;
  zelle_handle?: string;
};

async function authorizeMemberEdit(memberId: string, groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." } as const;

  const adminSupabase = createAdminClient();
  const [{ data: group, error: groupError }, { data: viewer, error: viewerError }, { data: member, error: memberError }] = await Promise.all([
    adminSupabase.from("groups").select("created_by").eq("id", groupId).maybeSingle(),
    adminSupabase.from("group_members").select("id, role").eq("group_id", groupId).eq("user_id", user.id).maybeSingle(),
    adminSupabase.from("group_members").select("id, user_id, is_claimed").eq("id", memberId).eq("group_id", groupId).maybeSingle(),
  ]);

  if (groupError || viewerError || memberError || !group || !viewer || !member) {
    return { error: "That group member could not be found." } as const;
  }

  const canEdit = member.user_id === user.id
    || group.created_by === user.id
    || (viewer.role === "admin" && !member.is_claimed);

  if (!canEdit) return { error: "You don't have permission to edit this profile." } as const;
  return { adminSupabase, member } as const;
}

function normalizeHandle(value: string | undefined, prefix: RegExp) {
  if (value === undefined) return undefined;
  return value.trim().replace(prefix, "") || null;
}

function revalidateMemberPages(groupId: string, memberId: string) {
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/settings`);
  revalidatePath(`/groups/${groupId}/members/${memberId}`);
}

export async function updateMemberProfile(
  memberId: string,
  groupId: string,
  data: MemberProfileUpdate,
) {
  const authorization = await authorizeMemberEdit(memberId, groupId);
  if ("error" in authorization) return { error: authorization.error };

  const updates: Database["public"]["Tables"]["group_members"]["Update"] = {};
  if (data.display_name !== undefined) {
    const displayName = data.display_name.trim();
    if (!displayName) return { error: "Name cannot be empty." };
    updates.display_name = displayName;
  }

  const venmoHandle = normalizeHandle(data.venmo_handle, /^@+/);
  const cashappHandle = normalizeHandle(data.cashapp_handle, /^\$+/);
  const zelleHandle = data.zelle_handle === undefined ? undefined : data.zelle_handle.trim() || null;
  if (venmoHandle !== undefined) updates.venmo_handle = venmoHandle;
  if (cashappHandle !== undefined) updates.cashapp_handle = cashappHandle;
  if (zelleHandle !== undefined) updates.zelle_handle = zelleHandle;

  if (Object.keys(updates).length === 0) return { success: true as const };

  const { error: memberError } = await authorization.adminSupabase
    .from("group_members")
    .update(updates)
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (memberError?.code === "23505") return { error: "That name is already in this group." };
  if (memberError) return { error: memberError.message };

  if (authorization.member.is_claimed && authorization.member.user_id) {
    const userUpdates: Database["public"]["Tables"]["users"]["Update"] = {};
    if (updates.display_name !== undefined) userUpdates.display_name = updates.display_name;
    if (updates.venmo_handle !== undefined) userUpdates.venmo_handle = updates.venmo_handle;
    if (updates.cashapp_handle !== undefined) userUpdates.cashapp_handle = updates.cashapp_handle;
    if (updates.zelle_handle !== undefined) userUpdates.zelle_handle = updates.zelle_handle;

    const { error: userError } = await authorization.adminSupabase
      .from("users")
      .update(userUpdates)
      .eq("id", authorization.member.user_id);
    if (userError) return { error: `Roster saved, but the account profile could not sync: ${userError.message}` };
  }

  revalidateMemberPages(groupId, memberId);
  return { success: true as const };
}

export async function updateMemberAvatar(memberId: string, groupId: string, formData: FormData) {
  const authorization = await authorizeMemberEdit(memberId, groupId);
  if ("error" in authorization) return { error: authorization.error };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };

  try {
    let avatarUrl: string;
    if (authorization.member.is_claimed && authorization.member.user_id) {
      avatarUrl = await uploadUserAvatar(authorization.adminSupabase, authorization.member.user_id, file);
      const { error } = await authorization.adminSupabase
        .from("group_members")
        .update({ avatar_url: avatarUrl })
        .eq("id", memberId)
        .eq("group_id", groupId);
      if (error) throw error;
    } else {
      avatarUrl = await uploadMemberAvatar(authorization.adminSupabase, memberId, file);
    }

    revalidateMemberPages(groupId, memberId);
    return { success: true as const, avatarUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the photo." };
  }
}
