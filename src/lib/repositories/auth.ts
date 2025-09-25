import type {
  Account,
  Session,
  VerificationToken,
} from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class AuthRepository extends BaseRepository {
  // ==================== Account ====================
  async createAccount(account: Omit<Account, "id">): Promise<string> {
    const id = crypto.randomUUID();

    await this.db.execute(
      `INSERT INTO accounts (
        id, user_id, type, provider, provider_account_id,
        refresh_token, access_token, expires_at, token_type,
        scope, id_token, session_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        account.userId,
        account.type,
        account.provider,
        account.providerAccountId,
        account.refresh_token ?? null,
        account.access_token ?? null,
        account.expires_at ?? null,
        account.token_type ?? null,
        account.scope ?? null,
        account.id_token ?? null,
        account.session_state ?? null,
      ]
    );

    return id;
  }

  async getAccountByProvider(
    provider: string,
    providerAccountId: string
  ): Promise<Account | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ?`,
      [provider, providerAccountId]
    );

    if (rows.length === 0) return null;
    return this.mapRowToAccount(rows[0]);
  }

  async getAccountsByUserId(userId: string): Promise<Account[]> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM accounts WHERE user_id = ?`,
      [userId]
    );

    return rows.map((row) => this.mapRowToAccount(row));
  }

  async deleteAccount(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM accounts WHERE id = ?`, [id]);
  }

  private mapRowToAccount(row: any): Account {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      provider: row.provider,
      providerAccountId: row.provider_account_id,
      refresh_token: row.refresh_token,
      access_token: row.access_token,
      expires_at: row.expires_at,
      token_type: row.token_type,
      scope: row.scope,
      id_token: row.id_token,
      session_state: row.session_state,
    };
  }

  // ==================== Session ====================
  async createSession(session: Omit<Session, "id">): Promise<string> {
    const id = crypto.randomUUID();

    await this.db.execute(
      `INSERT INTO sessions (id, session_token, user_id, expires) VALUES (?, ?, ?, ?)`,
      [
        id,
        session.sessionToken,
        session.userId,
        this.toTimestamp(session.expires),
      ]
    );

    return id;
  }

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM sessions WHERE session_token = ?`,
      [sessionToken]
    );

    if (rows.length === 0) return null;
    return this.mapRowToSession(rows[0]);
  }

  async updateSessionExpiry(
    sessionToken: string,
    expires: Date
  ): Promise<void> {
    await this.db.execute(
      `UPDATE sessions SET expires = ? WHERE session_token = ?`,
      [this.toTimestamp(expires), sessionToken]
    );
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await this.db.execute(`DELETE FROM sessions WHERE session_token = ?`, [
      sessionToken,
    ]);
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = Date.now();
    await this.db.execute(`DELETE FROM sessions WHERE expires < ?`, [now]);
  }

  private mapRowToSession(row: any): Session {
    return {
      id: row.id,
      sessionToken: row.session_token,
      userId: row.user_id,
      expires: this.fromTimestamp(row.expires),
    };
  }

  // ==================== VerificationToken ====================
  async createVerificationToken(token: VerificationToken): Promise<void> {
    await this.db.execute(
      `INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)`,
      [token.identifier, token.token, this.toTimestamp(token.expires)]
    );
  }

  async getVerificationToken(
    identifier: string,
    token: string
  ): Promise<VerificationToken | null> {
    const rows = await this.db.select<any[]>(
      `SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?`,
      [identifier, token]
    );

    if (rows.length === 0) return null;
    return this.mapRowToVerificationToken(rows[0]);
  }

  async deleteVerificationToken(
    identifier: string,
    token: string
  ): Promise<void> {
    await this.db.execute(
      `DELETE FROM verification_tokens WHERE identifier = ? AND token = ?`,
      [identifier, token]
    );
  }

  async deleteExpiredVerificationTokens(): Promise<void> {
    const now = Date.now();
    await this.db.execute(`DELETE FROM verification_tokens WHERE expires < ?`, [
      now,
    ]);
  }

  private mapRowToVerificationToken(row: any): VerificationToken {
    return {
      identifier: row.identifier,
      token: row.token,
      expires: this.fromTimestamp(row.expires),
    };
  }
}

export const authRepository = new AuthRepository();
