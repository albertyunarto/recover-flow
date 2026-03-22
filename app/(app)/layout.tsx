import { redirect } from "next/navigation";
import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { PostureTimer } from "@/components/posture/posture-timer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const profile = await getUserProfile();
  const currentPhase = profile?.current_phase ?? 1;
  const currentWeek = profile?.current_week ?? 1;

  return (
    <div className="flex min-h-screen flex-col">
      <Header phase={currentPhase} week={currentWeek} />

      <div className="flex flex-1">
        <Sidebar currentPhase={currentPhase} />

        <main className="flex-1 pb-20 md:pb-6 md:ml-56">
          <div className="max-w-2xl mx-auto px-4 py-6">{children}</div>
        </main>
      </div>

      <BottomNav currentPhase={currentPhase} />
      <PostureTimer />
    </div>
  );
}
