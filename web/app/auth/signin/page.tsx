import { SignInViewTracker } from "@/components/analytics/signin-view-tracker";
import { SignInForm } from "@/components/auth/signin-form";
import { Suspense } from "react";

interface SearchParams {
  callbackUrl?: string;
  error?: string;
  isMobile?: string;
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    <div className="w-full h-12 bg-white/20 rounded-lg animate-pulse"></div>
    <div className="w-full h-12 bg-white/20 rounded-lg animate-pulse"></div>
  </div>
);

const generateStars = () => {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
  }));
};

// モバイル WebView 向けレイアウト（従来通り）
function MobileSignInLayout({
  error,
  stars,
}: {
  error?: string;
  stars: ReturnType<typeof generateStars>;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl" />
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
      <style dangerouslySetInnerHTML={{ __html: `@keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }` }} />

      <div className="relative w-full max-w-md">
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30">
          <Suspense fallback={null}>
            <SignInViewTracker />
          </Suspense>
          <div className="text-center mb-8">
            <div className="text-7xl mb-6 filter drop-shadow-lg">🔮</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-200 to-purple-200 bg-clip-text text-transparent mb-3">
              Ai Tarot Chat
            </h1>
            <p className="text-white/80 text-lg font-medium">AIと対話するタロット占い</p>
            <div className="flex items-center justify-center gap-2 mt-6 mb-2">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-white/40" />
              <div className="w-2 h-2 bg-white/50 rounded-full" />
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-white/40" />
            </div>
          </div>
          <Suspense fallback={<LoadingSkeleton />}>
            <SignInForm error={error} isMobileApp />
          </Suspense>
        </div>
        <div className="text-center mt-6 text-white/50 text-sm">
          <p>数千年の叡智と最新AI技術の融合</p>
          <p className="mt-1">あなただけの運命を照らします</p>
        </div>
      </div>
    </div>
  );
}

// Web ブラウザ向けレイアウト（OG画像左・サインインカード右）
function WebSignInLayout({ error }: { error?: string }) {
  return (
    <div className="min-h-screen bg-[#0f0a1e] flex">
      {/* 左カラム: OG 画像そのまま */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center bg-[#0f0a1e] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/og"
          alt="Ai Tarot Chat"
          className="w-full h-full object-contain"
        />
        {/* 右端グラデーション（左カラム内でのみ有効） */}
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#0f0a1e] pointer-events-none" />
      </div>

      {/* 右カラム: サインインカード */}
      <div className="w-full lg:w-[420px] lg:flex-none flex flex-col items-center justify-center p-8 bg-[#0f0a1e]">
        {/* モバイルブラウザ向けロゴ（lg以下で表示） */}
        <div className="lg:hidden mb-10 text-center">
          <span className="text-5xl block mb-3">🔮</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-sky-300 to-purple-300 bg-clip-text text-transparent">
            Ai Tarot Chat
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
            <Suspense fallback={null}>
              <SignInViewTracker />
            </Suspense>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-2">サインイン</h2>
              <p className="text-sm text-white/50">
                Google または Apple アカウントで続けてください
              </p>
            </div>
            <Suspense fallback={<div className="space-y-3"><div className="w-full h-12 bg-white/10 rounded-lg animate-pulse" /><div className="w-full h-12 bg-white/10 rounded-lg animate-pulse" /></div>}>
              <SignInForm error={error} isMobileApp={false} />
            </Suspense>
          </div>

          <p className="text-center text-white/25 text-xs mt-6">
            <a href="/terms" className="hover:text-white/50 transition-colors" target="_blank" rel="noopener noreferrer">利用規約</a>
            {" · "}
            <a href="/privacy" className="hover:text-white/50 transition-colors" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const isMobileApp = params.isMobile === "true";

  if (isMobileApp) {
    return <MobileSignInLayout error={params.error} stars={generateStars()} />;
  }

  return <WebSignInLayout error={params.error} />;
}
