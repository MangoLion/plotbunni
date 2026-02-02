# Changing Font Family in the PlotBunni Shadcn UI Project

This document details how the font family is managed and can be changed within the PlotBunni application. The system uses a React context (`SettingsContext`) to handle font selection and applies the chosen font globally via CSS custom properties, a method compatible with shadcn UI and Tailwind CSS.

## Core Mechanism

The application's `SettingsContext` centralizes the management of user preferences, including the selected font family. When a user changes the font family through the UI, the context updates this preference and applies it to the root HTML element as a CSS custom property (`--font-sans`). This allows UI components throughout the application to adopt the new font family.

### 1. Settings Context (`src/context/SettingsContext.jsx`)

The `SettingsContext` is key to storing, loading, saving, and providing access to the font family setting.

*   **Available Fonts and Default:**
    *   An array `AVAILABLE_FONTS` defines the list of selectable fonts, each with an `id`, `name`, and `stack` (the CSS font-family string).
    *   A `DEFAULT_FONT_FAMILY` is set, typically the ID of the first font in `AVAILABLE_FONTS`.

    ```javascript
    // src/context/SettingsContext.jsx
    // ...
    export const AVAILABLE_FONTS = [
      { id: 'Inter', name: 'Inter', stack: '"Inter", system-ui, ...' },
      { id: 'Roboto', name: 'Roboto', stack: '"Roboto", system-ui, ...' },
      // ... other fonts
    ];
    const DEFAULT_FONT_FAMILY = AVAILABLE_FONTS[0].id; // e.g., 'Inter'
    // ...
    ```

*   **State Initialization:**
    *   The font family state is managed using `useState`, initialized with `DEFAULT_FONT_FAMILY`.
    *   On application load, settings (including `fontFamily`) are retrieved from `localStorage`. If no saved setting is found, the default is used.

    ```javascript
    // src/context/SettingsContext.jsx
    // ...
    const [fontFamily, setFontFamilyState] = useState(DEFAULT_FONT_FAMILY);
    // ...
    // In loadSettings function:
    // return {
    //   ...
    //   fontFamily: parsed.fontFamily || DEFAULT_FONT_FAMILY,
    //   ...
    // };
    // ...
    // In useEffect for loading settings:
    // setFontFamilyState(loaded.fontFamily || DEFAULT_FONT_FAMILY);
    ```

*   **Updating Font Family:**
    *   A `setFontFamily` function is provided by the context. This function updates the `fontFamily` state if the provided font ID is valid (exists in `AVAILABLE_FONTS`).

    ```javascript
    // src/context/SettingsContext.jsx
    // ...
    const setFontFamily = useCallback((newFontFamilyId) => {
      if (AVAILABLE_FONTS.some(f => f.id === newFontFamilyId)) {
        setFontFamilyState(newFontFamilyId);
      }
    }, []); // AVAILABLE_FONTS is stable, so no dependency needed if defined outside component scope or memoized
    ```

*   **Applying Font Family to the Document:**
    *   A `useEffect` hook listens for changes in the `fontFamily` state (among other theme-related states). When `fontFamily` changes, it finds the corresponding font object from `AVAILABLE_FONTS` and updates the CSS custom property `--font-sans` on the `document.documentElement` with the font's `stack`.

    ```javascript
    // src/context/SettingsContext.jsx
    // ...
    useEffect(() => {
      // ... (other theme logic) ...

      // Apply font family and font size
      const selectedFont = AVAILABLE_FONTS.find(f => f.id === fontFamily) || AVAILABLE_FONTS[0];
      document.documentElement.style.setProperty('--font-sans', selectedFont.stack);
      document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);

      // ... (other theme logic) ...
    }, [themeMode, userLightColors, userDarkColors, activeOsTheme, fontFamily, fontSize, isLoaded]);
    ```
    The `--font-sans` CSS custom property is conventionally used by Tailwind CSS (and thus shadcn UI components) as the primary sans-serif font stack.

### 2. Font Settings UI Control (`src/components/settings/FontSettingsControl.jsx`)

The `FontSettingsControl` component provides the user interface for selecting the font family.

*   **Accessing Context:**
    *   It uses the `useSettings` hook to get the current `fontFamily`, the `setFontFamily` function, and the `AVAILABLE_FONTS` list from `SettingsContext`.

    ```javascript
    // src/components/settings/FontSettingsControl.jsx
    import React from 'react';
    import { useSettings } from '@/context/SettingsContext';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    // ...
    const FontSettingsControl = () => {
      const { t } = useTranslation(); // For localization
      const {
        fontFamily,
        fontSize, // Also used in this component
        setFontFamily,
        setFontSize, // Also used in this component
        AVAILABLE_FONTS,
      } = useSettings();
      // ...
    };
    ```

*   **UI for Changing Font Family:**
    *   The component renders a `Select` dropdown (from shadcn UI components) populated with the `AVAILABLE_FONTS`.
    *   When the user selects a new font from the dropdown, the `onValueChange` callback of the `Select` component is triggered, calling the `setFontFamily` function from the context. This updates the state in `SettingsContext`, which in turn triggers the `useEffect` that applies the new font stack to the `--font-sans` CSS custom property.

    ```javascript
    // src/components/settings/FontSettingsControl.jsx
    // ...
    <Select value={fontFamily} onValueChange={setFontFamily}>
      <SelectTrigger id="fontFamilySelectPopover" className="mt-1">
        <SelectValue placeholder={t('font_settings_placeholder_select_font')} />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_FONTS.map((font) => (
          <SelectItem key={font.id} value={font.id}>
            {font.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    // ...
    ```

## How Shadcn UI Consumes the Font Family

Shadcn UI components are styled using Tailwind CSS. Tailwind CSS is typically configured to use the `--font-sans` CSS custom property for its sans-serif font utilities.

*   **Tailwind CSS Configuration (`tailwind.config.js`):**
    The `tailwind.config.js` file usually defines the `fontFamily` theme settings. For shadcn UI, it's common to see the sans-serif stack configured to use the `--font-sans` variable.

    ```javascript
    // tailwind.config.js (example snippet)
    module.exports = {
      // ...
      theme: {
        extend: {
          fontFamily: {
            sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans], // Ensures fallback
          },
          // ... other theme extensions
        },
      },
      // ...
    };
    ```
    When `SettingsContext.jsx` updates the `--font-sans` variable on the `:root` element, any HTML element using Tailwind's sans-serif font utilities (e.g., classes like `font-sans`, or any text element by default if `font-sans` is applied to the `body`) will automatically render with the newly selected font family.

## Summary

1.  **`SettingsContext.jsx`**:
    *   Defines a list of `AVAILABLE_FONTS` and a `DEFAULT_FONT_FAMILY`.
    *   Manages the `fontFamily` state.
    *   Provides a `setFontFamily` function to update this state.
    *   Applies the selected font's CSS stack to the `--font-sans` CSS custom property on the `document.documentElement` (the `:root`).
2.  **`FontSettingsControl.jsx`**:
    *   Uses the `useSettings` hook to access `fontFamily`, `setFontFamily`, and `AVAILABLE_FONTS`.
    *   Provides a `Select` dropdown UI for the user to choose a font family.
    *   Calls `setFontFamily` upon selection, triggering the global font update.
3.  **Application & Shadcn UI**:
    *   The `--font-sans` CSS custom variable is updated globally.
    *   Tailwind CSS is configured to use `var(--font-sans)` for its sans-serif font family.
    *   Consequently, all shadcn UI components and other elements styled with Tailwind's sans-serif utilities adopt the new font family seamlessly.

This system allows for dynamic and user-configurable font family selection throughout the PlotBunni application, maintaining a consistent look and feel.
