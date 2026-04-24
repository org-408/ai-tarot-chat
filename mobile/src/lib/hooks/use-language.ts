import { Device } from "@capacitor/device";
import { Preferences } from "@capacitor/preferences";
import { useEffect, useState } from "react";
import i18n, { SUPPORTED_LANGS, initI18n } from "../../i18n";
import type { SupportedLang } from "../../i18n";

const PREF_KEY = "app-language";

export function useLanguage() {
  const [isReady, setIsReady] = useState(false);
  const [lang, setLangState] = useState<SupportedLang>("ja");

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: PREF_KEY });
      let initial: SupportedLang = "ja";
      if (value && SUPPORTED_LANGS.includes(value as SupportedLang)) {
        initial = value as SupportedLang;
      } else {
        const deviceLang = (await Device.getLanguageCode()).value;
        initial = deviceLang.startsWith("ja") ? "ja" : "en";
      }
      await initI18n(initial);
      setLangState(initial);
      setIsReady(true);
    })();
  }, []);

  const setLang = async (newLang: SupportedLang) => {
    await Preferences.set({ key: PREF_KEY, value: newLang });
    await i18n.changeLanguage(newLang);
    setLangState(newLang);
  };

  return { isReady, lang, setLang };
}
