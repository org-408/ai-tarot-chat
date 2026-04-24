/**
 * Phase 2.1 — Tarotist ペルソナの英語版。
 *
 * 現在 `Tarotist` テーブルには language カラムがない (段階 2 で追加予定)。
 * それまでのつなぎとして、英語リクエスト時にペルソナを差し替える。
 * キーは `Tarotist.name` (言語非依存)。
 *
 * Apple 4.3(b) 対応として、以下の NG ワードを含まない文言とする:
 *   fortune / fortune-telling / predict / prediction / horoscope /
 *   destiny / fate / zodiac
 *
 * 「占い」という機能は "tarot reading" として、「占い師」は
 * "tarot reader" として表現する。トーンは「reflection / guidance /
 * insight」寄りに調整する。
 */

export type TarotistPersonaEn = {
  title: string;
  trait: string;
  bio: string;
};

const TAROTIST_PERSONAS_EN: Record<string, TarotistPersonaEn> = {
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

export function getEnglishPersona(name: string | undefined | null): TarotistPersonaEn | null {
  if (!name) return null;
  return TAROTIST_PERSONAS_EN[name] ?? null;
}
