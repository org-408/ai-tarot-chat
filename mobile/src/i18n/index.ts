import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ja from "./ja.json";

export const SUPPORTED_LANGS = ["ja", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export async function initI18n(initialLang: SupportedLang) {
  await i18n.use(initReactI18next).init({
    resources: {
      ja: { translation: ja },
      en: { translation: en },
    },
    lng: initialLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
