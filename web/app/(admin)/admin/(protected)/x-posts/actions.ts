"use server";

import { XPostPhase, XPostStatus, XPostType } from "@/lib/generated/prisma/client";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { xPostRepository, xPostConfigRepository } from "@/lib/server/repositories/x-post";
import * as xPostService from "@/lib/server/services/x-post";
import { revalidatePath } from "next/cache";

type SerializedXPost = {
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

function serializePost(p: {
  id: string;
  content: string;
  tweetId: string | null;
  status: XPostStatus;
  postType: XPostType;
  error: string | null;
  scheduledAt: Date | null;
  postedAt: Date | null;
  isAuto: boolean;
  mediaPath: string | null;
  createdAt: Date;
}): SerializedXPost {
  return {
    id: p.id,
    content: p.content,
    tweetId: p.tweetId,
    status: p.status,
    postType: p.postType,
    error: p.error,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    postedAt: p.postedAt?.toISOString() ?? null,
    isAuto: p.isAuto,
    mediaPath: p.mediaPath,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function generateContentAction(type: XPostType, customPrompt?: string) {
  try {
    await assertAdminSession();
    const { phase } = await xPostConfigRepository.get();
    const generated = await xPostService.generateContent(
      type,
      phase,
      customPrompt || undefined,
    );
    return {
      ok: true as const,
      content: generated.text,
      mediaPath: generated.mediaPath ?? null,
    };
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
  mediaPath?: string | null;
}) {
  try {
    await assertAdminSession();
    const post = await xPostRepository.create({
      content: data.content,
      postType: data.postType,
      status: XPostStatus.DRAFT,
      mediaPath: data.mediaPath ?? null,
    });
    revalidatePath("/admin/x-posts");
    return { ok: true as const, post: serializePost(post) };
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
  mediaPath?: string | null;
}) {
  try {
    await assertAdminSession();
    const post = await xPostRepository.create({
      content: data.content,
      postType: data.postType,
      status: XPostStatus.SCHEDULED,
      scheduledAt: new Date(data.scheduledAt),
      mediaPath: data.mediaPath ?? null,
    });
    revalidatePath("/admin/x-posts");
    return { ok: true as const, post: serializePost(post) };
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
  mediaPath?: string | null;
}) {
  try {
    await assertAdminSession();
    const post = await xPostRepository.create({
      content: data.content,
      postType: data.postType,
      status: XPostStatus.DRAFT,
      mediaPath: data.mediaPath ?? null,
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
      posts: posts.map(serializePost),
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

export async function setPhaseAction(phase: XPostPhase) {
  try {
    await assertAdminSession();
    await xPostConfigRepository.setPhase(phase);
    revalidatePath("/admin/x-posts");
    return { ok: true as const, phase };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "フェーズの保存に失敗しました",
    };
  }
}
