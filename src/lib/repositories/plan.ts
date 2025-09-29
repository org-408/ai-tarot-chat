import type { Plan, PlanChangeHistory } from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class PlanRepository extends BaseRepository {
  // ==================== Plan ====================
  async createPlan(
    plan: Omit<Plan, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO plans (
        id, code, name, description, price, is_active, features,
        max_readings, max_celtics, max_personal, has_personal, has_history,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        plan.code,
        plan.name,
        plan.description,
        plan.price,
        this.boolToInt(plan.isActive),
        this.stringifyJSON(plan.features),
        plan.maxReadings,
        plan.maxCeltics,
        plan.maxPersonal,
        this.boolToInt(plan.hasPersonal),
        this.boolToInt(plan.hasHistory),
        now,
        now,
      ]
    );

    return id;
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM plans WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToPlan(rows[0]);
  }

  async getPlanByCode(code: string): Promise<Plan | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM plans WHERE code = ?`,
      [code]
    );

    if (rows.length === 0) return null;
    return this.mapRowToPlan(rows[0]);
  }

  async getAllPlans(): Promise<Plan[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM plans ORDER BY price ASC`
    );

    return rows.map((row) => this.mapRowToPlan(row));
  }

  async getActivePlans(): Promise<Plan[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC`
    );

    return rows.map((row) => this.mapRowToPlan(row));
  }

  async updatePlan(
    id: string,
    updates: Partial<Omit<Plan, "id" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

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
    if (updates.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(this.boolToInt(updates.isActive));
    }
    if (updates.features !== undefined) {
      fields.push("features = ?");
      values.push(this.stringifyJSON(updates.features));
    }
    if (updates.maxReadings !== undefined) {
      fields.push("max_readings = ?");
      values.push(updates.maxReadings);
    }
    if (updates.maxCeltics !== undefined) {
      fields.push("max_celtics = ?");
      values.push(updates.maxCeltics);
    }
    if (updates.maxPersonal !== undefined) {
      fields.push("max_personal = ?");
      values.push(updates.maxPersonal);
    }
    if (updates.hasPersonal !== undefined) {
      fields.push("has_personal = ?");
      values.push(this.boolToInt(updates.hasPersonal));
    }
    if (updates.hasHistory !== undefined) {
      fields.push("has_history = ?");
      values.push(this.boolToInt(updates.hasHistory));
    }

    if (fields.length === 0) return;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    await this.db.execute(
      `UPDATE plans SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }

  private mapRowToPlan(row: any): Plan {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      price: row.price,
      isActive: this.intToBool(row.is_active),
      features: this.parseJSON<string[]>(row.features),
      maxReadings: row.max_readings,
      maxCeltics: row.max_celtics,
      maxPersonal: row.max_personal,
      hasPersonal: this.intToBool(row.has_personal),
      hasHistory: this.intToBool(row.has_history),
      createdAt: this.fromTimestamp(row.created_at),
      updatedAt: this.fromTimestamp(row.updated_at),
    };
  }

  // ==================== PlanChangeHistory ====================
  async createPlanChangeHistory(
    history: Omit<PlanChangeHistory, "id" | "changedAt">
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO plan_change_histories (id, user_id, plan_id, changed_at)
       VALUES (?, ?, ?, ?)`,
      [id, history.clientId, history.planId, now]
    );

    return id;
  }

  async getHistoryByUserId(clientId: string): Promise<PlanChangeHistory[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM plan_change_histories WHERE user_id = ? ORDER BY changed_at DESC`,
      [clientId]
    );

    return rows.map((row) => this.mapRowToPlanChangeHistory(row));
  }

  private mapRowToPlanChangeHistory(row: any): PlanChangeHistory {
    return {
      id: row.id,
      clientId: row.user_id,
      planId: row.plan_id,
      changedAt: this.fromTimestamp(row.changed_at),
    };
  }
}

export const planRepository = new PlanRepository();
