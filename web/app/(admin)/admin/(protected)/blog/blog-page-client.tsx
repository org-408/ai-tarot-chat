"use client";

import { useState, useTransition } from "react";
import { BlogPostStatus } from "@/lib/generated/prisma/enums";
import {
  generateBlogContentAction,
  saveBlogDraftAction,
  publishBlogPostAction,
  scheduleBlogPostAction,
  publishNowNewAction,
  updateBlogPostAction,
  archiveBlogPostAction,
  deleteBlogPostAction,
  loadBlogPostsAction,
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

type Props = {
  initialPosts: BlogPostItem[];
  totalCount: number;
};

export function BlogPageClient({ initialPosts, totalCount }: Props) {
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [editingPost, setEditingPost] = useState<BlogPostItem | null>(null);

  // Compose state
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
  }

  function fillFromGenerated(result: {
    title: string;
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
    // スラッグを自動生成
    const base = result.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);
    setSlug(base ? `${base}-${Date.now()}` : `post-${Date.now()}`);
  }

  async function handleGenerate() {
    setComposeError(null);
    setComposeSuccess(null);
    startTransition(async () => {
      const res = await generateBlogContentAction(customPrompt.trim() || undefined);
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
        const res = await publishNowNewAction(buildPostData());
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ブログ管理</h1>
        <p className="text-zinc-500 text-sm mt-1">SEO ブログ記事の作成・管理・公開</p>
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

          {/* AI生成 */}
          <div className="bg-zinc-50 border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-700">AIで記事を生成</p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="例: タロットの大アルカナについて初心者向けに解説する記事を書いてください（省略時はAIが自動でテーマを選択）"
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {isPending ? "生成中…" : "✨ AI で記事生成"}
            </button>
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
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">タグ</th>
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
                      {post.isAuto && <span className="text-xs text-zinc-400">🤖 AI生成</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
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
