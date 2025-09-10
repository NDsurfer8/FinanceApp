import { useTranslation as useI18nTranslation } from "react-i18next";

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  return {
    t,
    i18n,
    // Helper function for common translations
    translate: (key: string, options?: any) => t(key, options),
  };
};
