// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files (example for English and Spanish)
// These files will be created in the next steps.
// For now, we'll assume they exist to avoid import errors during setup.
// We will create them with placeholder content or the content from the plan.
import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import de from './locales/de/translation.json';
import cn from './locales/cn/translation.json';
import rus from './locales/rus/translation.json';

const resources = {
  en: {
    translation: en,
  },
  es: {
    translation: es,
  },
  de: {
    translation: de,
  },
  cn: {
    translation: cn,
  },
  rus: {
    translation: rus,
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Fallback language if user language is not available
    debug: true, // Set to false in production

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Options for LanguageDetector
    detection: {
      order: ['navigator', 'localStorage', 'cookie'],
      caches: ['localStorage'],
    },
  });

export default i18n;
