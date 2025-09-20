import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/signin-form";
import { redirect } from "next/navigation";
import { Suspense } from "react";

interface SearchParams {
  callbackUrl?: string;
  error?: string;
  isTauri?: string;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  // 既にログイン済みの場合
  if (session) {
    // Tauriからのアクセスの場合は特別処理
    if (searchParams.isTauri) {
      return redirect(
        `/auth/tauri-callback?success=true&user=${encodeURIComponent(
          JSON.stringify(session.user)
        )}`
      );
    }
    return redirect(searchParams.callbackUrl || "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
      <div className="w-full max-w-md p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔮</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              AIタロット占い
            </h1>
            <p className="text-white/80">AIが導く、あなたの未来</p>
          </div>

          <Suspense fallback={<div>Loading...</div>}>
            <SignInForm
              error={searchParams.error}
              isTauri={!!searchParams.isTauri}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
