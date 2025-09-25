import type { Device, User } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class UserRepository extends BaseRepository {
  // ==================== User ====================
  async createUser(
    user: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO users (
        id, name, email, email_verified, image, created_at, updated_at,
        deleted_at, plan_id, daily_readings_count, last_reading_date,
        daily_celtics_count, last_celtic_reading_date, daily_personal_count,
        last_personal_reading_date, is_registered, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.name ?? null,
        user.email ?? null,
        this.nullableTimestamp(user.emailVerified),
        user.image ?? null,
        now,
        now,
        this.nullableTimestamp(user.deletedAt),
        user.planId,
        user.dailyReadingsCount,
        this.nullableTimestamp(user.lastReadingDate),
        user.dailyCelticsCount,
        this.nullableTimestamp(user.lastCelticReadingDate),
        user.dailyPersonalCount,
        this.nullableTimestamp(user.lastPersonalReadingDate),
        this.boolToInt(user.isRegistered),
        this.nullableTimestamp(user.lastLoginAt),
      ]
    );

    return id;
  }

  async getUserById(id: string): Promise<User | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToUser(rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`,
      [email]
    );

    if (rows.length === 0) return null;
    return this.mapRowToUser(rows[0]);
  }

  async updateUser(
    id: string,
    updates: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push("email = ?");
      values.push(updates.email);
    }
    if (updates.emailVerified !== undefined) {
      fields.push("email_verified = ?");
      values.push(this.nullableTimestamp(updates.emailVerified));
    }
    if (updates.image !== undefined) {
      fields.push("image = ?");
      values.push(updates.image);
    }
    if (updates.planId !== undefined) {
      fields.push("plan_id = ?");
      values.push(updates.planId);
    }
    if (updates.dailyReadingsCount !== undefined) {
      fields.push("daily_readings_count = ?");
      values.push(updates.dailyReadingsCount);
    }
    if (updates.lastReadingDate !== undefined) {
      fields.push("last_reading_date = ?");
      values.push(this.nullableTimestamp(updates.lastReadingDate));
    }
    if (updates.dailyCelticsCount !== undefined) {
      fields.push("daily_celtics_count = ?");
      values.push(updates.dailyCelticsCount);
    }
    if (updates.lastCelticReadingDate !== undefined) {
      fields.push("last_celtic_reading_date = ?");
      values.push(this.nullableTimestamp(updates.lastCelticReadingDate));
    }
    if (updates.dailyPersonalCount !== undefined) {
      fields.push("daily_personal_count = ?");
      values.push(updates.dailyPersonalCount);
    }
    if (updates.lastPersonalReadingDate !== undefined) {
      fields.push("last_personal_reading_date = ?");
      values.push(this.nullableTimestamp(updates.lastPersonalReadingDate));
    }
    if (updates.isRegistered !== undefined) {
      fields.push("is_registered = ?");
      values.push(this.boolToInt(updates.isRegistered));
    }
    if (updates.lastLoginAt !== undefined) {
      fields.push("last_login_at = ?");
      values.push(this.nullableTimestamp(updates.lastLoginAt));
    }

    if (fields.length === 0) return;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    await this.db.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }

  async softDeleteUser(id: string): Promise<void> {
    await this.db.execute(
      `UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [Date.now(), Date.now(), id]
    );
  }

  async hardDeleteUser(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM users WHERE id = ?`, [id]);
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: this.nullableDate(row.email_verified),
      image: row.image,
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
      deletedAt: this.nullableDate(row.deleted_at),
      planId: row.plan_id,
      dailyReadingsCount: row.daily_readings_count,
      lastReadingDate: this.nullableDate(row.last_reading_date),
      dailyCelticsCount: row.daily_celtics_count,
      lastCelticReadingDate: this.nullableDate(row.last_celtic_reading_date),
      dailyPersonalCount: row.daily_personal_count,
      lastPersonalReadingDate: this.nullableDate(
        row.last_personal_reading_date
      ),
      isRegistered: this.intToBool(row.is_registered),
      lastLoginAt: this.nullableDate(row.last_login_at),
    };
  }

  // ==================== Device ====================
  async createDevice(
    device: Omit<Device, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO devices (
        id, device_id, user_id, platform, app_version, os_version,
        push_token, last_seen_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        device.deviceId,
        device.userId,
        device.platform ?? null,
        device.appVersion ?? null,
        device.osVersion ?? null,
        device.pushToken ?? null,
        this.toTimestamp(device.lastSeenAt),
        now,
        now,
      ]
    );

    return id;
  }

  async getDeviceById(id: string): Promise<Device | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM devices WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToDevice(rows[0]);
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM devices WHERE device_id = ?`,
      [deviceId]
    );

    if (rows.length === 0) return null;
    return this.mapRowToDevice(rows[0]);
  }

  async getDevicesByUserId(userId: string): Promise<Device[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen_at DESC`,
      [userId]
    );

    return rows.map((row) => this.mapRowToDevice(row));
  }

  async updateDevice(
    id: string,
    updates: Partial<Omit<Device, "id" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.platform !== undefined) {
      fields.push("platform = ?");
      values.push(updates.platform);
    }
    if (updates.appVersion !== undefined) {
      fields.push("app_version = ?");
      values.push(updates.appVersion);
    }
    if (updates.osVersion !== undefined) {
      fields.push("os_version = ?");
      values.push(updates.osVersion);
    }
    if (updates.pushToken !== undefined) {
      fields.push("push_token = ?");
      values.push(updates.pushToken);
    }
    if (updates.lastSeenAt !== undefined) {
      fields.push("last_seen_at = ?");
      values.push(this.toTimestamp(updates.lastSeenAt));
    }

    if (fields.length === 0) return;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    await this.db.execute(
      `UPDATE devices SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }

  async deleteDevice(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM devices WHERE id = ?`, [id]);
  }

  private mapRowToDevice(row: any): Device {
    return {
      id: row.id,
      deviceId: row.device_id,
      userId: row.user_id,
      platform: row.platform,
      appVersion: row.app_version,
      osVersion: row.os_version,
      pushToken: row.push_token,
      lastSeenAt: this.fromTimestamp(row.last_seen_at),
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
      readings: [],
      chatMessages: [],
    };
  }
}

export const userRepository = new UserRepository();
