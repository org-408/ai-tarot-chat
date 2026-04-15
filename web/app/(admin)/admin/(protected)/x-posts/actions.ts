"use server";

import { XPostStatus, XPostType } from "@prisma/client";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { xPostRepository, xPostConfigRepository } from "@/lib/server/repositories/x-post";
import * as xPostService from "@/lib/server/services/x-post";
import { revalidatePath } from "next/cache";

export async function generateContentAction(type: XPostType) {
  try {
    await assertAdminSession();
    const content = await xPostService.generateContent(type);
    return { ok: true as const, content };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "生成に失敗しました",
    };
  }
}

export async function createDraftAction(data: {
  content: string;
  postType: XPostType;
}) {
  try {
    await assertAdminSession();
    const post = await xPostRepository.create({
      content: data.content,
      postType: data.postType,
      status: XPostStatus.DRAFT,
    });
    revalidatePath("/admin/x-posts");
    return {
      ok: true as const,
      post: {
        id: post.id,
        content: post.content,
        tweetId: post.tweetId,
        status: post.status,
        postType: post.postType,
        error: post.error,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
        postedAt: post.postedAt?.toISOString() ?? null,
        isAuto: post.isAuto,
        createdAt: post.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "保存に失敗しました",
    };
  }
}

export async function schedulePostAction(data: {
  content: string;
  postType: XPostType;
  scheduledAt: string;
}) {
  try {
    await assertAdminSession();
    const post = await xPostRepository.create({
      content: data.content,
      postType: data.postType,
      status: XPostStatus.SCHEDULED,
      scheduledAt: new Date(data.scheduledAt),
    });
    revalidatePath("/admin/x-posts");
    return {
      ok: true as const,
      post: {
        id: post.id,
        content: post.content,
        tweetId: post.tweetId,
        status: post.status,
        postType: post.postType,
        error: post.error,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
        postedAt: post.postedAt?.toISOString() ?? null,
        isAuto: post.isAuto,
        createdAt: post.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "予約に失敗しました",
    };
  }
}

export async function postNowAction(postId: string) {
  try {
    await assertAdminSession();
    await xPostService.postNow(postId);
    revalidatePath("/admin/x-posts");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "投稿に失敗しました",
    };
  }
}

export async function postNewNowAction(data: {
  content: string;
  postType: XPostType;
}) {
  try {
    await assertAdminSession();
    const post = await xPostRepository.create({
      content: data.content,
      postType: data.postType,
      status: XPostStatus.DRAFT,
    });
    await xPostService.postNow(post.id);
    revalidatePath("/admin/x-posts");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "投稿に失敗しました",
    };
  }
}

export async function deletePostAction(postId: string) {
  try {
    await assertAdminSession();
    await xPostRepository.deleteById(postId);
    revalidatePath("/admin/x-posts");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "削除に失敗しました",
    };
  }
}

export async function loadPostsAction(opts: {
  status?: XPostStatus;
  offset?: number;
}) {
  try {
    await assertAdminSession();
    const posts = await xPostRepository.findMany({
      status: opts.status,
      limit: 50,
      offset: opts.offset ?? 0,
    });
    return {
      ok: true as const,
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        tweetId: p.tweetId,
        status: p.status,
        postType: p.postType,
        error: p.error,
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
        postedAt: p.postedAt?.toISOString() ?? null,
        isAuto: p.isAuto,
        createdAt: p.createdAt.toISOString(),
      })),
    };
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
    const config = await xPostConfigRepository.get();
    return { ok: true as const, autoPostEnabled: config.autoPostEnabled };
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
    await xPostConfigRepository.setAutoPostEnabled(enabled);
    revalidatePath("/admin/x-posts");
    return { ok: true as const, autoPostEnabled: enabled };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "設定の保存に失敗しました",
    };
  }
}
