# Changing Font Size in the PlotBunni Shadcn UI Project

This document outlines how font size is managed and can be changed within the PlotBunni application, which utilizes a React context (`SettingsContext`) and applies changes globally via CSS custom properties, a common pattern in shadcn UI and similar theming approaches.

## Core Mechanism

The application uses a centralized `SettingsContext` to manage various user preferences, including the base font size. Changes made through this context are then applied to the root HTML element as a CSS custom property, which can be consumed by UI components throughout the application.

### 1. Settings Context (`src/context/SettingsContext.jsx`)

The `SettingsContext` is responsible for storing, loading, saving, and providing access to the font size setting.

*   **State Initialization:**
    *   A default font size is defined: `const DEFAULT_FONT_SIZE = 16; // in pixels`
    *   The font size state is managed using `useState`: `const [fontSize, setFontSizeState] = useState(DEFAULT_FONT_SIZE);`
    *   On application load, settings (including `fontSize`) are retrieved from `localStorage`. If no saved setting is found, the default is used.

    ```javascript
    // src/context/SettingsContext.jsx
    // ...
    const DEFAULT_FONT_SIZE = 16; // in pixels
    // ...
    const [fontSize, setFontSizeState] = useState(DEFAULT_FONT_SIZE);
    // ...
    // In loadSettings function:
    // return {
    //   ...
    //   fontSize: parsed.fontSize || DEFAULT_FONT_SIZE,
    //   ...
    // };
    // ...
    // In useEffect for loading settings:
    // setFontSizeState(loaded.fontSize || DEFAULT_FONT_SIZE);
    ```

*   **Updating Font Size:**
    *   A `setFontSize` function is provided by the context. This function updates the `fontSize` state and includes basic validation (e.g., min/max size: 8px to 72px).

    ```javascript
    // src/context/SettingsContext.jsx
    // ...
    const setFontSize = useCallback((newFontSize) => {
      const size = parseInt(newFontSize, 10);
      if (!isNaN(size) && size >= 8 && size <= 72) { // Basic validation
        setFontSizeState(size);
      }
    }, []);
    ```

*   **Applying Font Size to the Document:**
    *   A `useEffect` hook listens for changes in the `fontSize` state (among other theme-related states). When `fontSize` changes, it updates a CSS custom property `--font-size-base` on the `document.documentElement`.

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
    This CSS custom property (`--font-size-base`) is what shadcn UI components (or any other components styled with CSS) would typically use to define their font sizes, often via Tailwind CSS utility classes that are configured to use these variables. For example, `text-base` in Tailwind could be configured to use `var(--font-size-base)`.

### 2. Font Settings UI Control (`src/components/settings/FontSettingsControl.jsx`)

The `FontSettingsControl` component provides the user interface for changing the font size.

*   **Accessing Context:**
    *   It uses the `useSettings` hook to get the current `fontSize` and the `setFontSize` function from `SettingsContext`.

    ```javascript
    // src/components/settings/FontSettingsControl.jsx
    import React from 'react';
    import { useSettings } from '@/context/SettingsContext';
    // ...
    const FontSettingsControl = () => {
      // ...
      const {
        fontFamily, // Also used in this component but not the focus of this section
        fontSize,
        setFontFamily, // Also used in this component
        setFontSize,
        AVAILABLE_FONTS, // Also used in this component
      } = useSettings();
      // ...
    };
    ```

*   **UI for Changing Font Size:**
    *   The component renders buttons to increase or decrease the font size and displays the current size.
    *   Clicking these buttons calls the `setFontSize` function obtained from the context, which in turn updates the state in `SettingsContext`, triggering the `useEffect` that applies the new size to the CSS custom property.

    ```javascript
    // src/components/settings/FontSettingsControl.jsx
    // ...
    <Button
      variant="outline"
      size="icon"
      onClick={() => setFontSize(Math.max(8, fontSize - 1))} // Decrease
      disabled={fontSize <= 8}
      title={t('font_settings_tooltip_decrease_size')}
    >
      <AArrowDown className="h-5 w-5" />
    </Button>
    <span className="text-sm w-10 text-center tabular-nums">{fontSize}px</span>
    <Button
      variant="outline"
      size="icon"
      onClick={() => setFontSize(Math.min(72, fontSize + 1))} // Increase
      disabled={fontSize >= 72}
      title={t('font_settings_tooltip_increase_size')}
    >
      <AArrowUp className="h-5 w-5" />
    </Button>
    // ...
    ```

## How Shadcn UI Consumes the Font Size

While not explicitly shown in these files, a typical shadcn UI setup using Tailwind CSS would involve configuring Tailwind to use the CSS custom properties set by `SettingsContext`.

In `tailwind.config.js` (or a global CSS file like `src/index.css`), you might define how font sizes are mapped.

*   **Global CSS (`src/index.css` or similar):**
    The `--font-size-base` variable is set on the `:root` element by `SettingsContext.jsx`. This makes it available globally. Applications often apply this to the `body` or use it as a basis for `rem` units.

    ```css
    /* Example: src/index.css or a global stylesheet */
    :root {
      /* --font-size-base is set dynamically by SettingsContext.jsx */
      /* Other theme variables like --background, --foreground, etc., are also set here */
    }

    body {
      /* This ensures the base font size is applied, and rem units scale accordingly */
      font-size: var(--font-size-base);
    }
    ```

*   **Tailwind CSS Configuration (`tailwind.config.js`):**
    Shadcn UI components are built with Tailwind CSS. Tailwind's `rem` unit is relative to the root font size. By setting `--font-size-base` on the root or body, all `rem`-based Tailwind utilities (like `text-sm`, `text-lg`, padding `p-4`, margin `m-2`, etc.) will scale proportionally to the `fontSize` set in `SettingsContext`.

    No explicit `fontSize` configuration might be needed in `tailwind.config.js` for this specific variable if the theme is set up to have `--font-size-base` influence the root font size, as shadcn's default CSS variables often do. The `theme.extend.fontSize` section in Tailwind is more for defining custom named font sizes (e.g., `text-hero`, `text-caption`).

## Summary

1.  **`SettingsContext.jsx`**:
    *   Manages the `fontSize` state (defaulting to 16px, configurable between 8px and 72px).
    *   Provides a `setFontSize` function to modify this state.
    *   Applies the current `fontSize` to the CSS custom property `--font-size-base` on the `document.documentElement` (the `:root`).
2.  **`FontSettingsControl.jsx`**:
    *   Uses the `useSettings` hook to access the current `fontSize` and the `setFontSize` updater function.
    *   Provides UI elements (buttons) that call `setFontSize` to allow the user to change the application's base font size.
3.  **Application & Shadcn UI**:
    *   The CSS custom variable `--font-size-base` is updated globally on the `:root` element.
    *   Shadcn UI components and Tailwind CSS utilities, particularly those using `rem` units, will automatically scale according to this base font size, ensuring a consistent typographic scale across the application.

This setup provides a reactive, centralized, and user-configurable way to manage the base font size throughout the PlotBunni application.
