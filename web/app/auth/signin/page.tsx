import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/signin-form";
import { Suspense } from "react";

interface SearchParams {
  callbackUrl?: string;
  error?: string;
  isTauri?: string;
}

// ローディング用のスケルトン
const LoadingSkeleton = () => (
  <div className="space-y-3">
    <div className="w-full h-12 bg-white/20 rounded-lg animate-pulse"></div>
    <div className="w-full h-12 bg-white/20 rounded-lg animate-pulse"></div>
  </div>
);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const params = await searchParams;

  console.log("Current session:", session);
  console.log("Search Params:", params);

  // 既にログイン済みの場合の処理
  // if (session) {
  //   if (params.isTauri) {
  //     return redirect(
  //       `/auth/tauri-callback?success=true&user=${encodeURIComponent(
  //         JSON.stringify(session.user)
  //       )}`
  //     );
  //   }
  //   return redirect(params.callbackUrl || "/dashboard");
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* メインカード */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="text-7xl mb-6 filter drop-shadow-lg">🔮</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-300 to-purple-300 bg-clip-text text-transparent mb-3">
              AIタロット占い
            </h1>
            <p className="text-white/70 text-lg font-medium">
              AIが導く、あなたの未来への扉
            </p>

            {/* 装飾的な区切り線 */}
            <div className="flex items-center justify-center gap-2 mt-6 mb-2">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-white/30"></div>
              <div className="w-2 h-2 bg-white/40 rounded-full"></div>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-white/30"></div>
            </div>
          </div>

          {/* サインインフォーム */}
          <Suspense fallback={<LoadingSkeleton />}>
            <SignInForm error={params.error} isTauri={!!params.isTauri} />
          </Suspense>

          {/* 信頼性の表示 */}
          <div className="mt-8 flex items-center justify-center gap-6 text-white/50 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span>安全な認証</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span>データ保護</span>
            </div>
          </div>
        </div>

        {/* サブテキスト */}
        <div className="text-center mt-6 text-white/40 text-sm">
          <p>数千年の叡智と最新AI技術の融合</p>
          <p className="mt-1">あなただけの運命を照らします</p>
        </div>
      </div>
    </div>
  );
}
