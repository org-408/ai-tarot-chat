"use server";

import { BlogPostPhase, BlogPostStatus, BlogPostType } from "@/lib/generated/prisma/client";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { blogPostRepository, blogPostConfigRepository } from "@/lib/server/repositories/blog-post";
import * as blogPostService from "@/lib/server/services/blog-post";
import { revalidatePath } from "next/cache";

export async function generateBlogContentAction(type: BlogPostType, customPrompt?: string) {
  try {
    await assertAdminSession();
    const result = await blogPostService.generateBlogContent(type, customPrompt || undefined);
    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "生成に失敗しました",
    };
  }
}

export async function saveBlogDraftAction(data: {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  coverImageUrl?: string;
  postType: BlogPostType;
}) {
  try {
    await assertAdminSession();
    const slugTaken = await blogPostRepository.slugExists(data.slug);
    if (slugTaken) {
      return { ok: false as const, error: `スラッグ「${data.slug}」はすでに使用されています` };
    }
    const post = await blogPostRepository.create({ ...data, status: BlogPostStatus.DRAFT });
    revalidatePath("/admin/blog");
    return {
      ok: true as const,
      post: serializePost(post),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "保存に失敗しました",
    };
  }
}

export async function publishBlogPostAction(postId: string) {
  try {
    await assertAdminSession();
    await blogPostService.publish(postId);
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "公開に失敗しました",
    };
  }
}

export async function scheduleBlogPostAction(data: {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  coverImageUrl?: string;
  postType: BlogPostType;
  scheduledAt: string;
}) {
  try {
    await assertAdminSession();
    const slugTaken = await blogPostRepository.slugExists(data.slug);
    if (slugTaken) {
      return { ok: false as const, error: `スラッグ「${data.slug}」はすでに使用されています` };
    }
    const post = await blogPostRepository.create({
      ...data,
      status: BlogPostStatus.SCHEDULED,
      scheduledAt: new Date(data.scheduledAt),
    });
    revalidatePath("/admin/blog");
    return { ok: true as const, post: serializePost(post) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "予約に失敗しました",
    };
  }
}

export async function publishNewNowAction(data: {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  coverImageUrl?: string;
  postType: BlogPostType;
}) {
  try {
    await assertAdminSession();
    const slugTaken = await blogPostRepository.slugExists(data.slug);
    if (slugTaken) {
      return { ok: false as const, error: `スラッグ「${data.slug}」はすでに使用されています` };
    }
    const post = await blogPostRepository.create({
      ...data,
      status: BlogPostStatus.PUBLISHED,
      publishedAt: new Date(),
    });
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return { ok: true as const, post: serializePost(post) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "公開に失敗しました",
    };
  }
}

export async function updateBlogPostAction(postId: string, data: {
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  coverImageUrl?: string;
  postType: BlogPostType;
}) {
  try {
    await assertAdminSession();
    const post = await blogPostRepository.update(postId, {
      ...data,
      coverImageUrl: data.coverImageUrl ?? null,
    });
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return { ok: true as const, post: serializePost(post) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "更新に失敗しました",
    };
  }
}

export async function archiveBlogPostAction(postId: string) {
  try {
    await assertAdminSession();
    await blogPostRepository.update(postId, { status: BlogPostStatus.ARCHIVED });
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "アーカイブに失敗しました",
    };
  }
}

export async function deleteBlogPostAction(postId: string) {
  try {
    await assertAdminSession();
    await blogPostRepository.deleteById(postId);
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "削除に失敗しました",
    };
  }
}

export async function loadBlogPostsAction(opts: { status?: BlogPostStatus; offset?: number }) {
  try {
    await assertAdminSession();
    const posts = await blogPostRepository.findMany({
      status: opts.status,
      limit: 50,
      offset: opts.offset ?? 0,
    });
    return { ok: true as const, posts: posts.map(serializePost) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "読み込みに失敗しました",
    };
  }
}

export async function getAutoPostConfigAction() {
  try {
    await assertAdminSession();
    const config = await blogPostConfigRepository.get();
    return { ok: true as const, autoPostEnabled: config.autoPostEnabled, phase: config.phase };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "設定取得に失敗しました",
    };
  }
}

export async function setAutoPostEnabledAction(enabled: boolean) {
  try {
    await assertAdminSession();
    await blogPostConfigRepository.setAutoPostEnabled(enabled);
    revalidatePath("/admin/blog");
    return { ok: true as const, autoPostEnabled: enabled };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "設定の保存に失敗しました",
    };
  }
}

export async function setPhaseAction(phase: BlogPostPhase) {
  try {
    await assertAdminSession();
    await blogPostConfigRepository.setPhase(phase);
    revalidatePath("/admin/blog");
    return { ok: true as const, phase };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "フェーズの保存に失敗しました",
    };
  }
}

function serializePost(post: Awaited<ReturnType<typeof blogPostRepository.findById>>) {
  if (!post) throw new Error("post is null");
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    tags: post.tags,
    metaDescription: post.metaDescription,
    status: post.status,
    postType: post.postType,
    isAuto: post.isAuto,
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
  };
}
