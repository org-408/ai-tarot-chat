import {
  adminRepository,
  type AdminClientFilters,
  type AdminDailyResetFilters,
  type AdminLogFilters,
  type AdminLogSortField,
  type AdminReadingFilters,
} from "@/lib/server/repositories/admin";

export class AdminService {
  async getDashboardStats() {
    return adminRepository.getDashboardStats();
  }

  async listClients(
    filters: AdminClientFilters,
    pagination: { skip: number; take: number }
  ) {
    return adminRepository.listClients(filters, pagination);
  }

  async getClientDetail(id: string) {
    return adminRepository.getClientDetail(id);
  }

  async listReadings(
    filters: AdminReadingFilters,
    pagination: { skip: number; take: number }
  ) {
    return adminRepository.listReadings(filters, pagination);
  }

  async getReadingFilters() {
    return adminRepository.getReadingFilters();
  }

  async listLogs(
    filters: AdminLogFilters,
    pagination: { skip: number; take: number },
    sort: { field: AdminLogSortField; dir: "asc" | "desc" }
  ) {
    return adminRepository.listLogs(filters, pagination, sort);
  }

  async listClientsForFilter() {
    return adminRepository.listClientsForFilter();
  }

  async getRevenueSummary(since: Date) {
    return adminRepository.getRevenueSummary(since);
  }

  async listDailyResetHistories(
    filters: AdminDailyResetFilters,
    pagination: { skip: number; take: number }
  ) {
    return adminRepository.listDailyResetHistories(filters, pagination);
  }

  async getStats(since: Date) {
    return adminRepository.getStats(since);
  }

  async listAdminUsers() {
    return adminRepository.listAdminUsers();
  }
}

export const adminService = new AdminService();
