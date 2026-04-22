import { BlogPostPhase, BlogPostStatus, BlogPostType, FeatureQueueStatus } from "@/lib/generated/prisma/client";
import { BaseRepository } from "./base";

export type BlogPostRow = {
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
  prompt: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBlogPostInput = {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string;
  tags?: string[];
  metaDescription?: string;
  status?: BlogPostStatus;
  postType?: BlogPostType;
  isAuto?: boolean;
  prompt?: string;
  scheduledAt?: Date;
  publishedAt?: Date;
};

export type UpdateBlogPostInput = Partial<{
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  tags: string[];
  metaDescription: string | null;
  status: BlogPostStatus;
  postType: BlogPostType;
  scheduledAt: Date | null;
  publishedAt: Date | null;
}>;

export type BlogFeatureQueueRow = {
  id: string;
  description: string;
  status: FeatureQueueStatus;
  sortOrder: number;
  publishedAt: Date | null;
  blogPostId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

class BlogPostRepository extends BaseRepository {
  async findMany(opts: {
    status?: BlogPostStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<BlogPostRow[]> {
    const { status, limit = 50, offset = 0 } = opts;
    return this.db.blogPost.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async findPublished(opts: { limit?: number; offset?: number } = {}): Promise<BlogPostRow[]> {
    const { limit = 20, offset = 0 } = opts;
    return this.db.blogPost.findMany({
      where: { status: BlogPostStatus.PUBLISHED },
      orderBy: { publishedAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async findBySlug(slug: string): Promise<BlogPostRow | null> {
    return this.db.blogPost.findUnique({ where: { slug } });
  }

  async findById(id: string): Promise<BlogPostRow | null> {
    return this.db.blogPost.findUnique({ where: { id } });
  }

  async findDue(): Promise<BlogPostRow[]> {
    return this.db.blogPost.findMany({
      where: {
        status: BlogPostStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async findByTypeAndDate(type: BlogPostType, date: Date): Promise<BlogPostRow | null> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.db.blogPost.findFirst({
      where: {
        postType: type,
        isAuto: true,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findRecentTitles(type: BlogPostType, limit: number = 30): Promise<string[]> {
    const posts = await this.db.blogPost.findMany({
      where: { postType: type, isAuto: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { title: true },
    });
    return posts.map((p) => p.title);
  }

  async count(status?: BlogPostStatus): Promise<number> {
    return this.db.blogPost.count({
      where: status ? { status } : undefined,
    });
  }

  async hasTodayAutoPost(): Promise<boolean> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const count = await this.db.blogPost.count({
      where: {
        isAuto: true,
        status: BlogPostStatus.PUBLISHED,
        publishedAt: { gte: start, lte: end },
      },
    });
    return count > 0;
  }

  async create(data: CreateBlogPostInput): Promise<BlogPostRow> {
    return this.db.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        tags: data.tags ?? [],
        metaDescription: data.metaDescription ?? null,
        status: data.status ?? BlogPostStatus.DRAFT,
        postType: data.postType ?? BlogPostType.MANUAL,
        isAuto: data.isAuto ?? false,
        prompt: data.prompt ?? null,
        scheduledAt: data.scheduledAt ?? null,
        publishedAt: data.publishedAt ?? null,
      },
    });
  }

  async update(id: string, data: UpdateBlogPostInput): Promise<BlogPostRow> {
    return this.db.blogPost.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    await this.db.blogPost.delete({ where: { id } });
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const post = await this.db.blogPost.findUnique({ where: { slug } });
    if (!post) return false;
    if (excludeId && post.id === excludeId) return false;
    return true;
  }
}

export const blogPostRepository = new BlogPostRepository();

// ==========================================
// BlogPostConfig (自動公開設定)
// ==========================================

class BlogPostConfigRepository extends BaseRepository {
  async get(): Promise<{ autoPostEnabled: boolean; phase: BlogPostPhase }> {
    const config = await this.db.blogPostConfig.findUnique({
      where: { id: "singleton" },
    });
    return {
      autoPostEnabled: config?.autoPostEnabled ?? false,
      phase: config?.phase ?? BlogPostPhase.POST_LAUNCH,
    };
  }

  async setAutoPostEnabled(enabled: boolean): Promise<void> {
    await this.db.blogPostConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", autoPostEnabled: enabled },
      update: { autoPostEnabled: enabled },
    });
  }

  async setPhase(phase: BlogPostPhase): Promise<void> {
    await this.db.blogPostConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", phase },
      update: { phase },
    });
  }
}

export const blogPostConfigRepository = new BlogPostConfigRepository();

// ==========================================
// BlogFeatureQueue (機能紹介ネタキュー)
// ==========================================

class BlogFeatureQueueRepository extends BaseRepository {
  async findNextPending(): Promise<BlogFeatureQueueRow | null> {
    return this.db.blogFeatureQueue.findFirst({
      where: { status: FeatureQueueStatus.PENDING },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async findAll(status?: FeatureQueueStatus): Promise<BlogFeatureQueueRow[]> {
    return this.db.blogFeatureQueue.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async findById(id: string): Promise<BlogFeatureQueueRow | null> {
    return this.db.blogFeatureQueue.findUnique({ where: { id } });
  }

  async markPublished(id: string, blogPostId: string): Promise<void> {
    await this.db.blogFeatureQueue.update({
      where: { id },
      data: {
        status: FeatureQueueStatus.PUBLISHED,
        publishedAt: new Date(),
        blogPostId,
      },
    });
  }

  async create(description: string, sortOrder?: number): Promise<BlogFeatureQueueRow> {
    const maxOrder = await this.db.blogFeatureQueue.aggregate({
      where: { status: FeatureQueueStatus.PENDING },
      _max: { sortOrder: true },
    });
    const nextOrder = sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;
    return this.db.blogFeatureQueue.create({
      data: { description, sortOrder: nextOrder },
    });
  }

  async update(id: string, data: { description?: string; sortOrder?: number }): Promise<BlogFeatureQueueRow> {
    return this.db.blogFeatureQueue.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.db.blogFeatureQueue.delete({ where: { id } });
  }

  async reorder(id: string, direction: "up" | "down"): Promise<void> {
    const item = await this.db.blogFeatureQueue.findUnique({ where: { id } });
    if (!item || item.status !== FeatureQueueStatus.PENDING) return;

    const neighbor = await this.db.blogFeatureQueue.findFirst({
      where: {
        status: FeatureQueueStatus.PENDING,
        sortOrder: direction === "up" ? { lt: item.sortOrder } : { gt: item.sortOrder },
      },
      orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return;

    await this.db.$transaction([
      this.db.blogFeatureQueue.update({ where: { id: item.id }, data: { sortOrder: neighbor.sortOrder } }),
      this.db.blogFeatureQueue.update({ where: { id: neighbor.id }, data: { sortOrder: item.sortOrder } }),
    ]);
  }

  async seedDefaults(): Promise<number> {
    const defaults = [
      { description: "タロット占い（クイック占い）— スプレッドを選んでカードを引くだけで、AIがその日のリーディングをお届けします", sortOrder: 0 },
      { description: "パーソナル占い — 悩みや状況を詳しく入力すると、AIがあなただけのタロットリーディングをチャット形式で丁寧に行います", sortOrder: 1 },
      { description: "スプレッド選択 — 1枚引きからケルト十字まで、目的に合ったスプレッドを自由に選べます", sortOrder: 2 },
      { description: "AI占い師キャラクター選択 — 個性の異なる複数のAI占い師から、あなたの好みの占い師を選べます", sortOrder: 3 },
      { description: "占い履歴 — 過去のリーディングをいつでも見返せます。気になった占いを何度でも確認できます", sortOrder: 4 },
      { description: "お気に入りスプレッド — よく使うスプレッドをお気に入りに登録して、すぐにアクセスできます", sortOrder: 5 },
      { description: "逆位置カード — カードの正位置・逆位置によってリーディングが変わります。より深い洞察が得られます", sortOrder: 6 },
      { description: "カードシャッフル演出 — 占い前にカードをシャッフルする演出で、リーディングに集中できます", sortOrder: 7 },
      { description: "リーディングカテゴリ選択 — 恋愛・仕事・総合など、占いたいテーマを選んで始められます", sortOrder: 8 },
      { description: "プラン・サブスクリプション — 無料から始めて、プレミアムにアップグレードするとより多くの占い師・スプレッドが使えます", sortOrder: 9 },
      { description: "ゲストユーザー利用 — アカウント登録不要でも、すぐにタロット占いを試せます", sortOrder: 10 },
      { description: "占い師「クラーラ」— 特別なAI占い師クラーラによる、より深いリーディング体験が受けられます", sortOrder: 11 },
      { description: "Web版でのパーソナル占い — スマートフォンだけでなく、PCブラウザからもパーソナル占いが利用できます。長文の悩みも入力しやすい環境でご利用いただけます", sortOrder: 12 },
      { description: "Web版のサブスクリプション管理 — PCブラウザからプランのアップグレード・変更・解約が行えます", sortOrder: 13 },
    ];
    await this.db.blogFeatureQueue.deleteMany({ where: { status: FeatureQueueStatus.PENDING } });
    await this.db.blogFeatureQueue.createMany({ data: defaults });
    return defaults.length;
  }

  async countPending(): Promise<number> {
    return this.db.blogFeatureQueue.count({ where: { status: FeatureQueueStatus.PENDING } });
  }
}

export const blogFeatureQueueRepository = new BlogFeatureQueueRepository();
export { BlogPostPhase };
