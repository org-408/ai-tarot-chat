import { adminAuth, adminRawAuth } from "@/admin-auth";
import { Header } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/sidebar";
import { SidebarProvider } from "@/components/admin/sidebar-context";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await adminAuth();

  if (!session) {
    // 未サインイン or 未承認の場合を区別
    const rawSession = await adminRawAuth();
    if (rawSession?.user?.email) {
      // サインイン済みだが未承認 → pending ページへ
      redirect("/admin/auth/pending");
    } else {
      // 未サインイン → signin ページへ
      redirect("/admin/auth/signin");
    }
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen overflow-hidden max-w-[1400px]">
        <Header user={session.user} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-2">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
