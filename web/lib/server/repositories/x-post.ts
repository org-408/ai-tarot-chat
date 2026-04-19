import { XPostPhase, XPostStatus, XPostType } from "@/lib/generated/prisma/client";
import { BaseRepository } from "./base";

export type XPostRow = {
  id: string;
  content: string;
  tweetId: string | null;
  status: XPostStatus;
  postType: XPostType;
  error: string | null;
  scheduledAt: Date | null;
  postedAt: Date | null;
  isAuto: boolean;
  prompt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateXPostInput = {
  content: string;
  postType: XPostType;
  status?: XPostStatus;
  scheduledAt?: Date;
  isAuto?: boolean;
  prompt?: string;
};

export type UpdateXPostInput = Partial<{
  content: string;
  tweetId: string;
  status: XPostStatus;
  error: string;
  scheduledAt: Date | null;
  postedAt: Date;
  isAuto: boolean;
  prompt: string;
}>;

class XPostRepository extends BaseRepository {
  async findMany(opts: {
    status?: XPostStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<XPostRow[]> {
    const { status, limit = 50, offset = 0 } = opts;
    return this.db.xPost.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async count(status?: XPostStatus): Promise<number> {
    return this.db.xPost.count({
      where: status ? { status } : undefined,
    });
  }

  async findById(id: string): Promise<XPostRow | null> {
    return this.db.xPost.findUnique({ where: { id } });
  }

  async findDue(): Promise<XPostRow[]> {
    return this.db.xPost.findMany({
      where: {
        status: XPostStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async hasTodayAutoPost(): Promise<boolean> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const count = await this.db.xPost.count({
      where: {
        isAuto: true,
        status: XPostStatus.POSTED,
        postedAt: { gte: start, lte: end },
      },
    });
    return count > 0;
  }

  async create(data: CreateXPostInput): Promise<XPostRow> {
    return this.db.xPost.create({
      data: {
        content: data.content,
        postType: data.postType,
        status: data.status ?? XPostStatus.DRAFT,
        scheduledAt: data.scheduledAt ?? null,
        isAuto: data.isAuto ?? false,
        prompt: data.prompt ?? null,
      },
    });
  }

  async update(id: string, data: UpdateXPostInput): Promise<XPostRow> {
    return this.db.xPost.update({
      where: { id },
      data,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.db.xPost.delete({ where: { id } });
  }
}

export const xPostRepository = new XPostRepository();

// ==========================================
// XPostConfig (自動投稿設定)
// ==========================================

class XPostConfigRepository extends BaseRepository {
  async get(): Promise<{ autoPostEnabled: boolean; phase: XPostPhase }> {
    const config = await this.db.xPostConfig.findUnique({
      where: { id: "singleton" },
    });
    return {
      autoPostEnabled: config?.autoPostEnabled ?? false,
      phase: config?.phase ?? XPostPhase.POST_LAUNCH,
    };
  }

  async setAutoPostEnabled(enabled: boolean): Promise<void> {
    await this.db.xPostConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", autoPostEnabled: enabled },
      update: { autoPostEnabled: enabled },
    });
  }

  async setPhase(phase: XPostPhase): Promise<void> {
    await this.db.xPostConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", phase },
      update: { phase },
    });
  }
}

export const xPostConfigRepository = new XPostConfigRepository();
export { XPostPhase };
