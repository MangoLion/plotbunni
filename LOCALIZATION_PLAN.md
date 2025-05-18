# Localization Plan: Implementing react-i18next

This document outlines the steps to integrate `react-i18next` into the Plotbunni project to provide localization (i18n) support.

**Current Status:** The initial setup is complete. `NovelGridView.jsx` has been translated, and a language switcher is implemented and persists the user's choice. The next steps involve translating the remaining components.

## 1. Installation (Completed)

The necessary packages have been installed:
*   `i18next`
*   `react-i18next`
*   `i18next-browser-languagedetector`

```bash
npm install i18next react-i18next i18next-browser-languagedetector --save
# or
yarn add i18next react-i18next i18next-browser-languagedetector
```

## 2. Configuration (Completed)

An i18next configuration file `src/i18n.js` has been created and initialized.

```javascript
// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files (example for English and Spanish)
import en from './locales/en/translation.json';
import es from './locales/es/translation.json';

const resources = {
  en: {
    translation: en,
  },
  es: {
    translation: es,
  },
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
      order: ['navigator', 'localStorage', 'cookie'], // Note: localStorage is now primarily managed by SettingsContext
      caches: ['localStorage'], // LanguageDetector can still cache, but SettingsContext is the source of truth on load
    },
  });

export default i18n;
```

## 3. Create Translation Files (Completed)

Translation files `src/locales/en/translation.json` and `src/locales/es/translation.json` have been created and populated with initial keys, including those for `NovelGridView.jsx`.

```json
// src/locales/en/translation.json (example, actual file contains more keys)
{
  "app_title": "Plotbunni",
  "my_novels_header": "Plot Bunni - My Novels",
  // ... other keys
  "language_switcher_tooltip": "Change language",
  "english_lang": "English",
  "spanish_lang": "Español"
}
```

```json
// src/locales/es/translation.json (example, actual file contains more keys)
{
  "app_title": "Plotbunni",
  "my_novels_header": "Plot Bunni - Mis Novelas",
  // ... other keys
  "language_switcher_tooltip": "Cambiar idioma",
  "english_lang": "Inglés",
  "spanish_lang": "Español"
}
```
Refer to the actual files for the complete list of keys.

## 4. Integrate into the Application (Completed)

The root component `src/main.jsx` has been wrapped with `Suspense` and the i18n configuration has been imported.

```javascript
// src/main.jsx
import React, { StrictMode, Suspense } from 'react'; // Ensure Suspense is imported
import { createRoot } from 'react-dom/client';
import RootApp from './RootApp.jsx';
import './index.css';
import './i18n'; // Import the i18n configuration

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<div>Loading...</div>}> {/* Add Suspense */}
      <RootApp />
    </Suspense>
  </StrictMode>,
);
```

## 5. Use Translations in Components (In Progress)

The `useTranslation` hook is used in components to access the translation function `t`. The following components have been translated:
*   `src/components/novel/NovelGridView.jsx` (initial example)
*   `src/App.jsx`
*   `src/components/ai/AIChatModal.jsx`
*   `src/components/ai/AINovelWriterModal.jsx`
*   `src/components/ai/AISuggestionModal.jsx`
*   `src/components/concept/ConceptCacheList.jsx`
*   `src/components/concept/ConceptFormModal.jsx`
*   `src/components/concept/CreateConceptModal.jsx`
*   `src/components/concept/ManageTemplatesModal.jsx`
*   `src/components/concept/TemplateFormModal.jsx`
*   `src/components/novel/AddNewNovelCard.jsx`
*   `src/components/novel/CreateNovelFormModal.jsx`
*   `src/components/novel/ExportModal.jsx`
*   `src/components/novel/NovelCard.jsx`
*   `src/components/novel/NovelOverviewTab.jsx`
*   `src/components/plan/ActFormModal.jsx`
*   `src/components/plan/ChapterFormModal.jsx`
*   `src/components/plan/ImportOutlineModal.jsx`
*   `src/components/plan/PlanView.jsx`
*   `src/components/plan/SceneFormModal.jsx`
*   `src/components/settings/SettingsView.jsx`
*   `src/components/settings/EndpointProfileFormModal.jsx`
*   `src/components/settings/FontSettingsControl.jsx`
*   `src/components/settings/ThemeEditor.jsx`
*   `src/components/ui/ConfirmModal.jsx`
*   `src/components/write/WriteView.jsx`
*   `src/RootApp.jsx`

```javascript
// Example: src/components/novel/NovelGridView.jsx
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/context/SettingsContext'; // For language persistence
// ... other imports

function NovelGridView() {
  const { t } = useTranslation(); // i18n instance also available if needed: const { t, i18n } = useTranslation();
  const { language: currentLanguage, setLanguage } = useSettings(); // Get current language and setter
  // ... component logic

  const changeLanguage = (lng) => {
    setLanguage(lng); // Uses context to change language and persist
  };

  return (
    // ... JSX
    <h1>{t('app_title')}</h1>
    // ...
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="ml-2" title={t('language_switcher_tooltip')}>
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')} disabled={currentLanguage === 'en'}>
          {t('english_lang')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('es')} disabled={currentLanguage === 'es'}>
          {t('spanish_lang')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    // ... JSX
  );
}

export default NovelGridView;
```
The task is to continue replacing hardcoded strings in other components throughout the application with calls to `t('your_translation_key')`.

## 6. Language Switching UI (Completed for NovelGridView)

A language switching mechanism (a dropdown menu) has been added to the header of `src/components/novel/NovelGridView.jsx`. This UI uses the `setLanguage` function from `SettingsContext` to change and persist the language.

## 7. Persistence of Language Choice (Completed)

The `src/context/SettingsContext.jsx` has been updated to manage and persist the user's selected language in `localStorage`.

Key changes in `SettingsContext.jsx`:
*   Added `language` state, defaulting to `'en'`.
*   `loadSettings` now loads the `language` from `localStorage`.
*   `saveSettings` now saves the `language` to `localStorage`.
*   A `setLanguage(langCode)` function is provided by the context. This function updates the internal state, saves to `localStorage`, and calls `i18n.changeLanguage(langCode)`.
*   The `i18n` instance is imported and its language is synchronized with the loaded setting on initial mount.

Components should use `const { language, setLanguage } = useSettings();` to interact with the persisted language setting.

## 8. Next Steps: Translate Remaining Components

*   **Identify hardcoded strings:** Go through all other components (e.g., in `src/components/`, `src/App.jsx`, etc.) and identify any text that needs to be translated.
*   **Add translation keys:** For each identified string, add a corresponding key to both `src/locales/en/translation.json` and `src/locales/es/translation.json` with the appropriate translations.
*   **Implement `useTranslation`:** In each component that needs translation:
    *   Import the `useTranslation` hook: `import { useTranslation } from 'react-i18next';`
    *   Initialize it: `const { t } = useTranslation();`
    *   Replace hardcoded strings with `t('your_key')`. For strings with dynamic values, use interpolation: `t('your_key_with_variable', { variableName: value })`.
*   **Consider context:** For text that might change based on context or pluralization, refer to `react-i18next` documentation for advanced features like `Trans` component, context, and pluralization.
*   **Date/Number Formatting:** While `react-i18next` itself doesn't handle date/number formatting directly, consider using libraries like `date-fns` or the native `Intl` API in conjunction with the detected language (`i18n.language`) for locale-aware formatting if needed.

This plan provides a structured approach to integrating and expanding `react-i18next` for localization in Plotbunni.
