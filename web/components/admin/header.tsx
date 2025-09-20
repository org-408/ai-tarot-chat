import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="bg-sky-600 text-white">
      <div className="mx-auto max-w-screen-2xl px-6 py-3 flex items-center justify-between">
        <div className="font-semibold">🔮 AIタロット占い 管理システム</div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sky-800 bg-sky-100">
            admin@tarot-ai.com
          </Badge>
          <a href="#" className="text-sm underline underline-offset-4">
            ログアウト
          </a>
        </div>
      </div>
      {/* <Separator className="bg-sky-700" />
      <div className="mx-auto max-w-screen-2xl px-6 py-2 text-sm text-sky-50/90">
        <span className="opacity-80">📊 ダッシュボード</span> /{" "}
        <span className="opacity-80">🎴 スプレッド管理</span> /{" "}
        <strong>✏️ 編集</strong>
      </div> */}
    </header>
  );
}
