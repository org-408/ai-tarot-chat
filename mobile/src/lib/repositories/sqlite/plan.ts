/**
 * Plan Repository (SQLite版)
 *
 * Prisma版のPlanRepositoryをSQLite用に移植
 */

import { v4 as uuidv4 } from "uuid";
import type { Plan } from "../../../../../shared/lib/types";
import type { PlanRow } from "../../database/types";
import { BaseRepository } from "./base";

export class PlanRepository extends BaseRepository {
  // ==================== Plan ====================

  async createPlan(
    plan: Omit<
      Plan,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "clients"
      | "spreads"
      | "planChangeHistories"
    >
  ): Promise<string> {
    const db = await this.getDb();
    const id = uuidv4();
    const now = this.dateToString(new Date());

    await db.run(
      `INSERT INTO plans 
      (id, no, code, name, description, price, requiresAuth, features, isActive, 
       maxReadings, maxCeltics, maxPersonal, hasPersonal, hasHistory,
       primaryColor, secondaryColor, accentColor, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        plan.no,
        plan.code,
        plan.name,
        plan.description,
        plan.price,
        this.boolToInt(plan.requiresAuth),
        this.stringifyJSON(plan.features),
        this.boolToInt(plan.isActive),
        plan.maxReadings,
        plan.maxCeltics,
        plan.maxPersonal,
        this.boolToInt(plan.hasPersonal),
        this.boolToInt(plan.hasHistory),
        plan.primaryColor,
        plan.secondaryColor,
        plan.accentColor,
        now,
        now,
      ]
    );

    return id;
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM plans WHERE id = ?", [id]);

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToPlan(result.values[0]);
  }

  async getPlanByCode(code: string): Promise<Plan | null> {
    const db = await this.getDb();
    const result = await db.query("SELECT * FROM plans WHERE code = ?", [code]);

    if (!result.values || result.values.length === 0) return null;

    return this.mapRowToPlan(result.values[0]);
  }

  async getAllPlans(all: boolean = false): Promise<Plan[]> {
    const db = await this.getDb();
    const query = all
      ? "SELECT * FROM plans ORDER BY no"
      : "SELECT * FROM plans WHERE isActive = 1 ORDER BY no";

    const result = await db.query(query);

    if (!result.values) return [];

    return result.values.map((row) => this.mapRowToPlan(row));
  }

  async updatePlan(
    id: string,
    updates: Partial<
      Omit<
        Plan,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "clients"
        | "spreads"
        | "planChangeHistories"
      >
    >
  ): Promise<void> {
    const db = await this.getDb();
    const now = this.dateToString(new Date());

    // 動的にUPDATE文を構築
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.no !== undefined) {
      fields.push("no = ?");
      values.push(updates.no);
    }
    if (updates.code !== undefined) {
      fields.push("code = ?");
      values.push(updates.code);
    }
    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.price !== undefined) {
      fields.push("price = ?");
      values.push(updates.price);
    }
    if (updates.requiresAuth !== undefined) {
      fields.push("requiresAuth = ?");
      values.push(this.boolToInt(updates.requiresAuth));
    }
    if (updates.features !== undefined) {
      fields.push("features = ?");
      values.push(this.stringifyJSON(updates.features));
    }
    if (updates.isActive !== undefined) {
      fields.push("isActive = ?");
      values.push(this.boolToInt(updates.isActive));
    }
    if (updates.maxReadings !== undefined) {
      fields.push("maxReadings = ?");
      values.push(updates.maxReadings);
    }
    if (updates.maxCeltics !== undefined) {
      fields.push("maxCeltics = ?");
      values.push(updates.maxCeltics);
    }
    if (updates.maxPersonal !== undefined) {
      fields.push("maxPersonal = ?");
      values.push(updates.maxPersonal);
    }
    if (updates.hasPersonal !== undefined) {
      fields.push("hasPersonal = ?");
      values.push(this.boolToInt(updates.hasPersonal));
    }
    if (updates.hasHistory !== undefined) {
      fields.push("hasHistory = ?");
      values.push(this.boolToInt(updates.hasHistory));
    }
    if (updates.primaryColor !== undefined) {
      fields.push("primaryColor = ?");
      values.push(updates.primaryColor);
    }
    if (updates.secondaryColor !== undefined) {
      fields.push("secondaryColor = ?");
      values.push(updates.secondaryColor);
    }
    if (updates.accentColor !== undefined) {
      fields.push("accentColor = ?");
      values.push(updates.accentColor);
    }

    fields.push("updatedAt = ?");
    values.push(now);
    values.push(id);

    await db.run(`UPDATE plans SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  // ==================== Helper ====================

  private mapRowToPlan(row: PlanRow): Plan {
    return {
      id: row.id,
      no: row.no,
      code: row.code,
      name: row.name,
      description: row.description,
      price: row.price,
      requiresAuth: this.intToBool(row.requiresAuth),
      features: this.parseJSON(row.features),
      isActive: this.intToBool(row.isActive),
      maxReadings: row.maxReadings,
      maxCeltics: row.maxCeltics,
      maxPersonal: row.maxPersonal,
      hasPersonal: this.intToBool(row.hasPersonal),
      hasHistory: this.intToBool(row.hasHistory),
      primaryColor: row.primaryColor,
      secondaryColor: row.secondaryColor,
      accentColor: row.accentColor,
      createdAt: this.stringToDate(row.createdAt),
      updatedAt: this.stringToDate(row.updatedAt),
    };
  }
}

export const planRepository = new PlanRepository();
