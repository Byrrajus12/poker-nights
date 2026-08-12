import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const groupIds = [...new Set((memberships ?? []).map((member) => member.group_id))];

  const [{ data: groups, error: groupsError }, { data: memberRows, error: countsError }] =
    groupIds.length > 0
      ? await Promise.all([
          supabase
            .from("groups")
            .select("id,name,invite_code,created_by,buyin_presets,created_at")
            .in("id", groupIds)
            .order("created_at", { ascending: false }),
          supabase.from("group_members").select("group_id").in("group_id", groupIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (groupsError) {
    throw new Error(groupsError.message);
  }

  if (countsError) {
    throw new Error(countsError.message);
  }

  const memberCounts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCounts.set(row.group_id, (memberCounts.get(row.group_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-50">Dashboard</h1>
          <p className="mt-2 text-zinc-400">Your poker groups and invite codes.</p>
        </div>
        <Link
          className="flex min-h-12 items-center justify-center rounded-md bg-zinc-100 px-5 font-medium text-zinc-950 hover:bg-white"
          href="/groups/new"
        >
          Create group
        </Link>
      </div>

      {groups && groups.length > 0 ? (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Link
              className="block rounded-md border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600"
              href={`/groups/${group.id}`}
              key={group.id}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-medium text-zinc-50">{group.name}</h2>
                  <p className="mt-1 text-sm text-zinc-400">Invite code {group.invite_code}</p>
                </div>
                <p className="text-sm text-zinc-300">
                  {memberCounts.get(group.id) ?? 0}{" "}
                  {(memberCounts.get(group.id) ?? 0) === 1 ? "member" : "members"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-zinc-200">No groups yet. Create one or join with an invite code.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              className="flex min-h-12 items-center justify-center rounded-md bg-zinc-100 px-5 font-medium text-zinc-950"
              href="/groups/new"
            >
              Create group
            </Link>
            <Link
              className="flex min-h-12 items-center justify-center rounded-md border border-zinc-700 px-5 font-medium text-zinc-100"
              href="/join"
            >
              Join group
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
