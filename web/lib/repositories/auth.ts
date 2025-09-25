import type {
  Account,
  Session,
  VerificationToken,
} from "@/../shared/lib/types";
import { BaseRepository } from "./base";

export class AuthRepository extends BaseRepository {
  // ==================== Account ====================
  async createAccount(account: Omit<Account, "id">): Promise<string> {
    const created = await this.db.account.create({
      data: {
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      },
    });

    return created.id;
  }

  async getAccountByProvider(
    provider: string,
    providerAccountId: string
  ): Promise<Account | null> {
    const account = await this.db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });

    return account;
  }

  async getAccountsByUserId(userId: string): Promise<Account[]> {
    return await this.db.account.findMany({
      where: { userId },
    });
  }

  async deleteAccount(id: string): Promise<void> {
    await this.db.account.delete({
      where: { id },
    });
  }

  // ==================== Session ====================
  async createSession(session: Omit<Session, "id">): Promise<string> {
    const created = await this.db.session.create({
      data: {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      },
    });

    return created.id;
  }

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    return await this.db.session.findUnique({
      where: { sessionToken },
    });
  }

  async updateSessionExpiry(
    sessionToken: string,
    expires: Date
  ): Promise<void> {
    await this.db.session.update({
      where: { sessionToken },
      data: { expires },
    });
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await this.db.session.delete({
      where: { sessionToken },
    });
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.db.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
  }

  // ==================== VerificationToken ====================
  async createVerificationToken(token: VerificationToken): Promise<void> {
    await this.db.verificationToken.create({
      data: {
        identifier: token.identifier,
        token: token.token,
        expires: token.expires,
      },
    });
  }

  async getVerificationToken(
    identifier: string,
    token: string
  ): Promise<VerificationToken | null> {
    return await this.db.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
    });
  }

  async deleteVerificationToken(
    identifier: string,
    token: string
  ): Promise<void> {
    await this.db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
    });
  }

  async deleteExpiredVerificationTokens(): Promise<void> {
    await this.db.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
  }
}

export const authRepository = new AuthRepository();
