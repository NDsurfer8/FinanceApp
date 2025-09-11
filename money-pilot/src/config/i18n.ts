import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

// Import only English initially for faster startup
import en from "../locales/en.json";

// Lazy load other languages
const loadLanguage = async (language: string) => {
  switch (language) {
    case "es":
      return (await import("../locales/es.json")).default;
    case "zh":
      return (await import("../locales/zh.json")).default;
    case "hi":
      return (await import("../locales/hi.json")).default;
    case "ar":
      return (await import("../locales/ar.json")).default;
    case "pt":
      return (await import("../locales/pt.json")).default;
    case "ru":
      return (await import("../locales/ru.json")).default;
    case "ja":
      return (await import("../locales/ja.json")).default;
    case "fr":
      return (await import("../locales/fr.json")).default;
    case "de":
      return (await import("../locales/de.json")).default;
    default:
      return en;
  }
};

// Initial resources with only English
const resources = {
  en: { translation: en },
};

// Get device language
const getDeviceLanguage = () => {
  try {
    const locale = Localization.getLocales()[0]?.languageCode;
    if (locale) {
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
      return supportedLanguages.includes(locale) ? locale : "en";
    }
  } catch (error) {
    console.error("Error getting device language:", error);
  }
  return "en";
};

// Only initialize if not already initialized
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en", // Start with English for faster startup
    fallbackLng: "en",
    debug: __DEV__,

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    react: {
      useSuspense: false,
    },
  });

  // Load device language asynchronously after initialization
  const deviceLanguage = getDeviceLanguage();
  if (deviceLanguage !== "en") {
    loadLanguage(deviceLanguage)
      .then((translations) => {
        i18n.addResourceBundle(deviceLanguage, "translation", translations);
        i18n.changeLanguage(deviceLanguage);
      })
      .catch((error) => {
        console.error("Failed to load device language:", error);
      });
  }
}

// Export function to load language on demand
export const loadLanguageOnDemand = async (language: string) => {
  if (!i18n.hasResourceBundle(language, "translation")) {
    try {
      const translations = await loadLanguage(language);
      i18n.addResourceBundle(language, "translation", translations);
    } catch (error) {
      console.error(`Failed to load language ${language}:`, error);
    }
  }
};

export default i18n;
