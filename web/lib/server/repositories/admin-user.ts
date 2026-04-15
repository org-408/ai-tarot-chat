import { BaseRepository } from "./base";

export class AdminUserRepository extends BaseRepository {
  async findById(id: string) {
    return this.db.adminUser.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, image: true },
    });
  }

  async findByEmail(email: string) {
    return this.db.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, image: true },
    });
  }

  async upsertByEmail(email: string) {
    return this.db.adminUser.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  }

  async deleteById(id: string) {
    return this.db.adminUser.delete({ where: { id } });
  }
}

export const adminUserRepository = new AdminUserRepository();
