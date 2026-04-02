import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

interface SearchParams {
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "OAuth認証に失敗しました。",
  OAuthCallback: "認証コールバックの処理中にエラーが発生しました。",
  OAuthAccountNotLinked: "別の方法で既に登録されたメールアドレスです。",
  default: "認証中にエラーが発生しました。",
};

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, { error }] = await Promise.all([
    auth(),
    searchParams,
  ]);

  // すでにサインイン済みの場合
  if (session) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    }
    // サインイン済みだが ADMIN でない
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">🚫</div>
          <h1 className="text-xl font-bold text-slate-800">アクセス権限がありません</h1>
          <p className="text-sm text-slate-500">
            <strong>{session.user.email}</strong> は管理者権限を持っていません。
          </p>
          <form
            action={async () => {
              "use server";
              const { signOut } = await import("@/auth");
              await signOut({ redirectTo: "/admin/auth/signin" });
            }}
          >
            <button
              type="submit"
              className="w-full py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              別のアカウントでサインイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.default)
    : null;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🔮</div>
          <h1 className="text-2xl font-bold text-slate-800">管理者ログイン</h1>
          <p className="text-sm text-slate-500">AI Tarot Chat 管理システム</p>
        </div>

        {errorMessage && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {errorMessage}
          </div>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/admin" });
          }}
        >
          <button
            type="submit"
            className="w-full h-12 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center gap-3 transition shadow-sm hover:shadow-md text-gray-700 font-medium"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google でサインイン（管理者）
          </button>
        </form>

        <p className="text-xs text-center text-slate-400">
          管理者権限のある Google アカウントでサインインしてください
        </p>
      </div>
    </div>
  );
}
