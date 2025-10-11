/**
 * Master Data Service (共通ロジック)
 *
 * Prisma/SQLite の両方で使える共通のビジネスロジック
 * Repository層を抽象化して、どちらでも同じコードで動作する
 */

// リポジトリの型定義（Prisma/SQLiteで共通のインターフェース）
interface IPlanRepository {
  createPlan(plan: any): Promise<string>;
  getPlanByCode(code: string): Promise<any>;
}

interface ISpreadRepository {
  createSpreadLevel(level: any): Promise<string>;
  getSpreadLevelByCode(code: string): Promise<any>;
  createSpread(spread: any): Promise<string>;
  createSpreadCell(cell: any): Promise<string>;
  createReadingCategory(category: any): Promise<string>;
  getReadingCategoryByName(name: string): Promise<any>;
  getReadingCategoryById(id: string): Promise<any>;
  linkSpreadToCategory(spreadId: string, categoryId: string): Promise<string>;
}

interface ITarotistRepository {
  createTarotist(tarotist: any): Promise<string>;
}

interface ITarotRepository {
  createDeck(deck: any): Promise<string>;
  createCard(card: any): Promise<string>;
  createCardMeaning(meaning: any): Promise<string>;
}

interface IMasterConfigRepository {
  createMasterConfig(config: any): Promise<string>;
}

/**
 * Master Data Service クラス
 */
export class MasterDataService {
  constructor(
    private planRepo: IPlanRepository,
    private spreadRepo: ISpreadRepository,
    private tarotistRepo: ITarotistRepository,
    private tarotRepo: ITarotRepository,
    private masterConfigRepo: IMasterConfigRepository
  ) {}

  /**
   * 全マスターデータを投入
   */
  async seedAll(
    plansData: any[],
    levelsData: any[],
    cellsData: any[],
    tarotistCsv: string,
    spreadsCsv: string,
    tarotJsonJa: string,
    tarotJsonEn?: string
  ): Promise<void> {
    console.log("🌱 マスターデータのインポートを開始します...");

    // Plans を投入
    const planIdMap = await this.importPlans(plansData);

    // Levels を投入
    const levelIdMap = await this.importLevels(levelsData);

    // Tarotists を投入
    await this.importTarotists(planIdMap, tarotistCsv);

    // Spreads を投入
    await this.importSpreads(planIdMap, levelIdMap, cellsData, spreadsCsv);

    // TarotDeck を投入（日本語）
    await this.importTarotDeck(tarotJsonJa, "ja");

    // TarotDeck を投入（英語、オプション）
    if (tarotJsonEn) {
      await this.importTarotDeck(tarotJsonEn, "en");
    }

    // Master Version を設定
    await this.setupMasterVersion();

    console.log("✅ マスターデータのインポートが完了しました");
  }

  /**
   * Plans を投入
   */
  private async importPlans(plansData: any[]): Promise<Map<string, string>> {
    console.log("🌱 Plans のインポートを開始します...");

    const planIdMap = new Map<string, string>();

    for (const plan of plansData) {
      const existing = await this.planRepo.getPlanByCode(plan.code);
      if (existing) {
        planIdMap.set(plan.code, existing.id);
        console.log(`  ⏭ ${plan.name} (${plan.code}) - 既存`);
        continue;
      }

      const id = await this.planRepo.createPlan(plan);
      planIdMap.set(plan.code, id);
      console.log(`  ✓ ${plan.name} (${plan.code})`);
    }

    return planIdMap;
  }

  /**
   * Levels を投入
   */
  private async importLevels(levelsData: any[]): Promise<Map<string, string>> {
    console.log("🌱 Levels のインポートを開始します...");

    const levelIdMap = new Map<string, string>();

    for (const level of levelsData) {
      const existing = await this.spreadRepo.getSpreadLevelByCode(level.code);
      if (existing) {
        levelIdMap.set(level.code, existing.id);
        console.log(`  ⏭ ${level.name} (${level.code}) - 既存`);
        continue;
      }

      const id = await this.spreadRepo.createSpreadLevel(level);
      levelIdMap.set(level.code, id);
      console.log(`  ✓ ${level.name} (${level.code})`);
    }

    return levelIdMap;
  }

  /**
   * Tarotists を投入（CSV読み込み）
   */
  private async importTarotists(
    planIdMap: Map<string, string>,
    csvContent: string
  ): Promise<void> {
    console.log("🌱 Tarotists のインポートを開始します...");

    const [titleLine, ...lines] = csvContent.split("\n");
    const keywords = titleLine.split(",").map((key) => key.trim());

    let order = 0;
    for (const line of lines) {
      const values = line.split(",").map((val) => val.trim());
      if (values.length === 0 || !values[0]) {
        continue;
      }

      const tarotist = Object.fromEntries(
        keywords.map((key, index) => [key, values[index]?.trim() || ""])
      );

      const { name, provider, quality, planCode, ...rest } = tarotist;
      const planId = planIdMap.get(planCode);

      if (!planId) {
        console.warn(`  ⚠ プランが見つかりません: ${planCode} (${name})`);
        continue;
      }

      await this.tarotistRepo.createTarotist({
        name,
        order: order++,
        provider: this.toProviderKey(provider),
        quality: parseFloat(quality) || 0,
        planId,
        ...rest,
      });

      console.log(`  ✓ ${name}`);
    }
  }

  /**
   * Spreads を投入（CSV読み込み）
   */
  private async importSpreads(
    planIdMap: Map<string, string>,
    levelIdMap: Map<string, string>,
    cellsData: any[],
    csvContent: string
  ): Promise<void> {
    console.log("🌱 Spreads のインポートを開始します...");

    const lines = csvContent.split("\n");
    const dataLines = lines.slice(1);

    const copyCells = [...cellsData];

    for (const line of dataLines) {
      const columns = line
        .split(",")
        .map((col) => col.trim())
        .filter(Boolean);

      if (columns.length < 11) continue;

      const [
        ,
        name,
        code,
        cardCount,
        categoryString,
        level,
        ,
        ,
        ,
        plan,
        guide,
      ] = columns;

      const cleanName = name.replace(/\*\*/g, "");
      const planId = planIdMap.get(this.normalizePlan(plan));
      const levelId = levelIdMap.get(this.normalizeLevel(level));

      if (!planId || !levelId) {
        console.warn(`  ⚠ Plan/Level が見つかりません: ${cleanName}`);
        continue;
      }

      // Spread を作成
      const spreadId = await this.spreadRepo.createSpread({
        code,
        name: cleanName,
        category: categoryString,
        guide,
        planId,
        levelId,
      });

      // Cells を作成
      const spreadCells = copyCells.splice(0, parseInt(cardCount, 10));
      for (const cell of spreadCells) {
        await this.spreadRepo.createSpreadCell({
          ...cell,
          spreadId,
          hLabel: null,
          hOrder: null,
        });
      }

      // Categories との関連を作成
      const categories = this.parseCategories(categoryString);
      for (const categoryName of categories) {
        // Category が存在しなければ作成
        let category = await this.spreadRepo.getReadingCategoryByName(
          categoryName
        );
        if (!category) {
          const categoryId = await this.spreadRepo.createReadingCategory({
            name: categoryName,
            description: `${categoryName}に関するタロットリーディング`,
          });
          category = await this.spreadRepo.getReadingCategoryById(categoryId);
        }

        if (category) {
          await this.spreadRepo.linkSpreadToCategory(spreadId, category.id);
        }
      }

      console.log(`  ✓ ${cleanName} (${code})`);
    }
  }

  /**
   * TarotDeck を投入（JSON読み込み）
   */
  private async importTarotDeck(
    jsonContent: string,
    language: string
  ): Promise<void> {
    console.log(`🌱 TarotDeck (${language}) のインポートを開始します...`);

    const tarotData = JSON.parse(jsonContent);

    // Deck を作成
    const deckId = await this.tarotRepo.createDeck({
      name: "標準タロットデッキ",
      version: tarotData.metadata.version,
      purpose: tarotData.metadata.purpose,
      totalCards: tarotData.metadata.totalCards,
      sources: tarotData.metadata.sources,
      optimizedFor: tarotData.metadata.optimizedFor,
      primaryFocus: tarotData.metadata.primaryFocus,
      categories: tarotData.metadata.categories,
      status: tarotData.metadata.status,
      language,
    });

    console.log(`  ✓ デッキ作成: ${deckId}`);

    // Cards を作成
    let count = 1;
    for (const [cardId, cardData] of Object.entries(tarotData.cards) as [
      string,
      any
    ][]) {
      const cardDbId = await this.tarotRepo.createCard({
        no: count++,
        code: cardId,
        name: cardData.name,
        type: cardData.type,
        number: parseInt(cardData.number, 10),
        suit: cardData.suit,
        element: cardData.element,
        zodiac: cardData.zodiac,
        uprightKeywords: cardData.uprightKeywords || [],
        reversedKeywords: cardData.reversedKeywords || [],
        promptContext: cardData.promptContext,
        language,
        deckId,
      });

      // Meanings を作成
      for (const [category, data] of Object.entries(
        cardData.meanings || {}
      ) as [string, any][]) {
        await this.tarotRepo.createCardMeaning({
          category,
          upright: data.upright,
          reversed: data.reversed,
          cardId: cardDbId,
          language,
        });
      }
    }

    console.log(
      `  ✓ ${Object.keys(tarotData.cards).length} 枚のカードをインポート`
    );
  }

  /**
   * Master Version を設定
   */
  private async setupMasterVersion(): Promise<void> {
    await this.masterConfigRepo.createMasterConfig({
      key: "MASTER_VERSION",
      version: "1.0.0",
      description: "Initial master data version",
    });
  }

  // ==================== Helper Functions ====================

  private normalizePlan(plan: string): string {
    const planMap: Record<string, string> = {
      Guest: "GUEST",
      Free: "FREE",
      Standard: "STANDARD",
      Premium: "PREMIUM",
      Master: "MASTER",
    };
    return planMap[plan] || "GUEST";
  }

  private normalizeLevel(level: string): string {
    const levelMap: Record<string, string> = {
      初心者: "BEGINNER",
      中級: "MEDIUM",
      中級者: "MEDIUM",
      上級: "ADVANCED",
      上級者: "ADVANCED",
      最上級: "EXPERT",
    };
    return levelMap[level] || "BEGINNER";
  }

  private parseCategories(categoryString: string): string[] {
    return categoryString
      .split("・")
      .map((cat) => cat.trim())
      .filter(Boolean);
  }

  private toProviderKey(input: string): string {
    const normalized = input.trim().toUpperCase();
    const validProviders = ["GPT", "CLAUDE", "GEMINI", "GROQ"];
    return validProviders.includes(normalized) ? normalized : "GPT";
  }
}
