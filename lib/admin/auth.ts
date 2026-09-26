import { redirect } from "next/navigation";
import { isPublicDbConfigured } from "../supabase/public";
import { supabaseServer } from "../supabase/server";

export interface AdminUser {
  id: string;
  email: string | null;
}

/**
 * The signed-in admin, or a redirect to the login page.
 *
 * Membership of `admins` is the check, not merely being signed in: Supabase
 * auth would happily authenticate any account that exists in the project.
 */
export async function requireAdmin(): Promise<AdminUser> {
  // Before the project is wired up there is no auth to check against. Say so on
  // the login page rather than throwing a 500 from inside the client.
  if (!isPublicDbConfigured()) redirect("/admin/login?setup=1");

  const db = await supabaseServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  const { data: admin } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!admin) redirect("/admin/login?denied=1");

  return { id: auth.user.id, email: auth.user.email ?? null };
}
