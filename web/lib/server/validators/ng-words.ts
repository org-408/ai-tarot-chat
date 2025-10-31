export const NG_WORD_CATEGORIES = {
  // 医療・健康（専門家への相談が必要）
  medical: {
    patterns: [
      /病気|疾患|症状|診断|治療|手術|入院|癌|がん|腫瘍/,
      /薬|処方|服用|投薬|副作用|飲み合わせ/,
      /うつ病|統合失調症|双極性障害|パニック障害|PTSD/,
      /医者|医師|病院|クリニック|診察|検査結果/,
      /妊娠|出産|流産|不妊治療|中絶/,
      /アレルギー|アトピー|喘息|糖尿病|高血圧/,
    ],
    message:
      "医療や健康に関するご相談は、専門の医師にご相談ください。タロットでは別のお悩みを占うことができます。",
  },

  // 法律（弁護士への相談が必要）
  legal: {
    patterns: [
      /訴訟|裁判|弁護士|法律相談|示談|和解/,
      /逮捕|警察|犯罪|違法|合法|起訴|告訴/,
      /離婚|親権|養育費|慰謝料|財産分与/,
      /相続|遺産|遺言|贈与税|相続税/,
      /契約|違約|債務|借金|破産|自己破産/,
      /労働|解雇|残業|未払い|パワハラ|セクハラ/,
    ],
    message:
      "法的なご相談は、弁護士などの専門家にご相談ください。人間関係や決断のヒントなら占うことができます。",
  },

  // 投資・ギャンブル（射幸心を煽らない）
  gambling: {
    patterns: [
      /株|FX|仮想通貨|ビットコイン|投資|資産運用/,
      /競馬|競輪|競艇|パチンコ|スロット|カジノ/,
      /宝くじ|ロト|toto|ナンバーズ|スクラッチ/,
      /ギャンブル|賭け|賭博|当たる|儲かる|稼げる/,
      /必勝法|攻略法|勝率|期待値/,
    ],
    message:
      "投資やギャンブルの予測はできません。お金との向き合い方や仕事運なら占うことができます。",
  },

  // 試験・合否（結果を保証できない）
  examResults: {
    patterns: [
      /試験.*合格|合格.*できる|受かる.*試験/,
      /入試|受験|入学.*できる/,
      /資格.*取れる|取得.*できる/,
      /就職.*できる|内定.*もらえる/,
      /当選.*する|選ばれる.*選挙/,
    ],
    message:
      "合否や結果の予測はできません。試験への取り組み方や心構えなら占うことができます。",
  },

  // 生死・寿命（非常にセンシティブ）
  lifeAndDeath: {
    patterns: [
      /いつ死ぬ|死ぬ時期|寿命|余命/,
      /あと何年|何歳まで生きる/,
      /死期|死ぬ日|命日/,
      /生まれ変わ|前世|来世/,
    ],
    message:
      "生死や寿命に関することは占えません。人生の過ごし方や大切にしたいことなら占うことができます。",
  },

  // 犯罪関連（OpenAIと重複するかもだけど念のため）
  crime: {
    patterns: [
      /盗む|万引き|窃盗|強盗/,
      /詐欺|騙す|脱税|横領/,
      /ストーカー|つきまと|尾行/,
      /復讐|仕返し|報復|制裁/,
      /浮気.*バレない|不倫.*隠す|証拠.*隠/,
    ],
    message: "申し訳ございません。その内容は占うことができません。",
  },

  // 他者への危害
  harmToOthers: {
    patterns: [
      /別れさせ|離婚させ|破局させ/,
      /呪|のろ|祟|たた|黒魔術/,
      /嫌がらせ|いじめ|陥れ/,
      /操る|支配|洗脳|コントロール/,
    ],
    message:
      "タロットは人を傷つけたり操ったりするものではありません。あなた自身の幸せについて占いましょう。",
  },

  // 第三者の詳細情報（プライバシー侵害的）
  thirdPartyPrivacy: {
    patterns: [
      /[あの人|彼|彼女|上司|同僚].*浮気|不倫.*相手/,
      /誰と付き合っ|誰と結婚/,
      /本当は.*好き|実は.*嫌い/,
      /隠れて.*何を|秘密.*何/,
    ],
    message:
      "他の方の詳しい個人情報や秘密は占えません。あなたとその方の関係性なら占うことができます。",
  },

  // 宗教勧誘・マルチ商法（アプリの信頼性保護）
  religiousOrMLM: {
    patterns: [
      /入信|改宗|勧誘|布教/,
      /マルチ|ネットワークビジネス|MLM/,
      /セミナー.*儲かる|情報商材/,
      /霊感商法|開運商法|除霊/,
    ],
    message: "申し訳ございません。その内容は占うことができません。",
  },
} as const;

export interface NgWordCheckResult {
  isAllowed: boolean;
  category?: keyof typeof NG_WORD_CATEGORIES;
  message?: string;
}

export function checkNgWords(question: string): NgWordCheckResult {
  const normalized = question.toLowerCase().trim();

  for (const [category, config] of Object.entries(NG_WORD_CATEGORIES)) {
    for (const pattern of config.patterns) {
      if (pattern.test(normalized)) {
        return {
          isAllowed: false,
          category: category as keyof typeof NG_WORD_CATEGORIES,
          message: config.message,
        };
      }
    }
  }

  return { isAllowed: true };
}

// より柔軟なチェック（警告レベル）
export const WARNING_PATTERNS = {
  // OpenAIに任せる系（こちらでは警告のみ）
  vague: {
    patterns: [
      /^.{1,4}$/, // 短すぎる
      /ｗｗｗ|笑|草/, // ふざけた感じ
      /テスト|test|てすと/,
    ],
    message: "もう少し具体的に教えていただけますか？",
  },

  tooSpecific: {
    patterns: [
      /\d{4}年\d{1,2}月\d{1,2}日/, // 具体的すぎる日付
      /\d+時\d+分/, // 具体的な時刻
      /[0-9]{3}-[0-9]{4}-[0-9]{4}/, // 電話番号
    ],
    message: "具体的な日時や数字より、お気持ちや状況を教えてください。",
  },
};

export function checkWarnings(question: string): string | null {
  const normalized = question.toLowerCase().trim();

  for (const config of Object.values(WARNING_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(normalized)) {
        return config.message;
      }
    }
  }

  return null;
}
