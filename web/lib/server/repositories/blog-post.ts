import { BlogPostStatus } from "@/lib/generated/prisma/client";
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
  isAuto: boolean;
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
  isAuto?: boolean;
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
  scheduledAt: Date | null;
  publishedAt: Date | null;
}>;

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

  async count(status?: BlogPostStatus): Promise<number> {
    return this.db.blogPost.count({
      where: status ? { status } : undefined,
    });
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
        isAuto: data.isAuto ?? false,
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
