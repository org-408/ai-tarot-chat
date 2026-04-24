/**
 * Phase 2.1 — SpreadCell.position の英語翻訳。
 *
 * キー: 日本語 position 文字列 (DB 上の値そのまま)
 * 値: 英語 position
 *
 * DB 上の 175 SpreadCell のうち unique な position は 142 種類。
 * description は全て「このカードの位置は{position}を示しています」という
 * 固定パターンなので、英語 description はコード側で
 *   "This card represents ${translated_position}."
 * として自動生成する (下記 `generateCellDescriptionEn`)。
 *
 * Apple 4.3(b) NG ワード (fortune / predict / horoscope / destiny /
 * fate / zodiac) を含まない語彙に統一。
 */

export const CELL_POSITION_EN: Record<string, string> = {
  // 月 (year spread)
  "1月": "January",
  "2月": "February",
  "3月": "March",
  "4月": "April",
  "5月": "May",
  "6月": "June",
  "7月": "July",
  "8月": "August",
  "9月": "September",
  "10月": "October",
  "11月": "November",
  "12月": "December",

  // 一般的なペア・関係性
  あなた: "You",
  あなたのアプローチ: "Your approach",
  あなたの強み: "Your strengths",
  すべきこと: "What to do",
  アドバイス: "Guidance",
  コミュニケーション: "Communication",
  タイミング: "Timing",
  バランス: "Balance",
  パートナー: "Partner",
  パートナーシップ: "Partnership",
  ブロック: "Blocks",
  プライベート: "Personal life",
  リスク: "Risk",
  リターン: "Return",
  "仕事・学業": "Work and studies",

  // 位置N — spread の中でセル番号しか持たないケース
  位置1: "Position 1",
  位置2: "Position 2",
  位置3: "Position 3",
  位置4: "Position 4",
  位置5: "Position 5",
  位置6: "Position 6",
  位置7: "Position 7",
  位置8: "Position 8",
  位置9: "Position 9",
  位置10: "Position 10",
  位置11: "Position 11",
  位置12: "Position 12",
  位置13: "Position 13",
  位置14: "Position 14",
  位置15: "Position 15",
  位置16: "Position 16",
  位置17: "Position 17",
  位置18: "Position 18",
  位置19: "Position 19",
  位置20: "Position 20",
  位置21: "Position 21",
  位置22: "Position 22",
  位置23: "Position 23",
  位置24: "Position 24",
  位置25: "Position 25",
  位置26: "Position 26",
  位置27: "Position 27",
  位置28: "Position 28",
  位置29: "Position 29",
  位置30: "Position 30",
  位置31: "Position 31",
  位置32: "Position 32",
  位置33: "Position 33",
  位置34: "Position 34",
  位置35: "Position 35",
  位置36: "Position 36",

  // Kabbalah / Tree of Life
  ケテル: "Keter",
  コクマー: "Chokhmah",
  ビナー: "Binah",
  ケセド: "Chesed",
  ゲブラー: "Gevurah",
  ティファレト: "Tiferet",
  ネツァク: "Netzach",
  ホド: "Hod",
  イエソド: "Yesod",
  マルクト: "Malkuth",

  // 時系列
  過去: "Past",
  現在: "Present",
  未来: "Future",
  現状: "Current state",
  状況: "Situation",
  近い未来: "Near future",
  "過去の影響": "Past influence",
  時期: "Timing",

  // 愛情・関係性
  "現在の愛": "Love as it is now",
  "未来の愛": "Love going forward",
  "相手の気持ち": "Their feelings",
  "相手の印象": "Their impression of you",
  相手: "The other person",
  相手像: "Portrait of the other person",
  "出会い方": "How you might meet",
  "過去の関係": "Past relationship",
  "復縁可能性": "Possibility of reconnecting",
  関係性: "The relationship",

  // 心身・健康
  心: "Mind",
  体: "Body",
  魂: "Spirit",
  精神: "Mental state",
  肉体: "Physical state",
  "心の状態": "State of mind",
  "心の健康": "Mental wellness",
  "体の健康": "Physical wellness",
  "心の癒し": "Emotional healing",
  "体の癒し": "Physical healing",
  健康: "Wellness",
  運動: "Exercise",
  栄養: "Nutrition",
  治療法: "Care approach",
  "回復の兆し": "Signs of recovery",
  完全回復: "Full recovery",

  // 課題・行動・結果
  行動: "Action",
  結果: "Outcome",
  最終結果: "Final outcome",
  原因: "Root cause",
  根本原因: "Underlying cause",
  課題: "Challenge",
  "課題・障害": "Challenges and obstacles",
  解決法: "Approach to resolve",
  必要な行動: "What action is needed",
  強み: "Strength",
  変化: "Change",
  機会: "Opportunity",
  "希望・恐れ": "Hopes and concerns",
  "理想・目標": "Ideals and goals",
  準備度: "Readiness",
  "隠れた影響": "Hidden influences",
  潜在意識: "Inner self",
  成功後: "After success",

  // 人・場・社会
  自己: "Self",
  家庭: "Home life",
  友人: "Friends",
  社会: "Society",
  "周囲の影響": "Surrounding influences",
  "長期目標": "Long-term goals",
  創造: "Creativity",
  哲学: "Philosophy / values",
  占う対象: "The subject of this reading",

  // 金銭
  金運: "Money flow",
  金銭: "Finances",
  収入: "Income",
  支出: "Spending",
  節約法: "Ways to save",
  投資運: "Investment outlook",

  // その他（現在の状況など重複系の別表現）
  "現在の状態": "Current state",
  "現在の状況": "Current situation",
};

/**
 * SpreadCell.description (固定パターン) の英語版を自動生成する。
 * 入力は日本語 position (DB 値)。対応する英訳があれば英語、なければ
 * 元の position をそのまま使う。
 */
export function generateCellDescriptionEn(positionJa: string): string {
  const positionEn = CELL_POSITION_EN[positionJa] ?? positionJa;
  return `This card represents ${positionEn}.`;
}

export function getCellPositionEn(positionJa: string | null | undefined): string | null {
  if (!positionJa) return null;
  return CELL_POSITION_EN[positionJa] ?? null;
}
