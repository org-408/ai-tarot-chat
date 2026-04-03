import { signOut } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { SidebarToggle } from "./sidebar-toggle";

interface HeaderUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function Header({ user }: { user?: HeaderUser }) {
  return (
    <header className="flex-none bg-sky-600 text-white">
      <div className="mx-auto max-w-screen-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarToggle />
          <div className="font-semibold">🔮 AIタロット占い 管理システム</div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sky-800 bg-sky-100">
            {user?.email ?? "---"}
          </Badge>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/auth/signin" });
            }}
          >
            <button
              type="submit"
              className="text-sm underline underline-offset-4 cursor-pointer"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
