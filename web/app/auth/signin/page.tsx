import { SignInViewTracker } from "@/components/analytics/signin-view-tracker";
import { SignInForm } from "@/components/auth/signin-form";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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

function CardFan({ size = "md" }: { size?: "sm" | "md" }) {
  const s =
    size === "sm"
      ? { bw: 36, bh: 56, fw: 44, fh: 68, cls: "w-24 h-16" }
      : { bw: 52, bh: 80, fw: 64, fh: 96, cls: "w-36 h-24" };

  return (
    <div className={`relative ${s.cls} flex-shrink-0`}>
      <Image
        src="/cards/back.png"
        width={s.bw}
        height={s.bh}
        alt=""
        className="absolute bottom-0 left-0 rounded-lg shadow-lg object-cover"
        style={{ transform: "rotate(-12deg)" }}
      />
      <Image
        src="/cards/back.png"
        width={s.bw}
        height={s.bh}
        alt=""
        className="absolute bottom-0 right-0 rounded-lg shadow-lg object-cover"
        style={{ transform: "rotate(12deg)" }}
      />
      <Image
        src="/cards/0_fool.png"
        width={s.fw}
        height={s.fh}
        alt=""
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-lg shadow-xl object-cover z-10"
      />
    </div>
  );
}

const HERO_TAROTISTS = ["Ariadne", "Sophia", "Clara", "Luna"] as const;

function SignInHeroPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-2/3 relative flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #3d2472 0%, #6040a8 50%, #8b58d0 100%)",
      }}
    >
      {/* メインコンテンツ */}
      <div className="flex flex-1 items-center px-12 gap-10">
        {/* 左: テキスト */}
        <div className="flex flex-col justify-center flex-1">
          <div className="flex items-end gap-5 mb-6">
            <CardFan size="md" />
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">
                Ariadne
              </h1>
              <p className="text-2xl font-bold text-violet-200">
                AIタロット占い
              </p>
            </div>
          </div>
          <p className="text-violet-200 text-lg mb-1">
            8人のAI占い師と22種のスプレッドで
          </p>
          <p className="text-white/80 text-base mb-8">
            本格的なタロットリーディングを体験しよう
          </p>
          <div className="flex gap-3">
            {["iOS", "Android"].map((p) => (
              <span
                key={p}
                className="px-4 py-1.5 rounded-full text-sm text-violet-200 border border-violet-400/50 bg-violet-500/20"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* 右: タロティスト 2×2（2倍サイズ: 128×160 → 256×320） */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          {HERO_TAROTISTS.map((name) => (
            <div
              key={name}
              className="w-64 h-80 rounded-xl overflow-hidden border-2 border-violet-400/40"
            >
              <Image
                src={`/tarotists/${name}.png`}
                width={256}
                height={320}
                alt={name}
                className="w-full h-full object-cover object-top"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 右端グラデーション */}
      <div
        className="absolute inset-y-0 right-0 w-16 pointer-events-none"
        style={{
          background: "linear-gradient(to right, transparent, #6040a8)",
        }}
      />

      {/* 下部: マーケティングページリンク */}
      <Link
        href="/ja"
        className="flex flex-col items-center gap-1 pb-8 text-violet-200 hover:text-white transition-colors"
      >
        <span className="text-sm font-medium tracking-wide">
          サービスの詳細・料金を見る
        </span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </Link>
    </div>
  );
}

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
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }`,
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30">
          <Suspense fallback={null}>
            <SignInViewTracker />
          </Suspense>
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <CardFan size="sm" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-200 to-purple-200 bg-clip-text text-transparent mb-3">
              Ai Tarot Chat
            </h1>
            <p className="text-white/80 text-lg font-medium">
              AIと対話するタロット占い
            </p>
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

// Web ブラウザ向けレイアウト（ヒーローパネル左・サインインカード右）
function WebSignInLayout({ error }: { error?: string }) {
  return (
    <div
      className="min-h-screen flex"
      style={{
        background:
          "linear-gradient(135deg, #3d2472 0%, #6040a8 50%, #8b58d0 100%)",
      }}
    >
      <SignInHeroPanel />

      {/* 右カラム: サインインカード */}
      <div className="w-full lg:w-1/3 lg:flex-none flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="bg-violet-200/20 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-violet-300/30">
            <Suspense fallback={null}>
              <SignInViewTracker />
            </Suspense>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-2">サインイン</h2>
              <p className="text-sm text-violet-200">
                Google または Apple アカウントで続けてください
              </p>
            </div>
            <Suspense
              fallback={
                <div className="space-y-3">
                  <div className="w-full h-12 bg-violet-300/20 rounded-lg animate-pulse" />
                  <div className="w-full h-12 bg-violet-300/20 rounded-lg animate-pulse" />
                </div>
              }
            >
              <SignInForm error={error} isMobileApp={false} />
            </Suspense>
          </div>

          <Link
            href="/ja/pricing"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-violet-400/50 bg-violet-500/20 text-violet-100 hover:bg-violet-400/30 hover:text-white transition-all text-sm font-medium"
          >
            料金プランを見る <span aria-hidden>→</span>
          </Link>
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
