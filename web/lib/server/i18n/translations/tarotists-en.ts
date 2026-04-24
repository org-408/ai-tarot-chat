/**
 * Phase 2.1 — Tarotist の英語翻訳 (title / trait / bio)。
 * キー: Tarotist.name (言語非依存)
 *
 * Apple 4.3(b) 対応:
 *   - NG ワード (fortune / fortune-telling / predict / horoscope /
 *     destiny / fate / zodiac) を含まない
 *   - 「占い師」は "tarot reader" とする
 *   - トーンは "reflection / guidance / insight"
 */

export type TarotistEn = {
  title: string;
  trait: string;
  bio: string;
};

export const TAROTIST_EN: Record<string, TarotistEn> = {
  Lily: {
    title: "Aspiring tarot reader",
    trait: "Energetic, concise, friendly",
    bio: "An upbeat tarot reader! I'm best at sharing simple, easy-to-follow reflections. 'Let's take a quick look together!' is my catchphrase. Beginners are very welcome — I'm here to keep the conversation light and encouraging.",
  },
  Luna: {
    title: "Mystical tarot reader",
    trait: "Mystical, intuitive, spiritual",
    bio: "A mystical tarot reader named after the moon goddess. I sense subtle currents of energy and offer reflections through a spiritual lens. 'The stars seem to be whispering something for you,' I like to say with a gentle smile. A calming, contemplative presence.",
  },
  Stella: {
    title: "Radiant tarot reader",
    trait: "Insightful, analytical, thoughtful",
    bio: "A clear-minded tarot reader with a sharp intellect. I untangle the complex threads of any question with deep thought and keen insight. 'A path forward is beginning to take shape,' I will tell you with quiet confidence. I'm known for thorough, layered readings.",
  },
  Celine: {
    title: "Wise tarot reader",
    trait: "Wise, empathetic, nurturing",
    bio: "A wise tarot reader with deep knowledge and warm empathy. I stay close to your heart while offering grounded, thoughtful guidance. 'I truly understand how you're feeling,' I'll say softly — a mature, embracing kindness.",
  },
  Gloria: {
    title: "Modern tarot reader",
    trait: "Friendly, humorous, down-to-earth",
    bio: "A friendly, down-to-earth tarot reader. I offer steady guidance you can count on. 'Let's think it through together!' is my style — approachable and dependable, I can help with a wide range of questions.",
  },
  Sophia: {
    title: "All-rounder tarot reader",
    trait: "Versatile, brilliant, refined",
    bio: "A gifted tarot reader with PhD-level intellect. I respond with precision thanks to advanced reasoning. 'Let me think this through carefully,' I'll say confidently. I'm known for handling complex matters with care and clarity.",
  },
  Ariadne: {
    title: "Master tarot reader",
    trait: "Warm, empathetic, poetic, guiding",
    bio: "A veteran tarot reader of the highest caliber. With deep empathy and rich expression, I stay close to your heart. 'Your feelings are clearly reflected here,' I'll say, wrapping you in a gentle warmth. I'm fluent across every topic.",
  },
  Clara: {
    title: "Apprentice tarot reader",
    trait: "Sweet, eager, bookish",
    bio: "I'm still an apprentice, but I read my tarot books carefully and do my very best. I'll share thoughtful meanings around love, work, finances, and wellness. <br><strong>Available while you're offline</strong>📖",
  },
};

export function getTarotistEn(name: string | null | undefined): TarotistEn | null {
  if (!name) return null;
  return TAROTIST_EN[name] ?? null;
}
