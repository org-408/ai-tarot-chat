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

const FEATURES = [
  { icon: "🔮", title: "AI タロットリーディング", desc: "最先端 AI が78枚のカードから深い洞察を引き出します" },
  { icon: "✨", title: "パーソナル占い", desc: "あなたの悩みや状況に合わせた対話型セッション" },
  { icon: "🌙", title: "豊富なスプレッド", desc: "ケルト十字・三択・一枚引きなど多彩なスプレッドに対応" },
  { icon: "🛡️", title: "安全・プライバシー保護", desc: "OAuth 認証でパスワード不要。データは厳重に保護" },
];

// Web ブラウザ向けレイアウト（2カラム）
function WebSignInLayout({ error }: { error?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex">
      {/* 左カラム: ブランド・特徴 */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>

        {/* ロゴ */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔮</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-sky-300 to-purple-300 bg-clip-text text-transparent">
              Ai Tarot Chat
            </span>
          </div>
        </div>

        {/* キャッチコピー */}
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            数千年の叡智と
            <br />
            <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              最新 AI が出会う
            </span>
            <br />
            タロット体験
          </h2>
          <p className="text-white/60 text-lg mb-12">
            あなたの悩みに寄り添い、カードが示す道を<br />AI 占い師が丁寧に読み解きます。
          </p>

          <div className="space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/50 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/30 text-xs">
          © {new Date().getFullYear()} Ai Tarot Chat
        </p>
      </div>

      {/* 右カラム: サインイン */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8">
        {/* モバイルブラウザ向けロゴ（lg以下で表示） */}
        <div className="lg:hidden mb-10 text-center">
          <span className="text-5xl block mb-3">🔮</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-sky-300 to-purple-300 bg-clip-text text-transparent">
            Ai Tarot Chat
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <Suspense fallback={null}>
              <SignInViewTracker />
            </Suspense>
            <h2 className="text-xl font-bold text-gray-900 mb-2">サインイン</h2>
            <p className="text-sm text-gray-500 mb-8">
              Google または Apple アカウントで続けてください
            </p>
            <Suspense fallback={<div className="space-y-3"><div className="w-full h-12 bg-gray-100 rounded-lg animate-pulse" /><div className="w-full h-12 bg-gray-100 rounded-lg animate-pulse" /></div>}>
              <SignInForm error={error} isMobileApp={false} />
            </Suspense>
          </div>

          <p className="text-center text-white/30 text-xs mt-6">
            <a href="/terms" className="hover:text-white/60 transition-colors" target="_blank" rel="noopener noreferrer">利用規約</a>
            {" · "}
            <a href="/privacy" className="hover:text-white/60 transition-colors" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
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
