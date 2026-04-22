"use client";

import { useState, useTransition } from "react";
import { XPostPhase, XPostStatus, XPostType } from "@/lib/generated/prisma/enums";
import {
  generateContentAction,
  createDraftAction,
  schedulePostAction,
  postNowAction,
  postNewNowAction,
  deletePostAction,
  loadPostsAction,
  setAutoPostEnabledAction,
  setPhaseAction,
} from "./actions";

type XPostItem = {
  id: string;
  content: string;
  tweetId: string | null;
  status: XPostStatus;
  postType: XPostType;
  error: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  isAuto: boolean;
  mediaPath: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<XPostStatus, string> = {
  DRAFT: "下書き",
  SCHEDULED: "予約済み",
  POSTED: "投稿済み",
  FAILED: "失敗",
  CANCELLED: "キャンセル",
};

const STATUS_COLOR: Record<XPostStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  POSTED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-400",
};

const TYPE_LABEL: Record<XPostType, string> = {
  DAILY_CARD: "今日の一枚",
  APP_PROMO: "アプリ紹介",
  TAROT_TIP: "タロット豆知識",
  BUILD_IN_PUBLIC: "機能紹介",
  MANUAL: "手動",
};

const TYPE_COLOR: Record<XPostType, string> = {
  DAILY_CARD: "bg-violet-100 text-violet-700",
  APP_PROMO: "bg-orange-100 text-orange-700",
  TAROT_TIP: "bg-teal-100 text-teal-700",
  BUILD_IN_PUBLIC: "bg-sky-100 text-sky-700",
  MANUAL: "bg-zinc-100 text-zinc-600",
};

const POST_TYPE_OPTIONS: { value: XPostType; label: string }[] = [
  { value: XPostType.MANUAL, label: "手動（AI生成なし）" },
  { value: XPostType.DAILY_CARD, label: "今日の一枚" },
  { value: XPostType.APP_PROMO, label: "アプリ紹介" },
  { value: XPostType.TAROT_TIP, label: "タロット豆知識" },
  { value: XPostType.BUILD_IN_PUBLIC, label: "機能紹介 (#buildinpublic)" },
];

const MAX_CHARS = 280;

type Props = {
  initialPosts: XPostItem[];
  totalCount: number;
  twitterConfigured: boolean;
  initialAutoPostEnabled: boolean;
  initialPhase: XPostPhase;
};

export function XPostsPageClient({ initialPosts, totalCount, twitterConfigured, initialAutoPostEnabled, initialPhase }: Props) {
  const [tab, setTab] = useState<"compose" | "history">("compose");

  // Auto post config state
  const [autoPostEnabled, setAutoPostEnabled] = useState(initialAutoPostEnabled);
  const [autoPostError, setAutoPostError] = useState<string | null>(null);
  const [phase, setPhase] = useState<XPostPhase>(initialPhase);
  const [phaseError, setPhaseError] = useState<string | null>(null);

  // Compose state
  const [postType, setPostType] = useState<XPostType>(XPostType.DAILY_CARD);
  const [customPrompt, setCustomPrompt] = useState("");
  const [content, setContent] = useState("");
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);

  // History state
  const [posts, setPosts] = useState<XPostItem[]>(initialPosts);
  const [statusFilter, setStatusFilter] = useState<XPostStatus | "ALL">("ALL");
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  async function handleAutoPostToggle(enabled: boolean) {
    setAutoPostError(null);
    startTransition(async () => {
      const res = await setAutoPostEnabledAction(enabled);
      if (res.ok) {
        setAutoPostEnabled(res.autoPostEnabled);
      } else {
        setAutoPostError(res.error);
      }
    });
  }

  async function handlePhaseChange(newPhase: XPostPhase) {
    setPhaseError(null);
    startTransition(async () => {
      const res = await setPhaseAction(newPhase);
      if (res.ok) {
        setPhase(res.phase);
      } else {
        setPhaseError(res.error);
      }
    });
  }

  const charCount = [...content].length; // Unicode 文字数カウント
  const isOverLimit = charCount > MAX_CHARS;

  function clearCompose() {
    setCustomPrompt("");
    setContent("");
    setMediaPath(null);
    setScheduledAt("");
    setComposeError(null);
    setComposeSuccess(null);
  }

  async function handleGenerate() {
    if (postType === XPostType.MANUAL && !customPrompt.trim()) {
      setComposeError("手動モードでは AI 生成は使用できません");
      return;
    }
    setComposeError(null);
    setComposeSuccess(null);
    startTransition(async () => {
      const res = await generateContentAction(postType, customPrompt.trim() || undefined);
      if (res.ok) {
        setContent(res.content);
        setMediaPath(res.mediaPath);
      } else {
        setComposeError(res.error);
      }
    });
  }

  async function handlePostNow() {
    if (!content.trim()) {
      setComposeError("投稿内容を入力してください");
      return;
    }
    if (isOverLimit) {
      setComposeError(`${MAX_CHARS}文字以内で入力してください`);
      return;
    }
    setComposeError(null);
    setComposeSuccess(null);
    startTransition(async () => {
      const res = await postNewNowAction({ content, postType, mediaPath });
      if (res.ok) {
        setComposeSuccess("投稿しました！");
        clearCompose();
        await refreshHistory();
      } else {
        setComposeError(res.error);
      }
    });
  }

  async function handleSaveDraft() {
    if (!content.trim()) {
      setComposeError("投稿内容を入力してください");
      return;
    }
    setComposeError(null);
    setComposeSuccess(null);
    startTransition(async () => {
      const res = await createDraftAction({ content, postType, mediaPath });
      if (res.ok) {
        setComposeSuccess("下書き保存しました");
        clearCompose();
        await refreshHistory();
      } else {
        setComposeError(res.error);
      }
    });
  }

  async function handleSchedule() {
    if (!content.trim()) {
      setComposeError("投稿内容を入力してください");
      return;
    }
    if (!scheduledAt) {
      setComposeError("予約日時を選択してください");
      return;
    }
    if (isOverLimit) {
      setComposeError(`${MAX_CHARS}文字以内で入力してください`);
      return;
    }
    setComposeError(null);
    setComposeSuccess(null);
    startTransition(async () => {
      const res = await schedulePostAction({ content, postType, scheduledAt, mediaPath });
      if (res.ok) {
        setComposeSuccess("予約投稿を設定しました");
        clearCompose();
        await refreshHistory();
      } else {
        setComposeError(res.error);
      }
    });
  }

  async function refreshHistory(newFilter?: XPostStatus | "ALL") {
    const filter = newFilter ?? statusFilter;
    const res = await loadPostsAction({
      status: filter === "ALL" ? undefined : filter,
    });
    if (res.ok) {
      setPosts(res.posts);
      setHistoryError(null);
    } else {
      setHistoryError(res.error);
    }
  }

  async function handleFilterChange(filter: XPostStatus | "ALL") {
    setStatusFilter(filter);
    await refreshHistory(filter);
  }

  async function handlePostNowFromHistory(id: string) {
    startTransition(async () => {
      const res = await postNowAction(id);
      if (res.ok) {
        await refreshHistory();
      } else {
        setHistoryError(res.error);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("この投稿を削除しますか？")) return;
    startTransition(async () => {
      const res = await deletePostAction(id);
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        setHistoryError(res.error);
      }
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">𝕏 投稿管理</h1>
          <p className="text-zinc-500 text-sm mt-1">X (Twitter) 投稿の作成・管理・自動投稿</p>
        </div>
        {!twitterConfigured && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-3 py-2">
            ⚠️ Twitter API 未設定（投稿には環境変数の設定が必要です）
          </div>
        )}
      </div>

      {/* 自動投稿トグル */}
      <div className={`flex items-center justify-between rounded-xl border px-5 py-4 mb-6 transition-colors ${
        autoPostEnabled ? "bg-green-50 border-green-200" : "bg-zinc-50 border-zinc-200"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{autoPostEnabled ? "🤖" : "⏸️"}</span>
            <span className="font-medium text-sm">
              自動投稿モード
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              autoPostEnabled ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-500"
            }`}>
              {autoPostEnabled ? "ON" : "OFF"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 ml-7">
            {autoPostEnabled
              ? phase === XPostPhase.PRE_LAUNCH
                ? "毎日 07:30 / 12:30 / 18:30 JST に「今日の一枚・豆知識・機能紹介」を同日のブログ記事と連動して自動投稿します（機能紹介末尾に /download CTA を付与）"
                : "毎日 07:30 / 12:30 / 18:30 JST に「今日の一枚・豆知識・アプリ紹介」を同日のブログ記事と連動して自動投稿します"
              : "チェックすると GitHub Actions による定時自動投稿が有効になります"}
          </p>
          {autoPostError && (
            <p className="text-xs text-red-500 mt-1 ml-7">{autoPostError}</p>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={autoPostEnabled}
            disabled={isPending}
            onChange={(e) => handleAutoPostToggle(e.target.checked)}
          />
          <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
        </label>
      </div>

      {/* フェーズ切替 */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{phase === XPostPhase.PRE_LAUNCH ? "🚀" : "🌟"}</span>
            <span className="font-medium text-sm">投稿フェーズ</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              phase === XPostPhase.PRE_LAUNCH
                ? "bg-sky-100 text-sky-700"
                : "bg-green-100 text-green-700"
            }`}>
              {phase === XPostPhase.PRE_LAUNCH ? "ローンチ前" : "ローンチ後"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 ml-7">
            {phase === XPostPhase.PRE_LAUNCH
              ? "今日の一枚 + タロット豆知識 + 機能紹介（Ariadne 公式運営トーン）。機能紹介の末尾に /download 事前登録 CTA を付与。ブログ記事 URL を本文末尾に添付（今日の一枚はカード画像自動添付）"
              : "今日の一枚 + タロット豆知識 + アプリ紹介（Ariadne 公式運営トーン）。ブログ記事 URL を本文末尾に添付（今日の一枚はカード画像自動添付）"}
          </p>
          {phaseError && <p className="text-xs text-red-500 mt-1 ml-7">{phaseError}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePhaseChange(XPostPhase.PRE_LAUNCH)}
            disabled={isPending || phase === XPostPhase.PRE_LAUNCH}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
              phase === XPostPhase.PRE_LAUNCH
                ? "bg-sky-600 text-white"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            }`}
          >
            ローンチ前
          </button>
          <button
            onClick={() => handlePhaseChange(XPostPhase.POST_LAUNCH)}
            disabled={isPending || phase === XPostPhase.POST_LAUNCH}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
              phase === XPostPhase.POST_LAUNCH
                ? "bg-green-600 text-white"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            }`}
          >
            ローンチ後
          </button>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 border-b mb-6">
        {(["compose", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "history") refreshHistory();
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t === "compose" ? "投稿作成" : `投稿履歴（${totalCount}件）`}
          </button>
        ))}
      </div>

      {/* Compose Tab */}
      {tab === "compose" && (
        <div className="space-y-4">
          {/* Post type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">投稿タイプ</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as XPostType)}
              className="border rounded-md px-3 py-2 text-sm w-full max-w-xs"
            >
              {POST_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom prompt */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              カスタムプロンプト
              <span className="ml-2 text-xs text-zinc-400 font-normal">入力するとタイプ設定より優先されます</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="例: 新月の夜にタロットを引く意味について、神秘的な雰囲気で投稿してください。末尾に #タロット をつけて。"
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* AI generate button */}
          {(postType !== XPostType.MANUAL || customPrompt.trim()) && (
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {isPending ? "生成中…" : customPrompt.trim() ? "✨ カスタムプロンプトで生成" : "✨ AI で生成"}
            </button>
          )}

          {/* Text area */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              投稿内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="ツイート内容を入力、または上の「AI で生成」ボタンで自動入力"
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className={`text-right text-xs mt-1 ${isOverLimit ? "text-red-500 font-bold" : "text-zinc-400"}`}>
              {charCount} / {MAX_CHARS}
            </div>
          </div>

          {/* Media preview */}
          {mediaPath && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                添付画像
                <span className="ml-2 text-xs text-zinc-400 font-normal">投稿時に自動で添付されます</span>
              </label>
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaPath}
                  alt="添付画像プレビュー"
                  className="w-20 h-32 object-cover rounded-md border shadow-sm"
                />
                <button
                  onClick={() => setMediaPath(null)}
                  disabled={isPending}
                  className="text-xs text-zinc-500 hover:text-red-500 underline disabled:opacity-50"
                >
                  画像を外す
                </button>
              </div>
            </div>
          )}

          {/* Schedule datetime */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              予約投稿日時（省略時は即時 or 下書き）
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            />
          </div>

          {/* Error / Success */}
          {composeError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {composeError}
            </div>
          )}
          {composeSuccess && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {composeSuccess}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handlePostNow}
              disabled={isPending || isOverLimit || !content.trim()}
              className="px-4 py-2 rounded-md bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition"
            >
              {isPending ? "処理中…" : "今すぐ投稿"}
            </button>
            <button
              onClick={handleSchedule}
              disabled={isPending || isOverLimit || !content.trim() || !scheduledAt}
              className="px-4 py-2 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
            >
              予約投稿
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={isPending || !content.trim()}
              className="px-4 py-2 rounded-md border text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
            >
              下書き保存
            </button>
            <button
              onClick={clearCompose}
              disabled={isPending}
              className="px-4 py-2 rounded-md border text-sm text-zinc-400 hover:bg-zinc-50 disabled:opacity-50 transition"
            >
              クリア
            </button>
          </div>

          {/* Auto-posting info */}
          <div className="mt-8 p-4 bg-zinc-50 rounded-lg border text-sm text-zinc-600">
            <p className="font-medium mb-2">🤖 自動投稿について</p>
            <ul className="space-y-1 text-xs text-zinc-500 list-disc list-inside">
              <li>上のトグルを ON にすると GitHub Actions による定時自動投稿が有効になります</li>
              <li>07:30 = 今日の一枚 / 12:30 = タロット豆知識 / 18:30 = 機能紹介（ローンチ前）または アプリ紹介（ローンチ後）（いずれも JST）</li>
              <li>各投稿は同日ブログ（07:00 / 12:00 / 18:00）の 30 分後に発火し、対応するブログ記事を元に 140 文字以内で生成・記事 URL を添付します</li>
              <li>「今日の一枚」はブログ側で引いたカード画像（正位置／逆位置）を自動で添付します</li>
              <li>GitHub Secrets に <code className="bg-zinc-100 px-1 rounded">APP_URL</code> と <code className="bg-zinc-100 px-1 rounded">CRON_SECRET</code> を設定してください</li>
            </ul>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(["ALL", ...Object.values(XPostStatus)] as (XPostStatus | "ALL")[]).map((s) => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  statusFilter === s
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {s === "ALL" ? "すべて" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {historyError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {historyError}
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 w-1/2">内容</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">タイプ</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">日時</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-zinc-400 py-8 text-sm">
                      投稿履歴はありません
                    </td>
                  </tr>
                )}
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-zinc-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {post.mediaPath && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={post.mediaPath}
                            alt="添付画像"
                            className="w-10 h-16 object-cover rounded border shadow-sm flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-zinc-700 max-w-xs whitespace-pre-wrap">{post.content}</div>
                          {post.error && (
                            <div className="text-xs text-red-500 mt-1 truncate max-w-xs" title={post.error}>
                              エラー: {post.error}
                            </div>
                          )}
                          {post.tweetId && (
                            <a
                              href={`https://x.com/i/web/status/${post.tweetId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sky-500 hover:underline mt-1 block"
                            >
                              X で見る →
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[post.postType]}`}>
                        {TYPE_LABEL[post.postType]}
                      </span>
                      {post.isAuto && (
                        <span className="ml-1 text-xs text-zinc-400">🤖</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[post.status]}`}>
                        {STATUS_LABEL[post.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {post.postedAt
                        ? new Date(post.postedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
                        : post.scheduledAt
                        ? `${new Date(post.scheduledAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} 予定`
                        : new Date(post.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {(post.status === XPostStatus.DRAFT ||
                          post.status === XPostStatus.FAILED ||
                          post.status === XPostStatus.SCHEDULED) && (
                          <button
                            onClick={() => handlePostNowFromHistory(post.id)}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-50 transition"
                          >
                            今すぐ投稿
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={isPending}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 transition"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
