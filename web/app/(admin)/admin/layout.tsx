import { Header } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/sidebar";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen max-w-[1400px]">
      <Sidebar />
      <div className="flex-1 flex flex-col max-w-[1144px]">
        <Header />
        <main className="p-2">{children}</main>
      </div>
    </div>
  );
}
