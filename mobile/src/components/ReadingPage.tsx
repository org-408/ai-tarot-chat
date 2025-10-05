import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TarotCard } from "../../../shared/lib/types";
import { useMaster } from "../lib/hooks/useMaster";

interface ReadingPageProps {
  spreadId: string;
  categoryId: string;
  onBack: () => void;
}

// カード配置情報の型
interface CardPlacement {
  id: string;
  number: number;
  gridX: number;
  gridY: number;
  rotation: number;
  card: TarotCard;
  isReversed: boolean;
  position: string;
  description: string;
}

// 77枚のカードデータ（MasterDataにない場合のフォールバック）
const TEMP_CARDS: TarotCard[] = [
  // === 大アルカナ 22枚 ===
  { id: '0', no: 0, code: '0_fool', name: '愚者', type: 'major', number: 0, uprightKeywords: ['新しい始まり', '自由', '冒険', '純粋', '可能性'], reversedKeywords: ['無謀', '無計画', '軽率', '愚行', '未熟'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '1', no: 1, code: '1_magician', name: '魔術師', type: 'major', number: 1, uprightKeywords: ['創造', '実現', 'スキル', '才能', '行動'], reversedKeywords: ['詐欺', '悪用', '未熟', '空回り', '自信過剰'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', no: 2, code: '2_high_priestess', name: '女教皇', type: 'major', number: 2, uprightKeywords: ['直感', '神秘', '内なる声', '潜在意識', '洞察'], reversedKeywords: ['秘密', '隠蔽', '直感の無視', '表面的', '混乱'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '3', no: 3, code: '3_empress', name: '女帝', type: 'major', number: 3, uprightKeywords: ['豊穣', '母性', '創造性', '美', '繁栄'], reversedKeywords: ['依存', '過保護', '停滞', '不毛', '浪費'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '4', no: 4, code: '4_emperor', name: '皇帝', type: 'major', number: 4, uprightKeywords: ['権威', '支配', '安定', '父性', '構造'], reversedKeywords: ['独裁', '硬直', '支配欲', '権力乱用', '未熟'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '5', no: 5, code: '5_hierophant', name: '教皇', type: 'major', number: 5, uprightKeywords: ['伝統', '教育', '信念', '道徳', '助言'], reversedKeywords: ['独断', '因習', '反抗', '自由の制限', '偏見'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '6', no: 6, code: '6_lovers', name: '恋人', type: 'major', number: 6, uprightKeywords: ['愛', '選択', '調和', '価値観', '結びつき'], reversedKeywords: ['不調和', '誤った選択', '分離', '誘惑', '迷い'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '7', no: 7, code: '7_chariot', name: '戦車', type: 'major', number: 7, uprightKeywords: ['勝利', '意志', '前進', '克服', '決意'], reversedKeywords: ['暴走', '敗北', '方向性の喪失', '挫折', '衝突'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '8', no: 8, code: '8_strength', name: '力', type: 'major', number: 8, uprightKeywords: ['勇気', '忍耐', '内なる力', '優しさ', '制御'], reversedKeywords: ['弱さ', '自信欠如', '暴力', '虐待', '恐怖'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '9', no: 9, code: '9_hermit', name: '隠者', type: 'major', number: 9, uprightKeywords: ['内省', '探求', '孤独', '叡智', '導き'], reversedKeywords: ['孤立', '引きこもり', '拒絶', '孤独感', '固執'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '10', no: 10, code: '10_wheel_fortune', name: '運命の輪', type: 'major', number: 10, uprightKeywords: ['変化', '運命', 'サイクル', '転機', '好転'], reversedKeywords: ['悪化', '停滞', '不運', '逆境', '繰り返し'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '11', no: 11, code: '11_justice', name: '正義', type: 'major', number: 11, uprightKeywords: ['公正', 'バランス', '真実', '責任', '因果'], reversedKeywords: ['不正', '不公平', '偏見', '無責任', '不均衡'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '12', no: 12, code: '12_hanged_man', name: '吊された男', type: 'major', number: 12, uprightKeywords: ['犠牲', '視点転換', '試練', '待機', '悟り'], reversedKeywords: ['無駄な犠牲', '停滞', '執着', '抵抗', '自己中心'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '13', no: 13, code: '13_death', name: '死神', type: 'major', number: 13, uprightKeywords: ['終わり', '変容', '再生', '手放し', '新章'], reversedKeywords: ['停滞', '執着', '恐怖', '拒絶', '抵抗'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '14', no: 14, code: '14_temperance', name: '節制', type: 'major', number: 14, uprightKeywords: ['調和', 'バランス', '節度', '癒し', '統合'], reversedKeywords: ['不均衡', '過剰', '不調和', '欠如', '衝突'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '15', no: 15, code: '15_devil', name: '悪魔', type: 'major', number: 15, uprightKeywords: ['束縛', '誘惑', '執着', '物質主義', '依存'], reversedKeywords: ['解放', '脱却', '自覚', '克服', '自由'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '16', no: 16, code: '16_tower', name: '塔', type: 'major', number: 16, uprightKeywords: ['崩壊', '啓示', '突然の変化', '破壊', '真実'], reversedKeywords: ['回避', '小さな崩壊', '恐怖', '延期', '抵抗'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '17', no: 17, code: '17_star', name: '星', type: 'major', number: 17, uprightKeywords: ['希望', 'インスピレーション', '癒し', '平和', '導き'], reversedKeywords: ['絶望', '幻滅', '失望', '希望の喪失', '不安'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '18', no: 18, code: '18_moon', name: '月', type: 'major', number: 18, uprightKeywords: ['不安', '幻想', '潜在意識', '直感', '夢'], reversedKeywords: ['混乱', '恐怖', '欺瞞', '不安定', '抑圧'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '19', no: 19, code: '19_sun', name: '太陽', type: 'major', number: 19, uprightKeywords: ['成功', '喜び', '活力', '明快', '祝福'], reversedKeywords: ['失敗', '悲観', '延期', '過度の楽観', '落胆'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '20', no: 20, code: '20_judgement', name: '審判', type: 'major', number: 20, uprightKeywords: ['再生', '覚醒', '呼び声', '決断', '新生'], reversedKeywords: ['自責', '逃避', '後悔', '判断ミス', '拒絶'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '21', no: 21, code: '21_world', name: '世界', type: 'major', number: 21, uprightKeywords: ['完成', '達成', '統合', '成就', '旅の終わり'], reversedKeywords: ['未完', '停滞', '失敗', '中断', '不完全'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },

  // === 小アルカナ ワンド 14枚 ===
  { id: '22', no: 22, code: 'ace_wands', name: 'ワンドのエース', type: 'minor', number: 1, suit: 'wands', element: 'fire', uprightKeywords: ['創造', '情熱', '始まり', 'インスピレーション', '成長'], reversedKeywords: ['遅延', '欠如', '停滞', '無気力', '挫折'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '23', no: 23, code: 'two_wands', name: 'ワンドの2', type: 'minor', number: 2, suit: 'wands', element: 'fire', uprightKeywords: ['計画', '発見', '選択', '野心', '将来'], reversedKeywords: ['恐怖', '迷い', '計画不足', '優柔不断', '制限'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '24', no: 24, code: 'three_wands', name: 'ワンドの3', type: 'minor', number: 3, suit: 'wands', element: 'fire', uprightKeywords: ['拡大', '先見', '探求', 'リーダーシップ', '発展'], reversedKeywords: ['遅延', '障害', '期待外れ', '計画の失敗', '不安'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '25', no: 25, code: 'four_wands', name: 'ワンドの4', type: 'minor', number: 4, suit: 'wands', element: 'fire', uprightKeywords: ['祝福', '調和', '安定', '喜び', '成果'], reversedKeywords: ['不調和', '移行', '不安定', '制限', '不満'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '26', no: 26, code: 'five_wands', name: 'ワンドの5', type: 'minor', number: 5, suit: 'wands', element: 'fire', uprightKeywords: ['競争', '対立', '多様性', '意見の相違', '挑戦'], reversedKeywords: ['内なる対立', '回避', '緊張', '不和', '争い'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '27', no: 27, code: 'six_wands', name: 'ワンドの6', type: 'minor', number: 6, suit: 'wands', element: 'fire', uprightKeywords: ['勝利', '成功', '公認', 'リーダーシップ', '進歩'], reversedKeywords: ['失敗', '遅延', '自己疑念', '敗北', '傲慢'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '28', no: 28, code: 'seven_wands', name: 'ワンドの7', type: 'minor', number: 7, suit: 'wands', element: 'fire', uprightKeywords: ['防御', '挑戦', '忍耐', '勇気', '決意'], reversedKeywords: ['圧倒', '降伏', '疲労', '妥協', '脆弱'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '29', no: 29, code: 'eight_wands', name: 'ワンドの8', type: 'minor', number: 8, suit: 'wands', element: 'fire', uprightKeywords: ['迅速', '動き', '進展', '旅', 'スピード'], reversedKeywords: ['遅延', '挫折', '停滞', '混乱', '急ぎすぎ'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '30', no: 30, code: 'nine_wands', name: 'ワンドの9', type: 'minor', number: 9, suit: 'wands', element: 'fire', uprightKeywords: ['回復力', '勇気', '忍耐', '境界', '防衛'], reversedKeywords: ['疲労', '限界', '抵抗', '疑念', '降伏'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '31', no: 31, code: 'ten_wands', name: 'ワンドの10', type: 'minor', number: 10, suit: 'wands', element: 'fire', uprightKeywords: ['負担', '責任', '圧迫', '義務', '達成'], reversedKeywords: ['解放', '委任', '責任放棄', '崩壊', '燃え尽き'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '32', no: 32, code: 'page_wands', name: 'ワンドのペイジ', type: 'minor', number: 11, suit: 'wands', element: 'fire', uprightKeywords: ['探求', '冒険', '発見', '自由', '熱意'], reversedKeywords: ['不安', '無計画', '欠如', '制限', '悪い知らせ'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '33', no: 33, code: 'knight_wands', name: 'ワンドのナイト', type: 'minor', number: 12, suit: 'wands', element: 'fire', uprightKeywords: ['情熱', '衝動', '冒険', 'エネルギー', '魅力'], reversedKeywords: ['無謀', '衝動的', '遅延', '挫折', '怒り'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '34', no: 34, code: 'queen_wands', name: 'ワンドのクイーン', type: 'minor', number: 13, suit: 'wands', element: 'fire', uprightKeywords: ['自信', '決意', '独立', '社交性', '活力'], reversedKeywords: ['嫉妬', '不安', '利己的', '攻撃的', '復讐'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '35', no: 35, code: 'king_wands', name: 'ワンドのキング', type: 'minor', number: 14, suit: 'wands', element: 'fire', uprightKeywords: ['リーダーシップ', 'ビジョン', '起業家精神', '名誉', '大胆'], reversedKeywords: ['独裁', '専制', '攻撃性', '無慈悲', '暴君'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },

  // === 小アルカナ カップ 14枚 ===
  { id: '36', no: 36, code: 'ace_cups', name: 'カップのエース', type: 'minor', number: 1, suit: 'cups', element: 'water', uprightKeywords: ['愛', '感情', '直感', '親密さ', '思いやり'], reversedKeywords: ['感情的閉塞', '抑圧', '冷淡', '空虚', '悲しみ'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '37', no: 37, code: 'two_cups', name: 'カップの2', type: 'minor', number: 2, suit: 'cups', element: 'water', uprightKeywords: ['パートナーシップ', '調和', '結合', '愛', '統一'], reversedKeywords: ['不調和', '不均衡', '緊張', '分離', '誤解'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '38', no: 38, code: 'three_cups', name: 'カップの3', type: 'minor', number: 3, suit: 'cups', element: 'water', uprightKeywords: ['祝福', '友情', '創造性', 'コミュニティ', '喜び'], reversedKeywords: ['孤立', '過剰', '喪失', '孤独', '無駄'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '39', no: 39, code: 'four_cups', name: 'カップの4', type: 'minor', number: 4, suit: 'cups', element: 'water', uprightKeywords: ['瞑想', '熟考', '無関心', '再評価', '退屈'], reversedKeywords: ['覚醒', '機会', '動機', '新たな目標', '受容'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '40', no: 40, code: 'five_cups', name: 'カップの5', type: 'minor', number: 5, suit: 'cups', element: 'water', uprightKeywords: ['喪失', '後悔', '失望', '悲しみ', '悲嘆'], reversedKeywords: ['受容', '前進', '許し', '回復', '希望'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '41', no: 41, code: 'six_cups', name: 'カップの6', type: 'minor', number: 6, suit: 'cups', element: 'water', uprightKeywords: ['懐かしさ', '思い出', '無垢', '喜び', '再会'], reversedKeywords: ['過去への執着', '幻想', '未来への移行', '現実直視', '成長'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '42', no: 42, code: 'seven_cups', name: 'カップの7', type: 'minor', number: 7, suit: 'cups', element: 'water', uprightKeywords: ['幻想', '選択', '願望', '想像', '迷い'], reversedKeywords: ['明確さ', '現実', '決断', '目的', '真実'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '43', no: 43, code: 'eight_cups', name: 'カップの8', type: 'minor', number: 8, suit: 'cups', element: 'water', uprightKeywords: ['離脱', '放棄', '探求', '撤退', '失望'], reversedKeywords: ['復帰', '新たな関心', '受容', '楽しみ', '希望'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '44', no: 44, code: 'nine_cups', name: 'カップの9', type: 'minor', number: 9, suit: 'cups', element: 'water', uprightKeywords: ['満足', '願いの成就', '幸福', '喜び', '達成'], reversedKeywords: ['不満', '強欲', '失望', '傲慢', '物質主義'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '45', no: 45, code: 'ten_cups', name: 'カップの10', type: 'minor', number: 10, suit: 'cups', element: 'water', uprightKeywords: ['調和', '幸福', '家族', '愛', '満足'], reversedKeywords: ['不調和', '崩壊', '対立', '価値観の相違', '分離'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '46', no: 46, code: 'page_cups', name: 'カップのペイジ', type: 'minor', number: 11, suit: 'cups', element: 'water', uprightKeywords: ['直感', '創造性', '好奇心', '可能性', 'メッセージ'], reversedKeywords: ['感情的未熟', '不安定', '創造性の欠如', '不誠実', '悪い知らせ'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '47', no: 47, code: 'knight_cups', name: 'カップのナイト', type: 'minor', number: 12, suit: 'cups', element: 'water', uprightKeywords: ['ロマンス', '魅力', '想像力', '感情', '理想主義'], reversedKeywords: ['気まぐれ', '非現実的', '嫉妬', '気分屋', '失望'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '48', no: 48, code: 'queen_cups', name: 'カップのクイーン', type: 'minor', number: 13, suit: 'cups', element: 'water', uprightKeywords: ['思いやり', '愛情', '直感', '癒し', '感受性'], reversedKeywords: ['感情的依存', '不安定', '自己中心', '嫉妬', '操作'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '49', no: 49, code: 'king_cups', name: 'カップのキング', type: 'minor', number: 14, suit: 'cups', element: 'water', uprightKeywords: ['感情的バランス', '思いやり', '外交', '寛容', '支援'], reversedKeywords: ['感情操作', '気分屋', '不誠実', '冷淡', '抑圧'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },

  // === 小アルカナ ソード 14枚 ===
  { id: '50', no: 50, code: 'ace_swords', name: 'ソードのエース', type: 'minor', number: 1, suit: 'swords', element: 'air', uprightKeywords: ['明晰', '正義', '真実', '突破', '新アイデア'], reversedKeywords: ['混乱', '不正', '欺瞞', '敵意', '暴力'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '51', no: 51, code: 'two_swords', name: 'ソードの2', type: 'minor', number: 2, suit: 'swords', element: 'air', uprightKeywords: ['難しい選択', '膠着', '回避', '優柔不断', '真実'], reversedKeywords: ['決断', '混乱の解消', '情報過多', '偽りの平和', '不決断'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '52', no: 52, code: 'three_swords', name: 'ソードの3', type: 'minor', number: 3, suit: 'swords', element: 'air', uprightKeywords: ['悲しみ', '痛み', '別れ', '喪失', '悲嘆'], reversedKeywords: ['回復', '許し', '前進', '受容', '楽観'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '53', no: 53, code: 'four_swords', name: 'ソードの4', type: 'minor', number: 4, suit: 'swords', element: 'air', uprightKeywords: ['休息', '瞑想', '回復', '熟考', '再生'], reversedKeywords: ['燃え尽き', '疲労', '復活', '行動への準備', '不安'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '54', no: 54, code: 'five_swords', name: 'ソードの5', type: 'minor', number: 5, suit: 'swords', element: 'air', uprightKeywords: ['対立', '敗北', '不名誉', '喪失', '裏切り'], reversedKeywords: ['和解', '許し', '前進', '過去を手放す', '解決'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '55', no: 55, code: 'six_swords', name: 'ソードの6', type: 'minor', number: 6, suit: 'swords', element: 'air', uprightKeywords: ['移行', '変化', '旅', '脱出', '癒し'], reversedKeywords: ['抵抗', '停滞', '困難な移行', '延期', '未解決'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '56', no: 56, code: 'seven_swords', name: 'ソードの7', type: 'minor', number: 7, suit: 'swords', element: 'air', uprightKeywords: ['欺瞞', '裏切り', '戦略', '回避', '秘密'], reversedKeywords: ['良心', '誠実', '再考', '真実の露呈', '悔恨'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '57', no: 57, code: 'eight_swords', name: 'ソードの8', type: 'minor', number: 8, suit: 'swords', element: 'air', uprightKeywords: ['制限', '束縛', '犠牲者意識', '無力', '閉塞'], reversedKeywords: ['解放', '自由', '新視点', '力の取り戻し', '自己制限'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '58', no: 58, code: 'nine_swords', name: 'ソードの9', type: 'minor', number: 9, suit: 'swords', element: 'air', uprightKeywords: ['不安', '悪夢', '恐怖', '罪悪感', '後悔'], reversedKeywords: ['回復', '希望', '真実の直視', '解放', '受容'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '59', no: 59, code: 'ten_swords', name: 'ソードの10', type: 'minor', number: 10, suit: 'swords', element: 'air', uprightKeywords: ['終わり', '喪失', '崩壊', '裏切り', '痛み'], reversedKeywords: ['回復', '再生', '抵抗', '回避', '恐怖'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '60', no: 60, code: 'page_swords', name: 'ソードのペイジ', type: 'minor', number: 11, suit: 'swords', element: 'air', uprightKeywords: ['好奇心', '警戒', '監視', '真実探求', '新アイデア'], reversedKeywords: ['秘密', 'スパイ', '欺瞞', '悪い知らせ', '復讐'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '61', no: 61, code: 'knight_swords', name: 'ソードのナイト', type: 'minor', number: 12, suit: 'swords', element: 'air', uprightKeywords: ['行動', '衝動', '野心', '防御', '変化'], reversedKeywords: ['無謀', '攻撃性', '暴力', '無計画', '衝動性'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '62', no: 62, code: 'queen_swords', name: 'ソードのクイーン', type: 'minor', number: 13, suit: 'swords', element: 'air', uprightKeywords: ['知性', '独立', '公正', '明晰', '真実'], reversedKeywords: ['冷淡', '残酷', '批判的', '操作', '苦悩'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '63', no: 63, code: 'king_swords', name: 'ソードのキング', type: 'minor', number: 14, suit: 'swords', element: 'air', uprightKeywords: ['権威', '真実', '知性', '明晰', '論理'], reversedKeywords: ['独裁', '操作', '虐待', '冷淡', '無慈悲'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },

  // === 小アルカナ ペンタクルス 14枚 ===
  { id: '64', no: 64, code: 'ace_pentacles', name: 'ペンタクルスのエース', type: 'minor', number: 1, suit: 'pentacles', element: 'earth', uprightKeywords: ['機会', '繁栄', '新しい事業', '顕現', '豊かさ'], reversedKeywords: ['機会喪失', '欠如', '遅延', '貪欲', '物質主義'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '65', no: 65, code: 'two_pentacles', name: 'ペンタクルスの2', type: 'minor', number: 2, suit: 'pentacles', element: 'earth', uprightKeywords: ['バランス', '適応', '時間管理', '優先順位', '柔軟性'], reversedKeywords: ['不均衡', '過負荷', '混乱', '優先順位の誤り', 'ストレス'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '66', no: 66, code: 'three_pentacles', name: 'ペンタクルスの3', type: 'minor', number: 3, suit: 'pentacles', element: 'earth', uprightKeywords: ['協力', 'チームワーク', '学習', '実装', '計画'], reversedKeywords: ['不調和', '競争', '意見の相違', '欠陥', '未熟'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '67', no: 67, code: 'four_pentacles', name: 'ペンタクルスの4', type: 'minor', number: 4, suit: 'pentacles', element: 'earth', uprightKeywords: ['安全', '保護', '貯蓄', '所有', '制御'], reversedKeywords: ['強欲', '物質主義', '執着', '所有欲', '不安'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '68', no: 68, code: 'five_pentacles', name: 'ペンタクルスの5', type: 'minor', number: 5, suit: 'pentacles', element: 'earth', uprightKeywords: ['困窮', '不安', '喪失', '孤立', '心配'], reversedKeywords: ['回復', '改善', '助け', '希望', '安定'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '69', no: 69, code: 'six_pentacles', name: 'ペンタクルスの6', type: 'minor', number: 6, suit: 'pentacles', element: 'earth', uprightKeywords: ['寛大さ', '慈善', '共有', '公正', 'バランス'], reversedKeywords: ['負債', '利己主義', '不公平', '依存', '一方的'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '70', no: 70, code: 'seven_pentacles', name: 'ペンタクルスの7', type: 'minor', number: 7, suit: 'pentacles', element: 'earth', uprightKeywords: ['評価', '忍耐', '投資', '報酬', '進歩'], reversedKeywords: ['不満', '焦り', '遅延', '欲求不満', '方向性喪失'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '71', no: 71, code: 'eight_pentacles', name: 'ペンタクルスの8', type: 'minor', number: 8, suit: 'pentacles', element: 'earth', uprightKeywords: ['熟練', '献身', '詳細', '品質', '勤勉'], reversedKeywords: ['手抜き', '完璧主義', '退屈', '未熟', '学習不足'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '72', no: 72, code: 'nine_pentacles', name: 'ペンタクルスの9', type: 'minor', number: 9, suit: 'pentacles', element: 'earth', uprightKeywords: ['豊かさ', '贅沢', '自己充足', '成功', '独立'], reversedKeywords: ['過剰', '物質主義', '浪費', '欠如', '孤独'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '73', no: 73, code: 'ten_pentacles', name: 'ペンタクルスの10', type: 'minor', number: 10, suit: 'pentacles', element: 'earth', uprightKeywords: ['富', '遺産', '家族', '安定', '確立'], reversedKeywords: ['金融喪失', '不安定', '負債', '離散', '破産'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '74', no: 74, code: 'page_pentacles', name: 'ペンタクルスのペイジ', type: 'minor', number: 11, suit: 'pentacles', element: 'earth', uprightKeywords: ['顕現', '機会', '学習', '新事業', '野心'], reversedKeywords: ['欠如', '怠慢', '非現実的', '悪い知らせ', '遅延'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '75', no: 75, code: 'knight_pentacles', name: 'ペンタクルスのナイト', type: 'minor', number: 12, suit: 'pentacles', element: 'earth', uprightKeywords: ['効率', '責任', 'ルーチン', '保守主義', '献身'], reversedKeywords: ['怠惰', '無責任', '完璧主義', '退屈', '執着'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '76', no: 76, code: 'queen_pentacles', name: 'ペンタクルスのクイーン', type: 'minor', number: 13, suit: 'pentacles', element: 'earth', uprightKeywords: ['養育', '実用性', '快適さ', '財務安定', '豊かさ'], reversedKeywords: ['自己中心', '嫉妬', '不安', '物質主義', '過保護'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },
  { id: '77', no: 77, code: 'king_pentacles', name: 'ペンタクルスのキング', type: 'minor', number: 14, suit: 'pentacles', element: 'earth', uprightKeywords: ['豊かさ', '安全', 'リーダーシップ', '実用性', '成功'], reversedKeywords: ['強欲', '物質主義', '腐敗', '独裁', '賄賂'], promptContext: '', deckId: '', createdAt: new Date(), updatedAt: new Date() },

];

const ReadingPage: React.FC<ReadingPageProps> = ({
  spreadId,
  categoryId,
  onBack,
}) => {
  const { data: masterData, isLoading: masterLoading } = useMaster();

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "こんにちは。私はClaudia、あなたの運命を読み解く占い師です。今日はどのようなことを占いましょうか?",
      isTyping: false,
    },
    {
      role: "user",
      content: "最近、仕事で悩んでいます。転職すべきか迷っています。",
      isTyping: false,
    },
    {
      role: "assistant",
      content:
        "お仕事のことでお悩みなのですね。カードがあなたの状況を教えてくれます。現在のあなたには「愚者」のカードが出ています。これは新しい始まりと可能性を示しています。",
      isTyping: false,
    },
    {
      role: "user",
      content: "新しい始まり...確かに変化が必要な気がしています。",
      isTyping: false,
    },
    {
      role: "assistant",
      content:
        "そうですね。課題として「魔術師」が横向きに現れています。これは現在のスキルをどう活用するかが鍵となることを示しています。転職する・しないよりも、あなた自身の能力をどう発揮するかが重要なポイントです。",
      isTyping: false,
    },
    {
      role: "user",
      content: "なるほど...もう少し詳しく教えてください。",
      isTyping: false,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [crossFlipped, setCrossFlipped] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardPlacement | null>(null);
  const [typingMessage, setTypingMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [drawnCards, setDrawnCards] = useState<CardPlacement[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };
  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  // カードをランダムに引く関数
  const drawRandomCards = (
    allCards: TarotCard[],
    spreadCells: any[],
    count: number
  ): CardPlacement[] => {
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return spreadCells.map((cell, index) => {
      const card = selected[index];
      const isReversed = Math.random() > 0.5;
      
      return {
        id: `${card.id}-${index}`,
        number: (cell.vOrder || cell.hOrder || index) ,
        gridX: cell.x,
        gridY: cell.y,
        rotation: cell.hLabel ? 90 : 0,
        card,
        isReversed,
        position: cell.vLabel || cell.hLabel || `位置${index + 1}`,
        description: `${cell.vLabel || cell.hLabel}の意味を示します`,
      };
    });
  };

  // カード画像パスを生成
  const getCardImagePath = (card: TarotCard): string => {
    return `/cards/${card.code}.png`;
  };

  // 画像存在キャッシュ
  const [imageCache, setImageCache] = useState<{ [key: string]: boolean }>({});

  // 画像の存在確認を初回のみ実施
  useEffect(() => {
    if (!drawnCards.length) return;
    drawnCards.forEach((placement) => {
      const path = `/cards/${placement.card.code}.png`;
      if (imageCache[path] === undefined) {
        fetch(path, { method: 'HEAD', cache: 'force-cache' })
          .then((res) => {
            setImageCache((prev) => ({ ...prev, [path]: res.ok }));
          })
          .catch(() => {
            setImageCache((prev) => ({ ...prev, [path]: false }));
          });
      }
    });
    // eslint-disable-next-line
  }, [drawnCards]);

  // ローディング中
  if (masterLoading || !masterData) {
    return (
      <div className="main-container">
        <div className="text-center py-20">読み込み中...</div>
      </div>
    );
  }

  const selectedSpread = masterData.spreads?.find((s) => s.id === spreadId);
  const selectedCategory = masterData.categories?.find(
    (c) => c.id === categoryId
  );

  // MasterDataからカード情報を取得（decks[0].cards）、なければTEMP_CARDSを使用
  const availableCards = masterData.decks?.[0]?.cards || TEMP_CARDS;

  // カードを引く（初回のみ）
  useEffect(() => {
    if (availableCards && selectedSpread?.cells && drawnCards.length === 0) {
      const cards = drawRandomCards(
        availableCards,
        selectedSpread.cells,
        selectedSpread.cells.length
      );
      setDrawnCards(cards);
    }
  }, [availableCards, selectedSpread, drawnCards.length]);

  const chatHeight = "calc(100vh - 56px - 70px - 40px - 332px - 20px)";

  useEffect(() => {
    const interval = setInterval(() => {
      setCrossFlipped((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingMessage]);

  const gridCols = drawnCards.length > 0 
    ? Math.max(...drawnCards.map((c) => c.gridX)) + 1 
    : 4;
  const gridRows = drawnCards.length > 0
    ? Math.max(...drawnCards.map((c) => c.gridY)) + 1
    : 4;

  const cardSize = 60;
  const colGap = 6;
  const rowGap = 12;
  const visibleCols = 4;
  const visibleRows = 4;
  const visibleAreaWidth = cardSize * visibleCols + colGap * (visibleCols + 1);
  const visibleAreaHeight = cardSize * visibleRows + rowGap * (visibleRows + 1);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages([
        ...messages,
        {
          role: "user",
          content: inputValue,
          isTyping: false,
        },
      ]);
      setInputValue("");

      const responseText =
        "カードが示しています...素晴らしいエネルギーを感じます。あなたの直感に従うことが大切です。";
      setIsTyping(true);
      setTypingMessage("");

      let index = 0;
      const typingInterval = setInterval(() => {
        if (index < responseText.length) {
          setTypingMessage(responseText.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: responseText,
              isTyping: false,
            },
          ]);
          setTypingMessage("");
        }
      }, 30);
    }
  };

  const getZIndex = (cardNumber: number) => {
    const crossCards = drawnCards.filter(c => c.rotation === 90 || c.rotation === 0);
    if (crossCards.length >= 2) {
      if (cardNumber === crossCards[0].number) return crossFlipped ? 20 : 10;
      if (cardNumber === crossCards[1].number) return crossFlipped ? 10 : 20;
    }
    return 5;
  };

  // カード画像コンポーネント
  interface TarotCardImageProps {
    placement: CardPlacement;
    width?: number | string;
    height?: number | string;
    className?: string;
  }
  // カード画像の縦横比（実カード 300x523）
  const CARD_ASPECT = 300 / 523; // ≒0.574
  // グリッド内で高さ60pxに収める場合の幅
  const GRID_CARD_HEIGHT = 60;
  const GRID_CARD_WIDTH = Math.round(GRID_CARD_HEIGHT * CARD_ASPECT * 100) / 100; // ≒34.44px
  // ダイアログ用（幅110px基準）
  const DIALOG_CARD_WIDTH = 110;
  const DIALOG_CARD_HEIGHT = Math.round(DIALOG_CARD_WIDTH / CARD_ASPECT * 100) / 100; // ≒191.67px

  const TarotCardImage: React.FC<TarotCardImageProps> = ({ placement, width = `${GRID_CARD_WIDTH}px`, height = `${GRID_CARD_HEIGHT}px`, className = '' }) => {
    const path = getCardImagePath(placement.card);
    const exists = imageCache[path];
    return (
      <div
        className={`relative hover:scale-105 transition-transform cursor-pointer ${className}`}
        style={{ width, height }}
      >
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center z-10">
          {placement.number}
        </div>
        {exists && (
          <img
            src={path}
            alt={placement.card.name}
            className={`w-full h-full object-cover rounded border-2 shadow-md ${
              placement.isReversed 
                ? 'border-red-500 transform rotate-180' 
                : 'border-amber-600'
            }`}
            style={{ aspectRatio: `${CARD_ASPECT}` }}
          />
        )}
        {!exists && (
          <div className="w-full h-full bg-purple-100 rounded border-2 border-amber-600 shadow-md flex flex-col items-center justify-center p-0.5">
            <div className="text-base">{placement.card.type === 'major' ? '🌟' : '🎴'}</div>
            <div className="text-[6px] font-bold text-gray-800 text-center leading-tight">
              {placement.card.name}
            </div>
            {placement.isReversed && (
              <div className="text-[6px] text-red-600">逆位置</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="main-container">
      {!isInputFocused && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 border border-purple-200 shadow-md mb-3">
          <div className="flex gap-2">
            <div
              className="flex-shrink-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2 border border-purple-200"
              style={{
                width: `${visibleAreaWidth}px`,
                height: `${visibleAreaHeight}px`,
                overflowY: gridRows > visibleRows ? "auto" : "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${gridCols}, 60px)`,
                  gridTemplateRows: `repeat(${gridRows}, 60px)`,
                  columnGap: `${colGap}px`,
                  rowGap: `${rowGap}px`,
                }}
              >
                {drawnCards.map((placement) => (
                  <div
                    key={placement.id}
                    style={{
                      gridColumn: placement.gridX + 1,
                      gridRow: placement.gridY + 1,
                      transform: `rotate(${placement.rotation}deg)`,
                      transformOrigin: "center center",
                      zIndex: getZIndex(placement.number),
                      transition: "z-index 0.5s ease-in-out",
                    }}
                    className="flex items-center justify-center"
                  >
                    <div onClick={() => setSelectedCard(placement)} style={{cursor: 'pointer'}}>
                      <TarotCardImage placement={placement} width={`${GRID_CARD_WIDTH}px`} height={`${GRID_CARD_HEIGHT}px`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex-1 bg-white rounded-lg border border-purple-200 flex flex-col"
              style={{ height: `${visibleAreaHeight}px` }}
            >
              <div className="p-1 border-b border-purple-200 flex-shrink-0">
                <div className="text-[9px] font-bold text-purple-900 text-center">
                  位置の意味
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="">
                  {drawnCards.map((placement) => (
                    <button
                      key={placement.id}
                      onClick={() => setSelectedCard(placement)}
                      className="w-full bg-purple-50 hover:bg-purple-100 rounded p-1 border border-purple-200 transition-colors text-left"
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-purple-600 text-white text-[7px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {placement.number}
                        </div>
                        <div className="text-[10px] font-semibold text-purple-900 leading-tight">
                          {placement.position}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-purple-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                {selectedCard.number}
              </div>
              <h3 className="text-base font-bold text-purple-900">
                {selectedCard.position}
              </h3>
            </div>
            {/* タロットカードを表示 */}
            <div className="flex justify-center mb-2">
              <TarotCardImage placement={selectedCard} width={`${DIALOG_CARD_WIDTH}px`} height={`${DIALOG_CARD_HEIGHT}px`} />
            </div>
            <div className="text-sm text-gray-700 mb-2">
              カード: <span className="font-semibold">{selectedCard.card.name}</span>
              {selectedCard.isReversed && (
                <span className="text-red-600 ml-2">(逆位置)</span>
              )}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              キーワード: {selectedCard.isReversed 
                ? selectedCard.card.reversedKeywords.join('、')
                : selectedCard.card.uprightKeywords.join('、')}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {selectedCard.description}
            </p>
            <button
              onClick={() => setSelectedCard(null)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-medium transition-colors text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <div
        className="bg-white/90 backdrop-blur-sm rounded-xl border border-purple-200 shadow-md flex flex-col"
        style={{ height: chatHeight }}
      >
        <div className="p-2 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm border border-purple-300 shadow-sm">
              👸
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-xs">Claudia</h3>
              <p className="text-[9px] text-gray-500">タロット占い師</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
          {messages.map((message, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-shrink-0">
                {message.role === "assistant" ? (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs border border-purple-300">
                    👸
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-xs border border-blue-300">
                    👤
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-800 leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs border border-purple-300">
                  👸
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-800 leading-relaxed">
                  {typingMessage}
                  <span className="animate-pulse">▊</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-2 border-gray-200 flex-shrink-0">
          <div className="flex gap-1.5 items-end">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="メッセージを入力..."
              rows={2}
              className="flex-1 resize-none bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-transparent shadow-lg p-4 focus:shadow-xl"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:opacity-50 text-white rounded-lg p-1.5 transition-colors flex-shrink-0"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingPage;