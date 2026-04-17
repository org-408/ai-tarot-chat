import { Prisma } from "@/lib/generated/prisma/client";
import { BaseRepository } from "./base";

// ==================== 型定義 ====================

export interface AdminClientFilters {
  planCode?: string;
  keyword?: string;
}

export interface AdminReadingFilters {
  keyword?: string;
  clientId?: string;
  tarotistId?: string;
  spreadId?: string;
  categoryId?: string;
  dateFrom?: Date;
}

export interface AdminLogFilters {
  level?: string;
  dateFrom?: Date;
  clientId?: string;
  keyword?: string;
}

export interface AdminDailyResetFilters {
  clientId?: string;
  resetType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export type AdminLogSortField =
  | "timestamp"
  | "createdAt"
  | "level"
  | "source"
  | "path"
  | "message"
  | "clientId";

// ==================== AdminRepository ====================

export class AdminRepository extends BaseRepository {
  // -------- Dashboard --------

  async getDashboardStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalClients,
      clientsByPlan,
      todayReadings,
      totalTarotists,
      recentErrors,
      plans,
      activeClients,
    ] = await Promise.all([
      this.db.client.count({ where: { deletedAt: null } }),
      this.db.client.groupBy({
        by: ["planId"],
        where: { deletedAt: null },
        _count: true,
      }),
      this.db.reading.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.db.tarotist.count({ where: { deletedAt: null } }),
      this.db.log.count({
        where: {
          level: "error",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.db.plan.findMany({ select: { id: true, name: true, code: true } }),
      this.db.reading.groupBy({
        by: ["clientId"],
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    return {
      totalClients,
      clientsByPlan,
      todayReadings,
      totalTarotists,
      recentErrors,
      plans,
      weeklyActiveClients: activeClients.length,
    };
  }

  // -------- Clients --------

  private buildClientWhere(filters: AdminClientFilters): Prisma.ClientWhereInput {
    return {
      deletedAt: null,
      ...(filters.planCode && filters.planCode !== "ALL"
        ? { plan: { code: filters.planCode } }
        : {}),
      ...(filters.keyword
        ? {
            OR: [
              { name: { contains: filters.keyword, mode: "insensitive" as const } },
              { email: { contains: filters.keyword, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
  }

  async listClients(filters: AdminClientFilters, pagination: { skip: number; take: number }) {
    const where = this.buildClientWhere(filters);
    const [clients, total] = await Promise.all([
      this.db.client.findMany({
        where,
        include: {
          plan: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, email: true } },
          devices: { select: { id: true, platform: true, lastSeenAt: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.db.client.count({ where }),
    ]);
    return { clients, total };
  }

  async getClientDetail(id: string) {
    return this.db.client.findUnique({
      where: { id },
      include: {
        plan: true,
        user: { select: { id: true, email: true, role: true } },
        devices: { orderBy: { lastSeenAt: "desc" } },
        planChangeHistories: {
          include: {
            fromPlan: { select: { id: true, name: true, code: true } },
            toPlan: { select: { id: true, name: true, code: true } },
          },
          orderBy: { changedAt: "desc" },
        },
        adminResetHistories: { orderBy: { createdAt: "desc" } },
        dailyResetHistories: { orderBy: { createdAt: "desc" }, take: 30 },
        readings: {
          include: {
            tarotist: { select: { id: true, name: true, icon: true } },
            spread: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        logs: { orderBy: { timestamp: "desc" }, take: 20 },
      },
    });
  }

  // -------- Readings --------

  private buildReadingWhere(filters: AdminReadingFilters): Prisma.ReadingWhereInput {
    return {
      ...(filters.dateFrom ? { createdAt: { gte: filters.dateFrom } } : {}),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.tarotistId ? { tarotistId: filters.tarotistId } : {}),
      ...(filters.spreadId ? { spreadId: filters.spreadId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.keyword
        ? {
            OR: [
              { client: { name: { contains: filters.keyword, mode: "insensitive" as const } } },
              { client: { email: { contains: filters.keyword, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
  }

  async listReadings(filters: AdminReadingFilters, pagination: { skip: number; take: number }) {
    const where = this.buildReadingWhere(filters);
    const [readings, total] = await Promise.all([
      this.db.reading.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              isRegistered: true,
              plan: { select: { id: true, name: true, code: true } },
            },
          },
          tarotist: { select: { id: true, name: true, icon: true, model: true } },
          spread: { select: { id: true, name: true, _count: { select: { cells: true } } } },
          category: { select: { id: true, name: true } },
          cards: {
            select: {
              id: true,
              order: true,
              position: true,
              isReversed: true,
              keywords: true,
              card: { select: { name: true, code: true } },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.db.reading.count({ where }),
    ]);
    return { readings, total };
  }

  async getReadingFilters() {
    const [tarotists, spreads, categories, clients] = await Promise.all([
      this.db.tarotist.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, icon: true },
        orderBy: { no: "asc" },
      }),
      this.db.spread.findMany({
        select: { id: true, name: true },
        orderBy: { no: "asc" },
      }),
      this.db.readingCategory.findMany({
        select: { id: true, name: true },
        orderBy: { no: "asc" },
      }),
      this.db.client.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { tarotists, spreads, categories, clients };
  }

  // -------- Logs --------

  private buildLogWhere(filters: AdminLogFilters): Prisma.LogWhereInput {
    return {
      ...(filters.level && filters.level !== "ALL" ? { level: filters.level } : {}),
      ...(filters.dateFrom ? { timestamp: { gte: filters.dateFrom } } : {}),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.keyword
        ? {
            OR: [
              { message: { contains: filters.keyword, mode: "insensitive" as const } },
              { path: { contains: filters.keyword, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
  }

  async listLogs(
    filters: AdminLogFilters,
    pagination: { skip: number; take: number },
    sort: { field: AdminLogSortField; dir: "asc" | "desc" }
  ) {
    const where = this.buildLogWhere(filters);
    const [logs, total] = await Promise.all([
      this.db.log.findMany({
        where,
        select: {
          id: true,
          level: true,
          message: true,
          metadata: true,
          clientId: true,
          path: true,
          source: true,
          timestamp: true,
          createdAt: true,
        },
        orderBy: { [sort.field]: sort.dir },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.db.log.count({ where }),
    ]);
    return { logs, total };
  }

  async listClientsForFilter() {
    return this.db.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  // -------- Revenue --------

  async getRevenueSummary(since: Date) {
    const [plans, clientsByPlan, recentChanges] = await Promise.all([
      this.db.plan.findMany({
        select: { id: true, name: true, code: true, price: true },
        orderBy: { no: "asc" },
      }),
      this.db.client.groupBy({
        by: ["planId"],
        where: { deletedAt: null },
        _count: true,
      }),
      this.db.planChangeHistory.findMany({
        where: { changedAt: { gte: since } },
        include: {
          client: { select: { id: true, name: true, email: true } },
          fromPlan: { select: { name: true, code: true, price: true } },
          toPlan: { select: { name: true, code: true, price: true } },
        },
        orderBy: { changedAt: "desc" },
        take: 200,
      }),
    ]);
    return { plans, clientsByPlan, recentChanges };
  }

  // -------- Daily Reset History --------

  async listDailyResetHistories(
    filters: AdminDailyResetFilters,
    pagination: { skip: number; take: number }
  ) {
    const where: Prisma.DailyResetHistoryWhereInput = {
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.resetType ? { resetType: filters.resetType } : {}),
      ...((filters.dateFrom || filters.dateTo)
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };
    const [histories, total] = await Promise.all([
      this.db.dailyResetHistory.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.db.dailyResetHistory.count({ where }),
    ]);
    return { histories, total };
  }

  // -------- Stats --------

  async getStats(since: Date) {
    const [
      recentClients,
      recentReadings,
      clientsByPlan,
      plans,
      topTarotists,
      tarotists,
      totalClients,
      totalReadings,
      registeredClients,
    ] = await Promise.all([
      this.db.client.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
      }),
      this.db.reading.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.db.client.groupBy({
        by: ["planId"],
        where: { deletedAt: null },
        _count: true,
      }),
      this.db.plan.findMany({ select: { id: true, name: true, code: true } }),
      this.db.reading.groupBy({
        by: ["tarotistId"],
        _count: { tarotistId: true },
        orderBy: { _count: { tarotistId: "desc" } },
        take: 8,
      }),
      this.db.tarotist.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, icon: true },
      }),
      this.db.client.count({ where: { deletedAt: null } }),
      this.db.reading.count(),
      this.db.client.count({ where: { deletedAt: null, isRegistered: true } }),
    ]);

    return {
      recentClients,
      recentReadings,
      clientsByPlan,
      plans,
      topTarotists,
      tarotists,
      totalClients,
      totalReadings,
      registeredClients,
    };
  }

  // -------- Admin Users --------

  async listAdminUsers() {
    return this.db.adminUser.findMany({
      select: { id: true, name: true, email: true, image: true, createdAt: true, activatedAt: true },
      orderBy: { createdAt: "asc" },
    });
  }
}

export const adminRepository = new AdminRepository();
