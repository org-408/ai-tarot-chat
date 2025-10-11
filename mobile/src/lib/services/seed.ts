/**
 * Services for Mobile (SQLite版)
 *
 * 配置: root/mobile/src/lib/services/index.ts
 */

import { MasterDataService } from "../../../../shared/lib/services/seed";
import { masterConfigRepository } from "../repositories/sqlite/master";
import { planRepository } from "../repositories/sqlite/plan";
import { spreadRepository } from "../repositories/sqlite/spread";
import { tarotRepository } from "../repositories/sqlite/tarot";
import { tarotistRepository } from "../repositories/sqlite/tarotist";

// SQLite版のリポジトリを使ってServiceをインスタンス化
export const masterDataService = new MasterDataService(
  planRepository,
  spreadRepository,
  tarotistRepository,
  tarotRepository,
  masterConfigRepository
);
