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
    <div className="w-full h-12 bg-muted rounded-lg animate-pulse"></div>
    <div className="w-full h-12 bg-muted rounded-lg animate-pulse"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-primary/80 via-secondary/60 to-accent/70 flex items-center justify-center p-4">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/15 rounded-full blur-3xl"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-muted/40 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-primary/25 rounded-full blur-2xl"></div>

        {/* 星のような装飾 */}
        <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-primary/60 rounded-full animate-pulse"></div>
        <div
          className="absolute top-1/3 right-1/4 w-1 h-1 bg-accent/80 rounded-full animate-pulse"
          style={{ animationDelay: "0.5s" }}
        ></div>
        <div
          className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-secondary/60 rounded-full animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-primary/80 rounded-full animate-pulse"
          style={{ animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/6 w-1 h-1 bg-accent/60 rounded-full animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-2/3 right-1/6 w-1 h-1 bg-secondary/70 rounded-full animate-pulse"
          style={{ animationDelay: "2.5s" }}
        ></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* メインカード */}
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/60">
          {/* ヘッダー */}
          <div className="text-center mb-8 relative">
            {/* 背景装飾 */}
            <div className="absolute -top-4 -left-4 w-2 h-2 bg-accent/40 rounded-full"></div>
            <div className="absolute -top-2 -right-6 w-1 h-1 bg-primary/60 rounded-full"></div>
            <div className="absolute -bottom-2 -left-2 w-1 h-1 bg-secondary/50 rounded-full"></div>

            <div className="text-7xl mb-6 filter drop-shadow-lg relative">
              🔮
              {/* 魔法のような輝きエフェクト */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary/20 rounded-full blur-sm animate-pulse"></div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              AIタロット占い
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              AIが導く、あなたの未来への扉
            </p>

            {/* 装飾的な区切り線 */}
            <div className="flex items-center justify-center gap-2 mt-6 mb-2">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-border"></div>
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-border"></div>
            </div>
          </div>

          {/* サインインフォーム */}
          <Suspense fallback={<LoadingSkeleton />}>
            <SignInForm error={params.error} isTauri={!!params.isTauri} />
          </Suspense>

          {/* 信頼性の表示 */}
          <div className="mt-8 flex items-center justify-center gap-6 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-chart-1 rounded-full"></div>
              <span>安全な認証</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-chart-2 rounded-full"></div>
              <span>データ保護</span>
            </div>
          </div>
        </div>

        {/* サブテキスト */}
        <div className="text-center mt-6 text-muted-foreground text-sm">
          <p>数千年の叡智と最新AI技術の融合</p>
          <p className="mt-1">あなただけの運命を照らします</p>
        </div>
      </div>
    </div>
  );
}
