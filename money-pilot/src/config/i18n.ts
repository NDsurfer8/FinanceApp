import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

// Import translation files
import en from "../locales/en.json";
import es from "../locales/es.json";
import zh from "../locales/zh.json";
import hi from "../locales/hi.json";
import ar from "../locales/ar.json";
import pt from "../locales/pt.json";
import ru from "../locales/ru.json";
import ja from "../locales/ja.json";
import fr from "../locales/fr.json";
import de from "../locales/de.json";

const resources = {
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  hi: { translation: hi },
  ar: { translation: ar },
  pt: { translation: pt },
  ru: { translation: ru },
  ja: { translation: ja },
  fr: { translation: fr },
  de: { translation: de },
};

// Get device language
const getDeviceLanguage = () => {
  const locale = Localization.locale;
  if (locale) {
    // Extract language code from locale (e.g., 'en-US' -> 'en')
    const language = locale.split("-")[0];
    // Map to our supported languages
    const supportedLanguages = [
      "en",
      "es",
      "zh",
      "hi",
      "ar",
      "pt",
      "ru",
      "ja",
      "fr",
      "de",
    ];
    return supportedLanguages.includes(language) ? language : "en";
  }
  return "en";
};

// Only initialize if not already initialized
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: "en",
    debug: __DEV__,

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
