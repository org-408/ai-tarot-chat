"use client";
import { useSidebar } from "./sidebar-context";
import { MdMenu } from "react-icons/md";

export function SidebarToggle() {
  const { toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded hover:bg-sky-500 transition"
      aria-label="サイドバーの表示切替"
    >
      <MdMenu className="w-5 h-5" />
    </button>
  );
}
