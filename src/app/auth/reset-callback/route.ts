import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/update-password`);
    }

    return NextResponse.redirect(`${origin}/login?error=reset_callback`);
  }

  // With the legacy implicit flow, the browser preserves the URL fragment
  // across this redirect and the browser client restores the session from it.
  return NextResponse.redirect(`${origin}/update-password`);
}
