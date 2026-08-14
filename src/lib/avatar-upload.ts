import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const avatarExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AvatarMimeType = keyof typeof avatarExtensions;

export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!(file.type in avatarExtensions)) {
    return { valid: false, error: "Choose a JPEG, PNG, or WebP image." };
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return { valid: false, error: "Profile photos must be 2 MB or smaller." };
  }

  return { valid: true };
}

function cacheBustedUrl(publicUrl: string) {
  const separator = publicUrl.includes("?") ? "&" : "?";
  return `${publicUrl}${separator}t=${Date.now()}`;
}

async function uploadAvatar(
  supabase: SupabaseClient<Database>,
  path: string,
  file: File,
) {
  const validation = validateAvatarFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return cacheBustedUrl(data.publicUrl);
}

export async function uploadUserAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
) {
  const extension = avatarExtensions[file.type as AvatarMimeType];
  const avatarUrl = await uploadAvatar(
    supabase,
    `users/${userId}/avatar.${extension}`,
    file,
  );

  const { error } = await supabase
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select("id")
    .single();
  if (error) throw error;

  return avatarUrl;
}

export async function uploadMemberAvatar(
  supabaseAdmin: SupabaseClient<Database>,
  memberId: string,
  file: File,
) {
  const extension = avatarExtensions[file.type as AvatarMimeType];
  const avatarUrl = await uploadAvatar(
    supabaseAdmin,
    `members/${memberId}/avatar.${extension}`,
    file,
  );

  const { data: member, error } = await supabaseAdmin
    .from("group_members")
    .update({ avatar_url: avatarUrl })
    .eq("id", memberId)
    .eq("is_claimed", false)
    .is("user_id", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!member) throw new Error("That member has already been claimed.");

  return avatarUrl;
}
