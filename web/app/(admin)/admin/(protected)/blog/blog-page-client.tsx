"use client";

import { useState, useTransition } from "react";
import { BlogPostPhase, BlogPostStatus, BlogPostType } from "@/lib/generated/prisma/enums";
import {
  generateBlogContentAction,
  saveBlogDraftAction,
  publishBlogPostAction,
  scheduleBlogPostAction,
  publishNewNowAction,
  updateBlogPostAction,
  archiveBlogPostAction,
  deleteBlogPostAction,
  loadBlogPostsAction,
  setAutoPostEnabledAction,
  setPhaseAction,
} from "./actions";

type BlogPostItem = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  tags: string[];
  metaDescription: string | null;
  status: BlogPostStatus;
  postType: BlogPostType;
  isAuto: boolean;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<BlogPostStatus, string> = {
  DRAFT: "下書き",
  SCHEDULED: "予約済み",
  PUBLISHED: "公開中",
  ARCHIVED: "アーカイブ",
};

const STATUS_COLOR: Record<BlogPostStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-zinc-100 text-zinc-400",
};

const TYPE_LABEL: Record<BlogPostType, string> = {
  DAILY_CARD: "今日の一枚",
  TAROT_GUIDE: "タロット解説",
  TAROT_TIP: "タロット豆知識",
  APP_PROMO: "アプリ紹介",
  BUILD_IN_PUBLIC: "機能紹介",
  MANUAL: "手動",
};

const TYPE_COLOR: Record<BlogPostType, string> = {
  DAILY_CARD: "bg-amber-100 text-amber-700",
  TAROT_GUIDE: "bg-violet-100 text-violet-700",
  TAROT_TIP: "bg-teal-100 text-teal-700",
  APP_PROMO: "bg-orange-100 text-orange-700",
  BUILD_IN_PUBLIC: "bg-sky-100 text-sky-700",
  MANUAL: "bg-zinc-100 text-zinc-600",
};

const POST_TYPE_OPTIONS: { value: BlogPostType; label: string }[] = [
  { value: BlogPostType.MANUAL, label: "手動（AI生成なし）" },
  { value: BlogPostType.DAILY_CARD, label: "今日の一枚" },
  { value: BlogPostType.TAROT_GUIDE, label: "タロット解説" },
  { value: BlogPostType.TAROT_TIP, label: "タロット豆知識" },
  { value: BlogPostType.APP_PROMO, label: "アプリ紹介" },
  { value: BlogPostType.BUILD_IN_PUBLIC, label: "機能紹介" },
];

type Props = {
  initialPosts: BlogPostItem[];
  totalCount: number;
  initialAutoPostEnabled: boolean;
  initialPhase: BlogPostPhase;
};

export function BlogPageClient({ initialPosts, totalCount, initialAutoPostEnabled, initialPhase }: Props) {
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [editingPost, setEditingPost] = useState<BlogPostItem | null>(null);

  // Auto post config state
  const [autoPostEnabled, setAutoPostEnabled] = useState(initialAutoPostEnabled);
  const [autoPostError, setAutoPostError] = useState<string | null>(null);
  const [phase, setPhase] = useState<BlogPostPhase>(initialPhase);
  const [phaseError, setPhaseError] = useState<string | null>(null);

  // Compose state
  const [postType, setPostType] = useState<BlogPostType>(BlogPostType.TAROT_GUIDE);
  const [customPrompt, setCustomPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [tags, setTags] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);

  // History state
  const [posts, setPosts] = useState<BlogPostItem[]>(initialPosts);
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | "ALL">("ALL");
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

  async function handlePhaseChange(newPhase: BlogPostPhase) {
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

  function clearCompose() {
    setCustomPrompt("");
    setTitle("");
    setSlug("");
    setContent("");
    setExcerpt("");
    setMetaDescription("");
    setTags("");
    setCoverImageUrl("");
    setScheduledAt("");
    setComposeError(null);
    setComposeSuccess(null);
    setEditingPost(null);
    setPostType(BlogPostType.TAROT_GUIDE);
  }

  function fillFromGenerated(result: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    metaDescription: string;
    tags: string[];
  }) {
    setTitle(result.title);
    setContent(result.content);
    setExcerpt(result.excerpt);
    setMetaDescription(result.metaDescription);
    setTags(result.tags.join(", "));
    // AI が生成した英語 slug をそのまま使う（service 側で sanitize + timestamp 付与済み）
    setSlug(result.slug);
  }

  async function handleGenerate() {
    if (postType === BlogPostType.MANUAL && !customPrompt.trim()) {
      setComposeError("手動モードでは AI 生成は使用できません");
      return;
    }
    setComposeError(null);
    setComposeSuccess(null);
    startTransition(async () => {
      const res = await generateBlogContentAction(postType, customPrompt.trim() || undefined);
      if (res.ok) {
        fillFromGenerated(res);
      } else {
        setComposeError(res.error);
      }
    });
  }

  function buildPostData() {
    return {
      title: title.trim(),
      slug: slug.trim(),
      content: content.trim(),
      excerpt: excerpt.trim(),
      metaDescription: metaDescription.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      coverImageUrl: coverImageUrl.trim() || undefined,
      postType,
    };
  }

  async function handleSaveDraft() {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setComposeError("タイトル・スラッグ・本文は必須です");
      return;
    }
    setComposeError(null);
    startTransition(async () => {
      if (editingPost) {
        const res = await updateBlogPostAction(editingPost.id, buildPostData());
        if (res.ok) {
          setComposeSuccess("更新しました");
          clearCompose();
          await refreshHistory();
        } else {
          setComposeError(res.error);
        }
      } else {
        const res = await saveBlogDraftAction(buildPostData());
        if (res.ok) {
          setComposeSuccess("下書き保存しました");
          clearCompose();
          await refreshHistory();
        } else {
          setComposeError(res.error);
        }
      }
    });
  }

  async function handlePublishNow() {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setComposeError("タイトル・スラッグ・本文は必須です");
      return;
    }
    setComposeError(null);
    startTransition(async () => {
      if (editingPost) {
        const updateRes = await updateBlogPostAction(editingPost.id, buildPostData());
        if (!updateRes.ok) { setComposeError(updateRes.error); return; }
        const pubRes = await publishBlogPostAction(editingPost.id);
        if (pubRes.ok) {
          setComposeSuccess("公開しました");
          clearCompose();
          await refreshHistory();
        } else {
          setComposeError(pubRes.error);
        }
      } else {
        const res = await publishNewNowAction(buildPostData());
        if (res.ok) {
          setComposeSuccess("公開しました");
          clearCompose();
          await refreshHistory();
        } else {
          setComposeError(res.error);
        }
      }
    });
  }

  async function handleSchedule() {
    if (!title.trim() || !content.trim() || !slug.trim() || !scheduledAt) {
      setComposeError("タイトル・スラッグ・本文・予約日時は必須です");
      return;
    }
    setComposeError(null);
    startTransition(async () => {
      const res = await scheduleBlogPostAction({ ...buildPostData(), scheduledAt });
      if (res.ok) {
        setComposeSuccess("予約投稿を設定しました");
        clearCompose();
        await refreshHistory();
      } else {
        setComposeError(res.error);
      }
    });
  }

  async function refreshHistory(newFilter?: BlogPostStatus | "ALL") {
    const filter = newFilter ?? statusFilter;
    const res = await loadBlogPostsAction({ status: filter === "ALL" ? undefined : filter });
    if (res.ok) {
      setPosts(res.posts);
      setHistoryError(null);
    } else {
      setHistoryError(res.error);
    }
  }

  async function handleFilterChange(filter: BlogPostStatus | "ALL") {
    setStatusFilter(filter);
    await refreshHistory(filter);
  }

  function handleEdit(post: BlogPostItem) {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setExcerpt(post.excerpt ?? "");
    setMetaDescription(post.metaDescription ?? "");
    setTags(post.tags.join(", "));
    setCoverImageUrl(post.coverImageUrl ?? "");
    setPostType(post.postType);
    setComposeError(null);
    setComposeSuccess(null);
    setTab("compose");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePublishFromHistory(id: string) {
    startTransition(async () => {
      const res = await publishBlogPostAction(id);
      if (res.ok) {
        await refreshHistory();
      } else {
        setHistoryError(res.error);
      }
    });
  }

  async function handleArchive(id: string) {
    if (!confirm("この記事をアーカイブしますか？")) return;
    startTransition(async () => {
      const res = await archiveBlogPostAction(id);
      if (res.ok) await refreshHistory();
      else setHistoryError(res.error);
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("この記事を削除しますか？元に戻せません。")) return;
    startTransition(async () => {
      const res = await deleteBlogPostAction(id);
      if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
      else setHistoryError(res.error);
    });
  }

  const APP_URL = process.env.NEXT_PUBLIC_BFF_URL ?? "https://ariadne-ai.app";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">ブログ管理</h1>
        <p className="text-zinc-500 text-sm mt-1">SEO ブログ記事の作成・管理・自動公開</p>
      </div>

      {/* 自動公開トグル */}
      <div className={`flex items-center justify-between rounded-xl border px-5 py-4 mb-6 transition-colors ${
        autoPostEnabled ? "bg-green-50 border-green-200" : "bg-zinc-50 border-zinc-200"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{autoPostEnabled ? "🤖" : "⏸️"}</span>
            <span className="font-medium text-sm">
              自動公開モード
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              autoPostEnabled ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-500"
            }`}>
              {autoPostEnabled ? "ON" : "OFF"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 ml-7">
            {autoPostEnabled
              ? phase === BlogPostPhase.PRE_LAUNCH
                ? "毎日 10:00 JST に開発進捗・タロット解説・豆知識を自動生成して公開します"
                : "毎日 10:00 JST にタロット解説・豆知識・アプリ紹介を自動生成して公開します"
              : "チェックすると GitHub Actions による定時自動公開が有効になります"}
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
            <span className="text-lg">{phase === BlogPostPhase.PRE_LAUNCH ? "🚀" : "🌟"}</span>
            <span className="font-medium text-sm">公開フェーズ</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              phase === BlogPostPhase.PRE_LAUNCH
                ? "bg-sky-100 text-sky-700"
                : "bg-green-100 text-green-700"
            }`}>
              {phase === BlogPostPhase.PRE_LAUNCH ? "ローンチ前" : "ローンチ後"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 ml-7">
            {phase === BlogPostPhase.PRE_LAUNCH
              ? "自動公開: 開発進捗 (#buildinpublic) + タロット解説 + 豆知識"
              : "自動公開: タロット解説 + 豆知識 + アプリ紹介"}
          </p>
          {phaseError && <p className="text-xs text-red-500 mt-1 ml-7">{phaseError}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePhaseChange(BlogPostPhase.PRE_LAUNCH)}
            disabled={isPending || phase === BlogPostPhase.PRE_LAUNCH}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
              phase === BlogPostPhase.PRE_LAUNCH
                ? "bg-sky-600 text-white"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            }`}
          >
            ローンチ前
          </button>
          <button
            onClick={() => handlePhaseChange(BlogPostPhase.POST_LAUNCH)}
            disabled={isPending || phase === BlogPostPhase.POST_LAUNCH}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
              phase === BlogPostPhase.POST_LAUNCH
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
            {t === "compose"
              ? editingPost ? `編集中: ${editingPost.title.slice(0, 20)}…` : "記事作成"
              : `記事一覧（${totalCount}件）`}
          </button>
        ))}
      </div>

      {/* Compose Tab */}
      {tab === "compose" && (
        <div className="space-y-5">
          {editingPost && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-center justify-between">
              <span>編集モード: <strong>{editingPost.title}</strong></span>
              <button onClick={clearCompose} className="text-xs underline">キャンセル</button>
            </div>
          )}

          {/* 記事タイプ */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">記事タイプ</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as BlogPostType)}
              className="border rounded-md px-3 py-2 text-sm w-full max-w-xs"
            >
              {POST_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI生成 */}
          <div className="bg-zinc-50 border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-700">
              AIで記事を生成
              <span className="ml-2 text-xs text-zinc-400 font-normal">カスタムプロンプトを入力するとタイプ設定より優先されます</span>
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="例: タロットの大アルカナについて初心者向けに解説する記事を書いてください（省略時はタイプに応じてAIが自動生成）"
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            {(postType !== BlogPostType.MANUAL || customPrompt.trim()) && (
              <button
                onClick={handleGenerate}
                disabled={isPending}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition"
              >
                {isPending ? "生成中…" : customPrompt.trim() ? "✨ カスタムプロンプトで生成" : "✨ AI で記事生成"}
              </button>
            )}
          </div>

          {/* フォーム */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="記事タイトル"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                スラッグ <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-zinc-400 font-normal">URLになります（英数字・ハイフン）</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-blog-post"
                  className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                本文 <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-zinc-400 font-normal">Markdown形式</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                placeholder="記事本文（Markdown）"
                className="w-full border rounded-md px-3 py-2 text-sm resize-y font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="text-right text-xs text-zinc-400 mt-1">{content.length}文字</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">概要（excerpt）</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                placeholder="一覧ページに表示する120文字程度の概要"
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                metaDescription
                <span className="ml-2 text-xs text-zinc-400 font-normal">SEO用（160文字以内）</span>
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={2}
                placeholder="検索結果に表示される説明文"
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className={`text-right text-xs mt-1 ${metaDescription.length > 160 ? "text-red-500" : "text-zinc-400"}`}>
                {metaDescription.length} / 160
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">タグ（カンマ区切り）</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="タロット, 占い, AI"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">カバー画像URL（任意）</label>
                <input
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">予約公開日時（省略時は即時 or 下書き）</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          {composeError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{composeError}</div>
          )}
          {composeSuccess && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{composeSuccess}</div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handlePublishNow}
              disabled={isPending || !title.trim() || !content.trim() || !slug.trim()}
              className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
            >
              {isPending ? "処理中…" : "今すぐ公開"}
            </button>
            <button
              onClick={handleSchedule}
              disabled={isPending || !title.trim() || !content.trim() || !slug.trim() || !scheduledAt}
              className="px-4 py-2 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
            >
              予約公開
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={isPending || !title.trim() || !content.trim() || !slug.trim()}
              className="px-4 py-2 rounded-md border text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
            >
              {editingPost ? "更新（下書き）" : "下書き保存"}
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
            <p className="font-medium mb-2">🤖 自動公開について</p>
            <ul className="space-y-1 text-xs text-zinc-500 list-disc list-inside">
              <li>上のトグルを ON にすると GitHub Actions による定時自動公開が有効になります</li>
              <li>毎日 10:00 JST にフェーズに応じた記事タイプからランダムで1記事生成・公開</li>
              <li>毎回 AI が内容を自動生成するので同じ記事は繰り返しません</li>
              <li>GitHub Secrets に <code className="bg-zinc-100 px-1 rounded">APP_URL</code> と <code className="bg-zinc-100 px-1 rounded">CRON_SECRET</code> を設定してください</li>
            </ul>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(["ALL", ...Object.values(BlogPostStatus)] as (BlogPostStatus | "ALL")[]).map((s) => (
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
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{historyError}</div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 w-2/5">タイトル</th>
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
                      記事はありません
                    </td>
                  </tr>
                )}
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-zinc-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-800 line-clamp-1">{post.title}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">/blog/{post.slug}</div>
                      {post.status === BlogPostStatus.PUBLISHED && (
                        <a
                          href={`${APP_URL}/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-500 hover:underline mt-0.5 block"
                        >
                          公開ページを見る →
                        </a>
                      )}
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
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
                        : post.scheduledAt
                        ? `${new Date(post.scheduledAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} 予定`
                        : new Date(post.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        <button
                          onClick={() => handleEdit(post)}
                          disabled={isPending}
                          className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 transition"
                        >
                          編集
                        </button>
                        {(post.status === BlogPostStatus.DRAFT || post.status === BlogPostStatus.SCHEDULED) && (
                          <button
                            onClick={() => handlePublishFromHistory(post.id)}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition"
                          >
                            公開
                          </button>
                        )}
                        {post.status === BlogPostStatus.PUBLISHED && (
                          <button
                            onClick={() => handleArchive(post.id)}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 transition"
                          >
                            アーカイブ
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
