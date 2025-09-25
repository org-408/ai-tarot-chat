import Database from "@tauri-apps/plugin-sql";

// TODO: 実際のDBリポジトリをインポート

export class databaseRepository {
  static async init() {
    await DatabaseRepository.init();
  }

  static async execute(query: string, params: any[] = []): Promise<void> {
    // 実際のDB実行ロジックをここに実装
    // 例: return await db.execute(query, params);
    void query; // unused variable workaround
    void params; // unused variable workaround
  }

  static async select<T>(query: string, params: any[] = []): Promise<T[]> {
    // queryとparamsはDBからデータを取得するために使用されます
    // 実際のDB実行ロジックをここに実装
    // 例: return await db.select<T>(query, params);
    void query; // unused variable workaround
    void params; // unused variable workaround
    return []; // 仮の返り値
  }
}

/**
 * データベース初期化・マイグレーション管理
 */
export class DatabaseRepository {
  private static instance: Database | null = null;
  private static readonly DB_FILE = "sqlite:tarot.db";
  private static readonly CURRENT_VERSION = 1;

  static async init(): Promise<Database> {
    if (this.instance) return this.instance;

    this.instance = await Database.load(this.DB_FILE);
    await this.migrate();
    return this.instance;
  }

  static getDB(): Database {
    if (!this.instance) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.instance;
  }

  private static async migrate() {
    const db = this.instance!;

    // バージョン取得
    const result = await db.select<[{ user_version: number }]>(
      "PRAGMA user_version"
    );
    const currentVersion = result[0]?.user_version ?? 0;

    if (currentVersion < 1) {
      // Auth.js関連
      await db.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          provider TEXT NOT NULL,
          provider_account_id TEXT NOT NULL,
          refresh_token TEXT,
          access_token TEXT,
          expires_at INTEGER,
          token_type TEXT,
          scope TEXT,
          id_token TEXT,
          session_state TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          session_token TEXT NOT NULL UNIQUE,
          user_id TEXT NOT NULL,
          expires INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS verification_tokens (
          identifier TEXT NOT NULL,
          token TEXT NOT NULL,
          expires INTEGER NOT NULL,
          PRIMARY KEY (identifier, token)
        )
      `);

      // Users & Devices
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT UNIQUE,
          email_verified INTEGER,
          image TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          plan_id TEXT NOT NULL,
          daily_readings_count INTEGER DEFAULT 0,
          last_reading_date INTEGER,
          daily_celtics_count INTEGER DEFAULT 0,
          last_celtic_reading_date INTEGER,
          daily_personal_count INTEGER DEFAULT 0,
          last_personal_reading_date INTEGER,
          is_registered INTEGER DEFAULT 0,
          last_login_at INTEGER,
          FOREIGN KEY (plan_id) REFERENCES plans(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          device_id TEXT NOT NULL UNIQUE,
          user_id TEXT NOT NULL,
          platform TEXT,
          app_version TEXT,
          os_version TEXT,
          push_token TEXT,
          last_seen_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Tarot関連
      await db.execute(`
        CREATE TABLE IF NOT EXISTS tarot_decks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          purpose TEXT NOT NULL,
          total_cards INTEGER NOT NULL,
          sources TEXT NOT NULL, -- JSON array
          optimized_for TEXT NOT NULL,
          primary_focus TEXT NOT NULL,
          categories TEXT NOT NULL, -- JSON array
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS tarot_cards (
          id TEXT PRIMARY KEY,
          no INTEGER NOT NULL,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          number INTEGER NOT NULL,
          suit TEXT,
          element TEXT,
          zodiac TEXT,
          upright_keywords TEXT NOT NULL, -- JSON array
          reversed_keywords TEXT NOT NULL, -- JSON array
          prompt_context TEXT NOT NULL,
          deck_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (deck_id) REFERENCES tarot_decks(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS card_meanings (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          upright TEXT NOT NULL,
          reversed TEXT NOT NULL,
          card_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (card_id) REFERENCES tarot_cards(id)
        )
      `);

      // Spread関連
      await db.execute(`
        CREATE TABLE IF NOT EXISTS spread_levels (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS spreads (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          level_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          guide TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (level_id) REFERENCES spread_levels(id),
          FOREIGN KEY (plan_id) REFERENCES plans(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS spread_cells (
          id TEXT PRIMARY KEY,
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          v_label TEXT,
          h_label TEXT,
          v_order INTEGER,
          h_order INTEGER,
          spread_id TEXT NOT NULL,
          FOREIGN KEY (spread_id) REFERENCES spreads(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS reading_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS spread_to_categories (
          id TEXT PRIMARY KEY,
          spread_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          FOREIGN KEY (spread_id) REFERENCES spreads(id),
          FOREIGN KEY (category_id) REFERENCES reading_categories(id)
        )
      `);

      // Plan関連
      await db.execute(`
        CREATE TABLE IF NOT EXISTS plans (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          price INTEGER NOT NULL,
          is_active INTEGER DEFAULT 1,
          features TEXT NOT NULL, -- JSON array
          max_readings INTEGER NOT NULL,
          max_celtics INTEGER NOT NULL,
          max_personal INTEGER NOT NULL,
          has_personal INTEGER DEFAULT 0,
          has_history INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS plan_change_histories (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          changed_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (plan_id) REFERENCES plans(id)
        )
      `);

      // Tarotist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS tarotists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          bio TEXT NOT NULL,
          avatar_url TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER
        )
      `);

      // Reading関連
      await db.execute(`
        CREATE TABLE IF NOT EXISTS readings (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          device_id TEXT NOT NULL,
          tarotist_id TEXT NOT NULL,
          spread_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          cards TEXT NOT NULL, -- JSON array
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (device_id) REFERENCES devices(id),
          FOREIGN KEY (tarotist_id) REFERENCES tarotists(id),
          FOREIGN KEY (spread_id) REFERENCES spreads(id),
          FOREIGN KEY (category_id) REFERENCES reading_categories(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS draw_cards (
          id TEXT PRIMARY KEY,
          reading_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          position_x INTEGER NOT NULL,
          position_y INTEGER NOT NULL,
          is_reversed INTEGER DEFAULT 0,
          "order" INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (reading_id) REFERENCES readings(id),
          FOREIGN KEY (card_id) REFERENCES tarot_cards(id)
        )
      `);

      // ChatMessage
      await db.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          tarotist_id TEXT NOT NULL,
          chat_type TEXT NOT NULL,
          reading_id TEXT NOT NULL,
          role TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (device_id) REFERENCES devices(id),
          FOREIGN KEY (tarotist_id) REFERENCES tarotists(id),
          FOREIGN KEY (reading_id) REFERENCES readings(id)
        )
      `);

      // FavoriteSpread
      await db.execute(`
        CREATE TABLE IF NOT EXISTS favorite_spreads (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          spread_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (spread_id) REFERENCES spreads(id)
        )
      `);

      // インデックス作成
      await db.execute(
        "CREATE INDEX IF NOT EXISTS idx_readings_user ON readings(user_id)"
      );
      await db.execute(
        "CREATE INDEX IF NOT EXISTS idx_readings_device ON readings(device_id)"
      );
      await db.execute(
        "CREATE INDEX IF NOT EXISTS idx_readings_created ON readings(created_at DESC)"
      );
      await db.execute(
        "CREATE INDEX IF NOT EXISTS idx_chat_messages_reading ON chat_messages(reading_id)"
      );
      await db.execute(
        "CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id)"
      );

      await db.execute(`PRAGMA user_version = ${this.CURRENT_VERSION}`);
    }
  }

  static async close() {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }
  }
}
