import { getServerSessionClient } from "@/lib/supabase/server";

// The admin API routes are NOT covered by the /admin/:path* middleware matcher,
// so this is their SOLE auth gate. getUser() revalidates the token with the
// Supabase Auth server; getSession() (cookie-only decode) would be spoofable.
export async function requireAdminSession(): Promise<boolean> {
  const supabase = getServerSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
