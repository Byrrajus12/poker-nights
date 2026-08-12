import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClaimFlow from "./claim-flow";

export default async function JoinWithCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  if (groupError || !group) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
        <section className="w-full max-w-sm space-y-3 text-center">
          <h1 className="text-2xl font-semibold">Invalid invite code</h1>
          <p className="text-sm text-zinc-400">
            Check the code and ask your host for a fresh invite if it still does
            not work.
          </p>
        </section>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      redirect(`/groups/${group.id}`);
    }
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("id, display_name, is_claimed")
    .eq("group_id", group.id)
    .order("display_name", { ascending: true });

  return <ClaimFlow group={group} members={members ?? []} />;
}
