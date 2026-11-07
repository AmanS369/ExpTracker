import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Navbar } from "@/components/navigation/Navbar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { GlobalAIAssistant } from "@/components/ai/GlobalAIAssistant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 pb-20 md:pb-10 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <MobileBottomNav />

      {/* Global Floating AI Assistant with 1-Hour Ephemeral Memory */}
      <Suspense fallback={null}>
        <GlobalAIAssistant />
      </Suspense>
    </div>
  );
}
