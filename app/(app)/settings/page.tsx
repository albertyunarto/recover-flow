import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <SettingsForm profile={profile} />

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium mb-3">Account</h2>
        <p className="text-sm text-muted-foreground mb-3">{profile.email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md border border-destructive/30 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
