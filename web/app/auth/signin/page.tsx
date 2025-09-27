import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/signin-form";
import { redirect } from "next/navigation";
import { Suspense } from "react";

interface SearchParams {
  callbackUrl?: string;
  error?: string;
  isMobile?: string;
}

// ローディング用のスケルトン
const LoadingSkeleton = () => (
  <div className="space-y-3">
    <div className="w-full h-12 bg-white/20 rounded-lg animate-pulse"></div>
    <div className="w-full h-12 bg-white/20 rounded-lg animate-pulse"></div>
  </div>
);

// 星の生成関数
const generateStars = () => {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
  }));
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const params = await searchParams;

  console.log("Current session:", session);
  console.log("Search Params:", params);

  const stars = generateStars();

  // 既にログイン済みの場合の処理
  if (session) {
    if (params.isMobile) {
      return redirect("/auth/mobile/callback?success=true");
    }
    return redirect(params.callbackUrl || "/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800 flex items-center justify-center p-4">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"></div>

        {/* キラキラ星のアニメーション */}
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* CSSアニメーション */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
      `,
        }}
      />

      <div className="relative w-full max-w-md">
        {/* メインカード */}
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="text-7xl mb-6 filter drop-shadow-lg">🔮</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-200 to-purple-200 bg-clip-text text-transparent mb-3">
              Ai Tarot Chat
            </h1>
            <p className="text-white/80 text-lg font-medium">
              AIと対話するタロット占い
            </p>

            {/* 装飾的な区切り線 */}
            <div className="flex items-center justify-center gap-2 mt-6 mb-2">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-white/40"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full"></div>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-white/40"></div>
            </div>
          </div>

          {/* サインインフォーム */}
          <Suspense fallback={<LoadingSkeleton />}>
            <SignInForm error={params.error} isMobileApp={!!params.isMobile} />
          </Suspense>

          {/* 信頼性の表示 */}
          <div className="mt-8 flex items-center justify-center gap-6 text-white/60 text-sm">
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
        <div className="text-center mt-6 text-white/50 text-sm">
          <p>数千年の叡智と最新AI技術の融合</p>
          <p className="mt-1">あなただけの運命を照らします</p>
        </div>
      </div>
    </div>
  );
}
