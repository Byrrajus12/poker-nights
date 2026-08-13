import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MainNav } from "./main-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_name,email")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name || user.user_metadata?.display_name || profile?.email || user.email || "Player";

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <MainNav displayName={displayName} />
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-24">{children}</main>
    </div>
  );
}
