# Shadcn Theme & Profile Implementation in Plot Bunni

This document details how the application implements its theme and profile systems. The core logic resides in `src/context/SettingsContext.jsx`, providing a flexible and persistent system for managing user preferences.

## 1. Core Architecture: `SettingsContext.jsx`

The entire system is managed by the `SettingsContext`. It serves as a centralized provider for all theme-related and profile-related state and functions, making them accessible throughout the application via the `useSettings` hook.

### Key State Variables:

-   `themeMode`: A string (`'light'`, `'dark'`, or `'system'`) that determines the current theme behavior.
-   `userLightColors`: An object storing the HSL color strings for the light theme.
-   `userDarkColors`: An object storing the HSL color strings for the dark theme.
-   `activeOsTheme`: A string (`'light'` or `'dark'`) reflecting the OS's color scheme, used when `themeMode` is `'system'`.
-   `endpointProfiles`: An array of objects, where each object represents a configurable user profile for AI model interactions.
-   `activeProfileId`: The UUID of the currently active profile.
-   `fontFamily`, `fontSize`: Strings that store the user's font preferences.

### Persistence:

All settings are saved to `localStorage` under the key `PLOTBUNNI_Settings`.
-   **`loadSettings()`**: Retrieves and parses the settings JSON from `localStorage` on application startup. It includes migration logic, such as updating old endpoint URLs to new ones, and ensures data integrity by providing default values if settings are missing or corrupted.
-   **`saveSettings()`**: Persists the entire settings object to `localStorage` whenever a relevant state variable changes. This is handled by a `useEffect` hook that tracks all critical state.

## 2. Profile Management

The application allows users to create and manage multiple profiles for different AI model configurations.

-   **Profile Structure**: Each profile is an object with a unique `id`, a `name`, and settings like `endpointUrl`, `apiToken`, `modelName`, etc.
-   **`createDefaultProfile()`**: A factory function that generates a new profile with default values.
-   **CRUD Operations**: The context provides functions to `addProfile`, `removeProfile`, and `updateProfile`. When a profile is removed, the system intelligently reassigns the active profile and updates any tasks that were linked to the deleted profile.
-   **`loadSettings()` and Profiles**: During loading, `loadSettings` validates the stored profiles. If no profiles are found, it creates a default one, ensuring the application always has at least one valid profile.

## 3. Applying the Theme to the DOM

A primary `useEffect` hook in `SettingsContext.jsx` is responsible for applying the current theme to the DOM whenever theme-related state changes.

### Steps:

1.  **Determine Effective Theme**: It selects the appropriate color set (`userLightColors` or `userDarkColors`) based on `themeMode` and `activeOsTheme`.
2.  **Apply CSS Variables**: It iterates through the `effectiveColors` object and applies each color to the `document.documentElement` as a CSS variable (e.g., `--background: 0 0% 100%`).
3.  **Apply Font Styles**: It sets the `--font-sans` and `--font-size-base` CSS variables based on the `fontFamily` and `fontSize` state.
4.  **Toggle Dark Class**: It adds or removes the `dark` class from `document.documentElement`, which is the standard mechanism for Tailwind CSS's dark mode.

## 4. HSL Color Utility Functions

To ensure robust and consistent color handling, the context defines several module-scoped helper functions for parsing and comparing HSL colors.

-   **`robustParseHslString(hslString)`**: Parses various HSL string formats (e.g., `hsl(...)`, `H S% L%`) into a structured object (`{h, s, l}`). This handles inconsistencies in how HSL values might be represented.
-   **`formatHslObjectToCanonicalString(hslObject)`**: Converts an HSL object back into a standardized string format (`"H.D S.D% L.D%"`), ensuring data consistency when saving.
-   **`compareHslObjects(hsl1, hsl2, tolerance)`**: Compares two HSL objects with a given tolerance, accounting for floating-point inaccuracies and the circular nature of the hue value.
-   **`areColorsObjectsEqual(objSet1, objSet2)`**: A higher-level utility that compares two entire sets of color objects, used extensively in the theme synchronization logic.

## 5. State Synchronization with Live CSS (Theme Guessing)

A sophisticated `useEffect` hook ensures that the React state remains synchronized with the actual CSS variables applied to the page. This creates a two-way binding, making the theme system resilient to external changes (e.g., from browser dev tools).

### How It Works:

1.  **Read Computed Styles**: The hook uses `getComputedStyle` to read the current values of the theme's CSS variables directly from the DOM.
2.  **Parse Live Colors**: It uses `robustParseHslString` to convert the live CSS values into HSL objects.
3.  **Compare with State**: It compares these "live" colors against the colors currently stored in the React state (`userLightColors`, `userDarkColors`) and against the known theme presets from `src/data/themePresets.js`.
4.  **Synchronize State**: If a discrepancy is detected, the hook updates the React state to match the live CSS.
    -   If the live colors match a known preset, it updates the user's color state to that preset's values.
    -   If the live colors do not match any preset, it treats them as a new custom theme and saves them to `userLightColors` or `userDarkColors`.

This mechanism ensures that the application's state is always the source of truth, even if the styles are manipulated externally.

## 6. UI Layer: `SettingsView.jsx` and `ThemeEditor.jsx`

-   `SettingsView.jsx` acts as a container for all settings-related UI.
-   `ThemeEditor.jsx` provides the user-facing interface for all theme operations. It uses the `useSettings()` hook to access state and functions.
-   **Controls**:
    -   Buttons to select `themeMode`.
    -   A `Select` dropdown to apply a theme preset via `applyPreset`.
    -   A "Reset to Default" button that calls `resetThemeToDefault`.
    -   A list of color inputs, where each input is tied to a specific CSS variable and calls `updateUserColor` on change.
