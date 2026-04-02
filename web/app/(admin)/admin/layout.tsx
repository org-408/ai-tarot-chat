import { auth } from "@/auth";
import { Header } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/sidebar";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/admin/auth/signin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/admin/auth/signin");
  }

  return (
    <div className="flex min-h-screen max-w-[1400px]">
      <Sidebar />
      <div className="flex-1 flex flex-col max-w-[1144px]">
        <Header user={session.user} />
        <main className="p-2">{children}</main>
      </div>
    </div>
  );
}
