// apps/web/lib/scripts/generate-master-data.ts
import { masterService } from "@/lib/server/services/master";
import fs from "fs";
import path from "path";

/**
 * オブジェクトをTypeScript構文に変換
 * Date型は `new Date("...")` として出力
 */
function toTypeScriptLiteral(obj: unknown, indent = 0): string {
  const spaces = "  ".repeat(indent);

  // null/undefined
  if (obj === null) return "null";
  if (obj === undefined) return "undefined";

  // Date型
  if (obj instanceof Date) {
    return `new Date("${obj.toISOString()}")`;
  }

  // 配列
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    const items = obj
      .map((item) => `${spaces}  ${toTypeScriptLiteral(item, indent + 1)}`)
      .join(",\n");
    return `[\n${items}\n${spaces}]`;
  }

  // オブジェクト
  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";

    const props = entries
      .map(([key, value]) => {
        const validKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
        const keyStr = validKey ? key : `"${key}"`;
        return `${spaces}  ${keyStr}: ${toTypeScriptLiteral(
          value,
          indent + 1
        )}`;
      })
      .join(",\n");

    return `{\n${props}\n${spaces}}`;
  }

  // 文字列
  if (typeof obj === "string") {
    return JSON.stringify(obj);
  }

  // その他（number, boolean）
  return String(obj);
}

async function generateMasterData() {
  console.log("🔨 Generating master data...");

  // Prismaから全マスターデータ取得
  const masterData = await masterService.getAllMasterData();

  // TypeScript構文に変換
  const tsLiteral = toTypeScriptLiteral(masterData);

  // TypeScriptファイルとして生成
  const tsContent = `// Auto-generated - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

export const DEFAULT_MASTER_DATA = ${tsLiteral};
`;

  const tsPath = path.join(__dirname, "../../mobile/src/assets/master-data.ts");
  fs.writeFileSync(tsPath, tsContent);

  console.log("✅ Master data TypeScript file generated");
  console.log(`   Path: ${tsPath}`);
}

generateMasterData().catch(console.error);
