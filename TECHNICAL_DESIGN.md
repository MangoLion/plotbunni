# Plothare - Technical Design Document

## 1. Introduction

### 1.1. Project Goal

Plothare aims to be an open-source novel writing tool designed to assist novelists in organizing their ideas, structuring their stories, and leveraging AI for brainstorming and drafting. The project emphasizes a manageable feature set for solo development, focusing on core needs like concept management, story planning, and (eventually) AI-powered assistance and mobile accessibility. This version reflects a refactor to support multiple novels.

### 1.2. Document Purpose

This document outlines the technical design and implementation details of Plothare. It covers the application architecture, directory structure, key components, data management strategies, and a roadmap for future development, reflecting its evolution to a multi-novel platform.

## 2. Technical Design Overview

### 2.1. Architecture

Plothare is a single-page application (SPA) built using **ReactJS** with **Vite** as the build tool. Client-side routing is managed by **React Router DOM**. The UI is constructed using **Shadcn UI** components (which internally use Tailwind CSS and Radix UI primitives) for a modern and accessible user interface.

The core architecture revolves around:
-   **Multi-Novel Structure**: The application's entry point (`/`) is the `NovelGridView`, which displays a list of all user novels and allows for creation, deletion, and renaming of novels. Selecting a novel navigates the user to the `NovelEditorView` (e.g., `/novel/:novelId`).
-   **Component-Based UI**: React components are organized by feature. Top-level components include `RootApp.jsx` (for routing), `NovelGridView.jsx` (for novel management), and `App.jsx` (acting as `NovelEditorView` for editing a specific novel).
-   **Scoped State Management**: The React Context API (`DataContext.jsx`) is used to manage and distribute application-wide data for a *single, currently active novel*. The `DataProvider` is instantiated with a `novelId` to load and manage data for that specific novel.
-   **Local Data Persistence (Multi-Novel)**: User data for each novel is stored locally in the browser using **IndexedDB**. This allows for offline access and data retention for multiple distinct novels.
-   **Responsive Design**: Tailwind CSS is used to ensure the application adapts to different screen sizes.

### 2.2. State Management (`DataContext.jsx`)

-   The `DataContext` is designed to manage the state of a **single active novel**. The `DataProvider` component, which provides this context, accepts a `novelId` prop.
-   When `DataProvider` is mounted (typically when `NovelEditorView` for a specific novel is rendered), it uses the `novelId` to load and manage the state for that novel.
-   It provides state for the active novel's:
    -   `concepts`: An array of Concept objects.
    -   `acts`: An object mapping Act IDs to Act objects.
    -   `chapters`: An object mapping Chapter IDs to Chapter objects.
    -   `scenes`: An object mapping Scene IDs to Scene objects.
    -   `actOrder`: An array of Act IDs defining the top-level order of acts for that novel.
-   The context exposes CRUD functions (e.g., `addConcept`, `updateAct`, `deleteScene`) that operate on the data of the currently loaded novel.
-   Order management functions (e.g., `updateActOrder`) are also scoped to the active novel.

### 2.3. Data Persistence (`indexedDb.js`, `DataContext.jsx`)

-   Custom helper functions in `src/lib/indexedDb.js` provide a Promise-based API for interacting with an IndexedDB database named `PlothareDB` and an object store `ProjectDataStore`.
-   **Storage Strategy for Multi-Novel Support**:
    -   A dedicated key, `NOVELS_METADATA_KEY`, is used in the `ProjectDataStore` to store an array of `NovelMetadata` objects. Each metadata object typically contains `{ id: string, name: string, lastModified: string }`.
    -   Each novel's full data (concepts, plan structure, etc., conforming to the `NovelData` structure defined in `models.js`) is stored as a separate entry in the `ProjectDataStore` under a unique key, patterned as `novel_data_${novelId}`.
-   `DataContext` integrates these helpers:
    -   **On Mount / `novelId` Change**: When `DataProvider` is mounted or its `novelId` prop changes, it calls `getNovelData(novelId)` from `indexedDb.js` to fetch the specific novel's data.
    -   **On Data Change**: A `useEffect` hook within `DataProvider` monitors changes to the active novel's state (`concepts`, `acts`, `chapters`, `scenes`, `actOrder`). When any of these change (and after initial data loading for the current novel is complete), the entire `NovelData` object for the active novel is saved back to IndexedDB using `saveNovelData(novelId, novelData)`. This function also updates the `lastModified` timestamp in the novel's metadata.
    -   **Initialization**: If `getNovelData(novelId)` returns no data (e.g., for a newly created novel that has metadata but no content yet, or if a novelId is invalid), `DataContext` initializes its state with default empty structures (e.g., empty `concepts` array, empty `acts` object, etc.) suitable for a new novel.
-   The old `PROJECT_DATA_KEY` (which stored a single global project) is no longer used.

### 2.4. Data Models (`models.js`)

-   Defines the structure for core data entities using JSDoc typedefs and factory functions (e.g., `createConcept`, `createAct`).
-   **`NovelMetadata`**: `id` (string, UUID), `name` (string), `lastModified` (string, ISO timestamp). Stored in an array under `NOVELS_METADATA_KEY`.
-   **`Concept`**: `id` (string), `name` (string), `aliases` (string[]), `tags` (string[]), `description` (string), `notes` (string), `priority` (number), `image` (string|null), `creation_date` (number), `last_modified_date` (number).
-   **`Act`**: `id` (string), `name` (string), `chapterOrder` (string[]), `creation_date` (number), `last_modified_date` (number).
-   **`Chapter`**: `id` (string), `name` (string), `sceneOrder` (string[]), `creation_date` (number), `last_modified_date` (number).
-   **`Scene`**: `id` (string), `name` (string), `tags` (string[]), `synopsis` (string), `context` (string[] - array of Concept IDs), `autoUpdateContext` (boolean), `content` (string - manuscript text), `creation_date` (number), `last_modified_date` (number).
-   **`NovelData`**: A top-level structure for storing all data related to a single novel in IndexedDB (under `novel_data_${novelId}`). This object contains:
    -   `id`: (string, optional) Novel ID, typically corresponds to a `NovelMetadata` id.
    -   `authorName`: (string) The name of the novel's author. Defaults to empty string.
    -   `synopsis`: (string) A brief summary of the novel. Defaults to empty string.
    -   `coverImage`: (string, nullable) A base64 encoded string of the novel's cover image, or null if not set. Defaults to null.
    -   `pointOfView`: (string, optional) e.g., First Person, Third Person Limited. Defaults to empty string.
    -   `genre`: (string, optional) e.g., Fantasy - Urban Fantasy. Defaults to empty string.
    -   `timePeriod`: (string, optional) e.g., contemporary, historical, futuristic. Defaults to empty string.
    -   `targetAudience`: (string, optional) e.g., Young Adult, Adult. Defaults to empty string.
    -   `themes`: (string, optional) e.g., love, betrayal, redemption. Defaults to empty string.
    -   `tone`: (string, optional) e.g., dark, humorous, suspenseful. Defaults to empty string.
    -   `concepts`: (Concept[]) Array of Concept objects.
    -   `acts`: (Object<string, Act>) Acts keyed by ID.
    -   `chapters`: (Object<string, Chapter>) Chapters keyed by ID.
    -   `scenes`: (Object<string, Scene>) Scenes keyed by ID.
    -   `actOrder`: (string[]) Ordered list of Act IDs.
    -   `conceptTemplates`: (ConceptTemplate[]) Array of `ConceptTemplate` objects for this novel. Defaults to a standard set for new novels.
    -   `creation_date`: (number, optional) Timestamp of novel data creation.
    -   `last_modified_date`: (number, optional) Timestamp of novel data last modification.
    (This replaces the old `ProjectData` model which was for a single project).

### 2.5. Concept Templates (Per-Novel)

-   **Storage**: Concept templates are stored within each novel's `NovelData` object in IndexedDB, under the `conceptTemplates` key. This allows each novel to have its own customized set of templates.
-   **Default Templates**: When a new novel is created, it is initialized with a default set of concept templates (e.g., Character, Location, Item, Lore). These are defined in `src/data/models.js` (sourced from `src/data/conceptTemplates.js`).
-   **Management**:
    -   Users can manage these templates (create, edit, delete) via a new "Manage Templates" modal, accessible from the concept creation and editing modals.
    -   The `DataContext` will provide state and CRUD functions for `conceptTemplates` scoped to the active novel.
-   **Structure**: A `ConceptTemplate` typically includes an `id`, `name`, and `templateData` (a partial `Concept` object containing pre-filled fields like description, tags, etc.).
-   **Usage**: The concept creation/editing modals (`CreateConceptModal.jsx`, `ConceptFormModal.jsx`) will populate their template selection UI using the `conceptTemplates` from the active novel's data context, instead of a global static list.
-   The `src/data/conceptTemplates.js` file will primarily serve as the source for the initial default templates.

### 2.6. Theme Management (`SettingsContext.jsx`, `ThemeEditor.jsx`, `themePresets.js`)
-   **Centralized Logic**: `src/context/SettingsContext.jsx` manages all theme-related state and logic. This includes:
    -   The current theme mode (`light`, `dark`, or `system`).
    -   User-defined color palettes for their custom light and dark themes (stored as objects mapping CSS variable names to HSL string values).
    -   Loading and applying theme presets.
-   **Theme Application**:
    -   Themes are applied by dynamically setting CSS custom properties (e.g., `--background`, `--primary`) on the `document.documentElement.style`.
    -   The `.dark` class is added or removed from `document.documentElement` based on the effective theme (light or dark).
-   **Persistence**: User's selected `themeMode` and their custom `userLightColors` and `userDarkColors` are persisted in `localStorage`.
-   **Presets**: Predefined theme palettes (e.g., Sepia, Paper, Mint for light; VSCode Dark, Midnight, Charcoal for dark) are stored in `src/data/themePresets.js`. Each preset is an object containing a full set of HSL color values.
-   **UI**: `src/components/settings/ThemeEditor.jsx` provides the user interface for:
    -   Selecting the overall theme mode.
    -   Choosing from available light and dark presets.
    -   Editing individual HSL color values for their current light and dark themes.
    -   Resetting themes to application defaults.
-   **Global Access**: Theme settings and control functions are exposed via the `useSettings` hook.

## 3. Directory Structure (src folder)

```
src/
├── RootApp.jsx                 # Top-level component, sets up React Router.
├── App.jsx                     # Novel Editor View: Main layout for editing a single novel.
├── main.jsx                    # Entry point, renders RootApp.
├── index.css                   # Global styles, Tailwind base/components/utilities
├── lib/
│   ├── indexedDb.js            # IndexedDB helper functions (multi-novel support).
│   ├── utils.js                # General utility functions, including token counting.
│   └── aiContextUtils.js       # Utilities for AI context generation (L1 with truncation).
├── data/
│   ├── models.js               # Data structure definitions and factory functions.
│   ├── conceptTemplates.js     # Default concept template definitions.
│   └── themePresets.js         # Predefined theme color palettes.
├── context/
│   ├── DataContext.jsx         # State management for the active novel.
│   └── SettingsContext.jsx     # Global settings, including AI endpoints and theme management.
├── components/
│   ├── novel/                  # Components related to Novel Management
│   │   ├── NovelGridView.jsx   # Displays grid of novels, handles creation/selection.
│   │   ├── NovelCard.jsx       # Displays individual novel card.
│   │   ├── NovelOverviewTab.jsx # Tab for editing novel metadata and initiating exports.
│   │   └── ExportModal.jsx     # Modal for custom TXT/Markdown export options.
│   ├── concept/                # Components related to Concept Cache (scoped to active novel)
│   │   ├── ConceptCacheList.jsx
│   │   ├── ConceptFormModal.jsx
│   │   └── CreateConceptModal.jsx (Note: Review if ConceptDetailView.jsx was intended or if CreateConceptModal is a typo/legacy)
│   ├── plan/                   # Components related to the Plan Interface (scoped to active novel)
│   │   ├── PlanView.jsx
│   │   ├── ActFormModal.jsx
│   │   ├── ChapterFormModal.jsx
│   │   └── SceneFormModal.jsx
│   ├── write/                  # Components related to the Write Interface (scoped to active novel)
│   │   └── WriteView.jsx
│   ├── ai/                     # Components related to AI features
│   │   ├── AISuggestionModal.jsx # Reusable modal for AI text suggestions.
│   │   └── AINovelWriterModal.jsx # Modal for AI to write entire novel.
│   ├── settings/               # Components related to Settings (global and per-novel)
│   │   ├── SettingsView.jsx    # Main settings UI.
│   │   ├── ThemeEditor.jsx     # UI for theme customization.
│   │   └── EndpointProfileFormModal.jsx # Modal for AI endpoint profile editing.
│   └── ui/                     # Shadcn UI components (auto-generated)
│       ├── button.jsx
│       └── ... (other Shadcn components)
└── assets/                     # Static assets (e.g., SVGs)
```

## 4. Main Code File Details

### 4.1. `src/RootApp.jsx`
-   **Purpose**: The main entry point for the React application rendered by `main.jsx`. It initializes `react-router-dom` and defines the application's top-level routes.
-   **Key Features**:
    -   Sets up `createBrowserRouter` and `RouterProvider`.
    -   Defines a route for `/` that renders `NovelGridView.jsx`.
    -   Defines a route for `/novel/:novelId` that renders `NovelEditorLayout`.
    -   `NovelEditorLayout` is a small wrapper component that extracts `novelId` from URL parameters and then renders `<App novelId={novelId} />` wrapped within `<DataProvider novelId={novelId}>`.

### 4.2. `src/App.jsx` (Novel Editor View)
-   **Purpose**: Serves as the main user interface for editing a single, active novel. It receives a `novelId` as a prop from `NovelEditorLayout`.
-   **Key Features**:
    -   Wrapped by `DataProvider` which provides context (data and CRUD operations) for the specified `novelId`.
    -   Fetches and displays the current novel's name in the header using the `novelId` prop and `getAllNovelMetadata` from `indexedDb.js`.
    -   Manages `activeMainTab` state for the current view within the novel editor (`Write`, `Plan`, `Settings`, or `Concepts` on mobile).
    -   Manages `isSidebarCollapsed` state and `panelGroupRef` (for `ResizablePanelGroup`) to control the collapsible sidebar on desktop.
    -   Includes a `toggleSidebar` function to expand/collapse the sidebar.
    -   Includes a "Back to My Novels" link (Home icon) to navigate back to `NovelGridView`.
    -   Displays a loading state while data for the novel is being fetched by `DataContext`.
    -   Implements responsive layout:
    -   **Desktop**: Two-pane layout with `ResizablePanelGroup`.
        -   A new sidebar toggle button (using `PanelLeftClose`/`PanelRightOpen` icons) is added to the header, visible only on desktop, to control `isSidebarCollapsed`.
        -   The left sidebar `ResizablePanel` is now `collapsible`, with `collapsedSize={0}`. It uses `onCollapse` and `onExpand` to update `isSidebarCollapsed`. Its content is conditionally rendered based on this state.
        -   The `ResizableHandle` next to the sidebar is hidden when the sidebar is collapsed.
        -   The left pane (sidebar) contains `NovelOverviewTab` and `ConceptCacheList` in tabs.
        -   The right pane content switches based on `activeMainTab`.
    -   **Mobile**: Single-pane layout. Top tabs switch the entire view. A dedicated "Concepts" tab shows `ConceptCacheList`.
    -   Manages `targetChapterId` state to facilitate scrolling in the `WriteView` when navigating from `PlanView`.
    -   Provides `handleSwitchToWriteTab` function (passed down to `PlanView`) to change the active tab to 'write' and set `targetChapterId`.
    -   Passes `targetChapterId` prop to `WriteView`.
    -   Components like `ConceptCacheList`, `PlanView`, `SettingsView` consume data from `useData()` hook, which is now scoped to the active novel.

### 4.3. `src/context/DataContext.jsx`
-   **Purpose**: Centralized state management for the currently active novel.
-   **Key Features**:
    -   `DataProvider` component accepts a `novelId` prop.
    -   Uses `useState` for `concepts`, `acts`, `chapters`, `scenes`, `actOrder`, and `conceptTemplates` pertaining to the active novel.
    -   Provides CRUD functions for these data types (e.g., `addConcept`, `updateAct`, `addConceptTemplate`, `updateConceptTemplate`, `deleteConceptTemplate`).
    -   Integrates with `src/lib/indexedDb.js` for data persistence:
        -   On `novelId` change or initial mount, calls `getNovelData(novelId)` to load the novel's data.
        -   Initializes with default data if no stored data is found for the `novelId`. This includes initializing `conceptTemplates` with default templates if they are not present in the loaded novel data (e.g., for older novels created before this feature).
        -   Uses a `useEffect` hook to monitor state changes; if data is loaded and `novelId` is stable, calls `saveNovelData(novelId, currentNovelData)` to persist changes (including `conceptTemplates`).
    -   Exposes all data and modifier functions (including for `conceptTemplates`) through the `useData` hook.

### 4.3.1. `src/context/SettingsContext.jsx` (Extended)
-   **Purpose (Extended)**: Manages global application settings, including AI endpoint profiles, theme customization, and task-specific AI configurations.
-   **Key Theme Features**:
    -   Manages `themeMode` (`light`, `dark`, `system`), `userLightColors`, and `userDarkColors`.
    -   Loads and saves these theme settings to `localStorage` under `PLOTBUNNI_Settings`.
    -   Dynamically applies theme colors to `document.documentElement.style` and manages the `.dark` class.
    -   Provides functions to change `themeMode`, update individual HSL color values, apply predefined themes from `src/data/themePresets.js`, and reset themes to defaults.
    -   Listens to OS theme changes when `themeMode` is 'system'.
-   **Key AI Endpoint Profile Features**:
    -   Manages a list of `endpointProfiles`, each with `id`, `name`, `useCustomEndpoint`, `endpointUrl`, `apiToken`, `modelName`, `contextLength`, and `maxOutputTokens`.
    -   Manages `activeProfileId` for the currently selected global AI profile.
    -   Provides CRUD functions for profiles (`addProfile`, `removeProfile`, `updateProfile`, `resetProfileToDefaults`).
    -   Loads and saves profiles to `localStorage`.
-   **Key Task-Specific AI Configuration Features**:
    -   Manages `taskSettings`, an object where keys are task identifiers (e.g., `plannerOutlineWriting`, `synopsisWriting`, `sceneTextWriting`, `chatting`, `novelDescriptionWriting`) and values are objects containing:
        -   `profileId`: The ID of the AI endpoint profile to use for that task.
        -   `prompt`: The specific AI prompt template for that task.
    -   Default prompts are defined for each task:
        -   Novel Description Writing: `"write the synopsis for my novel."`
        -   Planner Outline Writing: `"Generate a comprehensive plot outline for a new novel: (TYPE IN YOUR NOVEL IDEA HERE!!)"`
        -   Synopsis Writing: `"Based on user query, write the synopsis for the next chapter scene. User query: <USER_QUERY>"`
        -   Scene Text Writing: `"Based on the provided scene synopsis and context, write the full text for this scene."`
        -   Chatting: `"Engage in a helpful conversation about the novel, offering ideas, answering questions, or discussing plot points."`
    -   Provides `updateTaskSetting(taskKey, settingName, value)` to modify a specific task's profile or prompt.
    -   Provides `resetAllTaskPrompts()` to revert all task prompts and the global system prompt to their default values (while retaining selected profiles for tasks).
    -   Loads and saves `taskSettings` and `systemPrompt` to `localStorage`.
    -   Ensures that if an AI profile used by a task is deleted, the task falls back to a default/available profile.
-   **Key Global System Prompt Feature**:
    -   Manages a `systemPrompt` (string), which is a global instruction sent to the AI before any task-specific prompt.
    -   This allows users to set an overall tone, persona, or provide global context for all AI interactions (e.g., "You are an experienced creative writing assistant").
    -   The default system prompt is "You are an experienced creative writing assistant".
-   **Global Access**: All settings (including `systemPrompt`, `taskSettings`, `TASK_KEYS`) and control functions are exposed via the `useSettings` hook.

### 4.4. `src/lib/indexedDb.js`
-   **Purpose**: Provides a simplified interface for IndexedDB operations, refactored for multi-novel support.
-   **Key Features**:
    -   `openDB()`: Handles opening/upgrading the `PlothareDB` database and `ProjectDataStore` object store.
    -   `NOVELS_METADATA_KEY`: Constant for the key storing an array of all novel metadata.
    -   `getNovelDataKey(novelId)`: Helper to generate the specific key for a novel's data (e.g., `novel_data_uuid`).
    -   `getAllNovelMetadata()`: Fetches the array of novel metadata.
    -   `getNovelData(novelId)`: Fetches the complete data for a specific novel.
    -   `saveNovelData(novelId, novelData)`: Saves data for a specific novel and updates its `lastModified` timestamp in the metadata.
    -   `createNovel(novelName)`: Creates metadata and initial empty data for a new novel.
    -   `updateNovelMetadata(novelId, metadataUpdates)`: Updates a novel's name and `lastModified` timestamp.
    -   `deleteNovel(novelId)`: Deletes a novel's data and its metadata entry.

### 4.5. `src/components/novel/NovelGridView.jsx`
-   **Purpose**: The main landing page of the application. Displays a grid of existing novels and allows users to create, open, rename, or delete novels.
-   **Key Features**:
    -   Uses `useEffect`, `getAllNovelMetadata`, and `getNovelData` to fetch and display a list of novels.
    -   For each novel metadata, it fetches the corresponding full `NovelData` to access details like `coverImage` (and potentially `synopsis` or other fields, though `NovelCard` primarily uses `coverImage` and `name`). *Note: This approach might have performance implications if a very large number of novels exist, as it requires an individual data fetch per novel for details beyond basic metadata.*
    -   Renders `NovelCard` components for each novel, passing the enriched novel data.
    -   Always displays an `AddNewNovelCard` as the last item in the grid, which triggers the novel creation modal on click.
    -   The dedicated "New Novel" button in the header and the button shown for an empty list have been removed in favor of the `AddNewNovelCard`.
    -   Includes a search bar to filter novels by name.
    -   Handles navigation to `/novel/:novelId` via `useNavigate` from `react-router-dom` when a novel is opened.
    -   Provides UI for renaming (uses `updateNovelMetadata`) and deleting novels (uses `deleteNovel` with confirmation) via modals triggered from `NovelCard` actions.

#### 4.5.1. `src/components/novel/AddNewNovelCard.jsx`
-   **Purpose**: A special card displayed in the `NovelGridView` that allows users to initiate the creation of a new novel.
-   **Key Features**:
    -   Visually styled to fit with `NovelCard` components, maintaining a consistent grid appearance.
    -   Displays a large "plus" icon (e.g., `PlusCircle`) and text like "New Novel" to clearly indicate its function.
    -   Occupies a grid slot similar to a `NovelCard`.
    -   On click, it triggers the same modal dialog used for creating a new novel (managed by `NovelGridView`).

### 4.6. `src/components/novel/NovelCard.jsx`
-   **Purpose**: A presentational component displaying a novel's cover image (or a gradient placeholder), its name, and action icons for renaming or deleting. The entire card is clickable to open the novel.
-   **Key Features**:
    -   Receives a `novel` object (primarily `{ id, name, coverImage? }`) and callback functions for open, edit, and delete actions as props.
    -   Displays the novel's cover image in a portrait aspect ratio (2:3). If no cover image is available, a gradient background is shown.
    -   Small, icon-only buttons for "Rename" (`onEditNovel`) and "Delete" (`onDeleteNovel`) are positioned in the top-right corner, overlaying the cover image. These buttons typically appear on hover and stop event propagation to prevent triggering the card's open action.
    -   Displays the novel's name beneath the cover image area, centered and with an increased font size for better visibility.
    -   The main body of the card (cover image area and name area) is clickable and triggers the `onOpenNovel` callback.

### 4.7. `components/concept/ConceptCacheList.jsx` (and similar data-display components)
-   **Purpose**: Displays the list of concepts for the *active novel*.
-   **Key Features**:
    -   Fetches `concepts` (and relevant CRUD functions) from `DataContext` using the `useData()` hook. Since `DataContext` is now scoped by `novelId`, this component automatically works with the data of the currently open novel.
    -   Other functionalities (search, triggering modals) remain largely the same but operate within the context of the active novel.
    -   Similar principles apply to `SettingsView.jsx`.
    -   `PlanView.jsx` and its subcomponents (`ActSection`, `ChapterCard`) accept and pass down the `onSwitchToWriteTab` prop from `App.jsx`. The "Write" button in `ChapterCard` calls this function with the chapter ID.

### (Sections for `ConceptDetailView.jsx`, `ConceptFormModal.jsx`, `PlanView.jsx`, `Act/Chapter/SceneFormModal.jsx` would follow, noting that their core logic remains similar but they now operate on data scoped to the active novel via `DataContext`.)

#### Integration of AI Suggestion Modal in `SceneFormModal.jsx`
-   `SceneFormModal.jsx` now integrates the `AISuggestionModal` for scene synopsis suggestions.
    -   A `<WandSparkles />` icon button is added to the synopsis `Textarea`.
    -   It passes the current synopsis content as `currentText`.
    -   It passes the task-specific prompt for "synopsisWriting" (from `SettingsContext`) as `initialQuery`.
    -   It generates and passes a `novelData` string (novel outline up to the current scene) for context.
-   `ImportOutlineModal.jsx` integrates `AISuggestionModal` for generating new novel outlines.
    -   A `<WandSparkles />` icon button is added to the outline `Textarea`.
    -   It passes the current outline text as `currentText`.
    -   It passes the task-specific prompt for "plannerOutlineWriting" (from `SettingsContext`) as `initialQuery`.
    -   It passes `null` for `novelData` as it's for a fresh outline.

### 4.8. `src/components/ai/AISuggestionModal.jsx`
-   **Purpose**: A reusable modal component for generating AI-powered text suggestions, adaptable for various text fields, with support for streaming responses and task-specific AI configurations.
-   **Key Features**:
    -   Accepts props: `isOpen`, `onClose`, `currentText` (the text being edited/generated), `onAccept` (callback with AI suggestion), `fieldLabel`, `initialQuery` (pre-filled query, often a task-specific prompt), `novelData` (a string providing broader novel context, conditionally displayed), `taskKeyForProfile` (optional, string key to use a specific task's AI profile from `SettingsContext`), and `novelDataTokens` (estimated tokens for `novelData`).
    -   **Tabbed Interface**:
        -   **Query Tab**:
            -   **Collapsible System Prompt**: Displays the global `systemPrompt` from `SettingsContext` (read-only, collapsed by default).
            -   **Collapsible Novel Data Context**: Displays the `novelData` string if provided (read-only, collapsed by default, hidden if `novelData` is empty/null). The header indicates if the context is "L1 (Full)" or "L1 (Truncated)" based on the outcome of `generateContextWithRetry`.
            -   **Collapsible Current Text**: Displays the `currentText` prop (e.g., existing synopsis or outline text) (read-only, collapsed by default). A checkbox labeled "Continue from {Text}" allows the user to indicate that the AI should continue from this text.
            -   **Query Input**: A `Textarea` for the user to refine or replace the `initialQuery` (disabled during generation).
            -   "Get Suggestion" button: Initiates the AI request.
        -   **Suggestion Tab**: 
            -   Displays the AI's streamed response in a read-only, scrollable `Textarea`. If "Continue from {Text}" is checked, this textarea is pre-filled with `currentText`.
            -   Shows a "Stop Generating" button (full-width, at the bottom) when `isLoading` is true, allowing the user to cancel the request.
    -   **State Management**: Manages internal state for `query`, `aiResponse`, `isLoading`, `activeTab`, collapsible section states, `includeCurrentTextInPrompt` (for the "Continue from" checkbox), and an `abortControllerRef` to handle request cancellation.
    -   **AI Interaction Logic**:
        -   Determines the active AI endpoint configuration (URL, API token, model name) from `SettingsContext` by using the `taskKeyForProfile` prop or falling back to the global `activeProfileId`.
        -   Constructs a payload. The user message includes `novelData` (if provided), then the user's `query`. If "Continue from {Text}" is checked, `currentText` (prefixed with "Continue: ") is appended after the user query.
        -   Sends a `fetch` request (POST) to the configured AI endpoint with `stream: true`.
        -   Processes the Server-Sent Events (SSE) stream, appending `choices[0].delta.content` to the `aiResponse` state.
    -   Handles API errors and `AbortError` if the request is cancelled by the user or modal closure.
    -   **User Interaction**: 
        -   Allows users to accept the suggestion (calls `onAccept` and closes modal) or cancel (closes modal).
        -   The "Stop Generating" button in the Suggestion Tab allows interruption of the AI response stream.
        -   Closing the modal while loading also aborts the request.
    -   **Styling**: Responsive, with increased width and height, scrollable tab content, and uses Shadcn UI components.
    -   **Memory Management UI**: 
        -   Includes a progress bar at the top to visualize estimated prompt token usage against the model's context limit (minus output tokens and a buffer). The bar changes color based on usage percentage. The exact token count display next to the bar has been removed.
        -   A collapsible section below the progress bar provides a detailed breakdown of token usage, showing the percentage and raw token count for system prompt, user query, novel data context, and current text (if included).
    -   **AI Parameters**: Uses `maxOutputTokens` from the active AI profile in API requests. Accepts `novelDataTokens` (the token count of the `novelData` string passed to it) to inform its progress bar. The `novelDataLevel` prop is no longer used.

### 4.8.1. `src/components/ai/AINovelWriterModal.jsx` (New)
-   **Purpose**: A modal enabling AI to write the entire novel, one scene at a time, chapter by chapter.
-   **Trigger**: Activated by a dedicated icon button (e.g., Sparkles icon) in `WriteView.jsx`.
-   **Key Features**:
    -   **Sequential Scene Generation**: Iterates through all planned scenes in the novel (act by act, chapter by chapter, scene by scene) and uses AI to generate content for each.
    -   **Contextual AI Prompts**: Leverages `generateContextWithRetry` (from `aiContextUtils.js` with `sceneText` strategy) to provide relevant context to the AI for each scene. Uses the "Scene Text Writing" task prompt from `SettingsContext`. The context includes synopses of earlier chapters and the full text of the two immediately preceding scenes.
    -   **Progress Indication**:
        -   Displays a progress bar showing overall completion (`scenesWrittenCount / totalScenesCount`).
        -   Shows status text indicating the current chapter and scene being processed.
    -   **Live Activity Feedback**: A "rolling text" display shows a small, continuously updating window of the characters being streamed from the AI for the current scene.
    -   **User Controls**:
        -   "Start Writing" / "Stop Writing" button to initiate or halt the generation process.
        -   "Close" button.
    -   **Data Handling**:
        -   Receives `novelData` (acts, chapters, scenes, concepts) from `WriteView.jsx`.
        -   Uses `updateScene` from `DataContext` to save generated content.
        -   Generated content for scenes is collected locally within the modal during the process.
        -   **Batch Save on Completion**: If all scenes are generated successfully, their content is saved to the database in a batch.
        -   **Partial Save on Abort**: If the user stops the process or closes the modal while generation is active, they are prompted (using `ConfirmModal`) to save any previously *completed* scenes. The scene currently being written when stopped is not saved.
    -   **Error Display**: Shows any errors encountered during the AI generation process.
    -   **State Management**: Manages internal state for the generation queue, progress, current scene details, streaming text, generated contents, AI interaction (including `AbortController`), and token/memory usage details for the scene currently being processed.
-   **Interaction**:
    -   Consumes `novelData` (acts, chapters, scenes, concepts) from `WriteView` and `novelSynopsis` from `DataContext`.
    -   Uses `useData()` for `updateScene`.
    -   Uses `useSettings()` for AI endpoint configuration (including `contextLength`, `maxOutputTokens`), system prompt, and task-specific prompts.
    -   Uses `ConfirmModal` for the partial save confirmation.
-   **Memory Management & UI**:
    -   Before processing each scene, it calls `generateContextWithRetry` (from `aiContextUtils.js` with `sceneText` strategy) to build a token-aware context.
    -   If context generation fails (returns level -1) or the resulting prompt is too large, the scene is skipped.
    -   Displays a memory progress bar and a collapsible section with detailed token breakdown (similar to `AISuggestionModal`) for the *specific scene currently being written by the AI*. This provides real-time feedback on the context size for that scene. The context level display will show "L1 (Full)" or "L1 (Truncated)".
    -   Uses `maxOutputTokens` from the AI profile in API requests.

### 4.9. `src/components/write/WriteView.jsx`
-   **Purpose**: Provides the main interface for writing the novel's manuscript.
-   **Key Features**:
    -   Consumes data (`acts`, `chapters`, `scenes`, `actOrder`, `concepts`, and update functions) from `useData()`.
    -   Displays acts and their chapters in order.
    -   Allows inline editing of Act titles and Chapter titles.
    -   For each scene, provides an auto-expanding textarea to write/edit its `content`.
    -   Scene textareas are separated by a visual divider.
    -   Layout is designed for readability (centered, max-width).
    -   Updates to titles and scene content are intended to be saved back to `DataContext` (currently under review for persistence).
    -   Accepts a `targetChapterId` prop from `App.jsx`.
    -   Uses `useRef` to maintain maps of chapter IDs to their `Card` elements (`chapterRefs`) and scene IDs to their `AutoExpandingTextarea` elements (`sceneTextareaRefs`).
    -   `AutoExpandingTextarea` component uses `React.forwardRef` to accept refs, and includes a `<WandSparkles />` button to trigger `AISuggestionModal` for individual scene text generation.
    -   Includes a `useEffect` hook that triggers when `targetChapterId` changes:
        -   It checks if the target chapter exists and has scenes.
        -   If yes, it finds the ref for the first scene's textarea (`sceneTextareaRefs`). If found, it scrolls the textarea into view (`block: 'center'`) and focuses it after a short delay.
        -   If the chapter has no scenes, or the first scene's textarea ref isn't found, it falls back to scrolling the chapter's `Card` element into view (`block: 'start'`) using `chapterRefs`.
    -   **AI Novel Writer Integration**:
        -   Includes a `<Sparkles />` icon button (typically top-right) to open the `AINovelWriterModal`.
        -   Passes memoized `novelData` (containing `actOrder`, `acts`, `chapters`, `scenes`, `concepts`) to `AINovelWriterModal`.
    -   Manages the open state for `AINovelWriterModal`.
    -   The `AutoExpandingTextarea` component, when triggering `AISuggestionModal` for scene text, now internally calls `generateContextWithRetry` (from `aiContextUtils.js`) with a `sceneText` strategy. It passes the resulting context string and its estimated tokens to `AISuggestionModal`. The `novelDataLevel` prop is no longer passed. The old `generateContextForSceneText` helper function within `WriteView.jsx` is now obsolete.
    -   **Markdown Rendering & Editing Toggle**:
        -   The `AutoExpandingTextarea` component now manages an `isEditingScene` state.
        -   When `isEditingScene` is `false`, scene content is rendered using the `react-markdown` library. The rendered block is clickable to switch to editing mode.
        -   When `isEditingScene` is `true`, the standard auto-expanding `Textarea` is shown for editing.
        -   The `Textarea` includes `transition-all duration-200 ease-in-out` classes for smooth height animation.
    -   **Focus Management for Controls**:
        -   The AI suggestion button (`<WandSparkles />`) and a new Markdown help button (`<TypeIcon />`) use `onMouseDown={(e) => e.preventDefault()}` to prevent the `Textarea` from blurring when these buttons are clicked.
        -   The `handleBlur` method on `AutoExpandingTextarea` is enhanced to check `event.relatedTarget` to prevent exiting edit mode if focus moves to the Markdown help popover's trigger or content.
    -   **Markdown Help Popover**:
        -   A `<TypeIcon />` button is displayed in the top-right corner of the `Textarea` during editing.
        -   Clicking this button opens a `Popover` (from Shadcn UI) containing basic Markdown formatting syntax examples.
    -   **Novel Outline Popover**:
        -   A `<NotebookText />` icon button is positioned at the top-left of the `WriteView` panel.
        -   Clicking this button opens a `Popover` displaying a hierarchical view of the novel's acts, chapters, and scenes.
        -   Selecting a scene from this popover scrolls the `WriteView` to that scene's `AutoExpandingTextarea` and focuses it, automatically switching to edit mode if it was in Markdown display mode.
        -   The `sceneTextareaRefs` are used to reference the outer container of each `AutoExpandingTextarea` for scrolling and interaction.

### 4.X. `src/lib/utils.js` (Extended)
-   **Purpose**: Provides general utility functions for the application.
-   **Key Features**:
    -   `cn`: Helper function for conditional class names using `clsx` and `tailwind-merge`.
    -   `tokenCount(text)`: Estimates the number of tokens in a given text string based on an average character-per-token length. Used for AI prompt size estimation.

### 4.Y. `src/lib/aiContextUtils.js` (New)
-   **Purpose**: Provides utilities for generating AI prompt context strings with dynamic sizing.
-   **Key Features**:
    -   `generateContextWithRetry({ strategy, baseData, targetData, aiProfile, systemPromptText, userQueryText })`:
        -   The main function that attempts to build a full context string (Level 1) for AI prompts.
        -   If the generated Level 1 context exceeds the AI model's token limits (after accounting for system/user prompts, max output tokens, and a safety buffer), it truncates the context string from the beginning until it fits.
        -   Calculates `maxTokensForNovelDataContext` based on the AI profile's `contextLength`, `maxOutputTokens`, fixed prompt tokens (system/user query), and a safety buffer.
        -   Returns an object `{ contextString, estimatedTokens, level, error? }`. `level` will be `1` if successful (either initially or after truncation), or `-1` if it fails to fit even after truncation.
        -   Contains helper functions (`buildNovelOutlineContext_L1`, `buildSceneTextContext_L1`, `buildConceptDetails`, `buildStructuralOutline`) to construct the Level 1 context.
        -   `buildConceptDetails` (for L1) includes full concept descriptions. For `sceneText` strategy, it aims to include concepts relevant to scenes up to and including the target scene.
        -   `buildStructuralOutline` (for L1 `sceneText` strategy):
            -   Includes synopses of all chapters that appear *before* the chapter containing the first of the two immediately preceding scenes (or before the target chapter if no such preceding scenes exist).
            -   Includes the full text of up to two scenes *immediately preceding* the target scene, regardless of chapter boundaries.
            -   Includes the names/synopses of other scenes in the current chapter leading up to the target scene.
            -   Lists the target scene itself.
            This provides a rich historical context for style and plot continuity. For `novelOutline` strategy, it builds a structural outline with synopses.

## 5. Currently Implemented Features (Post-Refactor)

The application now supports a multi-novel architecture with the following features:

-   **Novel Management**:
    -   Landing page (`NovelGridView`) displaying all novels.
    -   Creation of new novels with a user-defined name.
    -   Opening an existing novel navigates to its dedicated editor view.
    -   Renaming existing novels.
    -   Deleting existing novels (with confirmation).
    -   Client-side search for novels by name in the grid view.
-   **Novel Editor (`App.jsx`)**:
    -   Loads and displays data (concepts, plan) for the selected novel.
    -   All CRUD operations for concepts, acts, chapters, and scenes are scoped to the active novel.
    -   Data for the active novel, including overview details (name, author, synopsis, cover image edited in `NovelOverviewTab.jsx`), is persisted to IndexedDB automatically on changes. Novel overview text fields use debounced auto-save, while cover image changes are saved immediately.
    -   `NovelOverviewTab.jsx` provides:
        -   Editing of novel name, author, synopsis, and cover image.
        -   A "Download Project" button to export the full novel data as a JSON file.
        -   An "Export" button that opens `ExportModal.jsx`.
    -   `ExportModal.jsx` allows users to export the novel content in Markdown (.md) or Text (.txt) format with options to:
        -   Include/exclude a table of contents (outline style).
        -   Show/omit act and scene names/headings.
    -   Navigation back to the `NovelGridView`.
-   **Core UI Shell (Novel Editor)**: Responsive main application layout with tab-based navigation for Plan, Write, Settings, and Concepts (mobile).
-   **Concept Cache (Per Novel)**: Full CRUD, search, templates.
-   **Plan Interface (Per Novel)**: Hierarchical display and CRUD for Acts, Chapters, Scenes. Linking Scenes to Concepts.
-   **Manuscript Writing Area (`Write` Tab - Per Novel)**: 
    -   Interface for writing scene content with editable act and chapter titles.
    -   Scene content is rendered as Markdown using `react-markdown` when not actively being edited; clicking the rendered Markdown switches to an auto-expanding `Textarea` for editing.
    -   The scene `Textarea` animates its height changes smoothly.
    -   An AI suggestion button (`<WandSparkles />`) is available during scene editing.
    -   A Markdown formatting help popover (`<TypeIcon />`) is available during scene editing, providing quick syntax tips.
    -   **Novel Outline Navigation**: A `<NotebookText />` icon button (top-left of the panel) opens a popover displaying the novel's outline. Selecting a scene scrolls to and focuses its textarea.
-   **Data Storage (Multi-Novel)**: Each novel's data is stored separately in IndexedDB. Novel metadata is also stored.
-   **Placeholders**: Parts of `Settings` tab (Project Management) remain placeholders.
-   **Import Outline Feature**: Added a modal in the Plan view to import story outlines from a simple indented text format.
-   **Plan to Write Navigation & Focus**: Clicking "Write" on a chapter card in Plan view switches to Write tab and focuses the relevant area.
-   **Theme Customization**:
    -   Users can select Light, Dark, or System theme mode.
    -   Users can choose from predefined light (Sepia, Paper, Mint) and dark (VSCode, Midnight, Charcoal) theme presets.
    -   Users can customize individual HSL color values for their active light and dark themes.
    -   Theme preferences are persisted in `localStorage`.
    -   Theme toggle buttons in `NovelGridView` and `App` (Novel Editor) headers reflect and control the global theme.
-   **AI Suggestion Modal (Live Streaming & Enhanced Context)**:
    -   A reusable `AISuggestionModal` component has been implemented with significant context display and live AI interaction capabilities.
    -   **Context Display**: Features collapsible sections in its "Query" tab for:
        -   Global System Prompt (from `SettingsContext`).
        -   Novel Data Context (conditionally displayed, expects a formatted string, e.g., novel outline). The header indicates if the context is "L1 (Full)" or "L1 (Truncated)".
        -   Current Text (the text of the field being edited), with a "Continue from {Text}" checkbox.
    -   **Task-Specific AI Configuration**: Utilizes the `taskKeyForProfile` prop to select specific AI endpoint profiles (URL, token, model) from `SettingsContext` for different tasks (e.g., "synopsisWriting", "plannerOutlineWriting"). Falls back to a global default AI profile if a task-specific one isn't set.
    -   **Live AI Interaction**:
        -   Makes live API calls to user-configured AI endpoints.
        -   The AI's response is streamed in real-time into the "Suggestion" tab. If "Continue from {Text}" is active, the suggestion textarea is pre-filled with the `currentText`, and the AI's output appends to it.
        -   The AI prompt is structured with `novelData`, then the user's `query`, and finally, if "Continue from {Text}" is active, the `currentText` prefixed with "Continue: ".
        -   A "Stop Generating" button in the "Suggestion" tab allows users to cancel the streaming request.
    -   **Integrations & Dynamic Context Generation**:
        -   `SceneFormModal`: For scene synopsis suggestions. Now calls `generateContextWithRetry` (from `aiContextUtils.js` with `novelOutline` strategy) to build context. Passes the resulting context string and its token count to `AISuggestionModal`.
        -   `ImportOutlineModal`: For generating new novel outlines. Passes a simple context (novel synopsis or empty string) along with its token count to `AISuggestionModal`.
        -   `NovelOverviewTab`: For novel synopsis (description) suggestions (behavior for context generation remains similar, likely passing minimal novel data).
        -   `WriteView` (`AutoExpandingTextarea`): For individual scene text suggestions. The `AutoExpandingTextarea` component now internally calls `generateContextWithRetry` (`sceneText` strategy). The Level 1 context for this strategy now includes synopses of earlier chapters and the full text of the two immediately preceding scenes. Passes the resulting context string and its token count to `AISuggestionModal`.
    -   Features a tabbed interface ("Query" and "Suggestion") for clarity.
    -   **Memory Management & UI**:
        -   Includes a progress bar visualizing estimated prompt token usage against the AI model's limits.
        -   A new collapsible section below the progress bar shows a detailed breakdown of token contributions.
        -   The progress bar changes color based on token usage percentage.
        -   Uses `maxOutputTokens` from the selected AI profile in API requests.
-   **AI Novel Writer Modal (`AINovelWriterModal.jsx`)**: (Enhanced with Memory Management and Context Continuity)
    -   Allows AI to write content for all scenes in the novel sequentially.
    -   Integrates `generateContextWithRetry` for each scene, using the `sceneText` strategy with the Level 1 context (including synopses of earlier chapters and the full text of the two immediately preceding scenes) for improved narrative continuity. It also correctly uses locally generated content from the current session for subsequent scene contexts. Skips scenes if context cannot be adequately sized (i.e., `generateContextWithRetry` returns level -1).
    -   Displays a memory progress bar and detailed token breakdown (including a collapsible view of the full novel data context string) for the *scene currently being processed by the AI*. The context level display will show "L1 (Full)" or "L1 (Truncated)".
    -   Uses `maxOutputTokens` from the AI profile for each scene generation request.
    -   Triggered from `WriteView`.
    -   Displays overall progress (progress bar, scenes written X/Y).
    -   Shows current chapter/scene being processed.
    -   Provides a "rolling text" display of live AI output for the current scene.
    -   Saves all generated content in a batch upon successful completion of all scenes.
    -   If stopped by the user or interrupted, prompts via `ConfirmModal` to save any previously *completed* scenes. (The scene being actively written at the moment of interruption is not saved).

## 6. Future TODOs / Post-MVP Roadmap

(This section can largely remain the same, as the refactor enables these features to be built per-novel rather than globally.)

### 6.1. Core Functionality Enhancements
-   **Manuscript Writing Area (`Write` Tab)**: (Per novel) - Basic structure implemented. Data persistence for edits made in this tab is currently under review/to be finalized.
-   **Advanced Filtering/Sorting**: (For concepts within a novel)
-   **Plan Interface - Drag and Drop**: (Within a novel's plan)
-   **Concept Templates - User Management**: (Could be global or per-novel, TBD)
-   **Project Management (Settings Tab - now Novel Settings)**:
    -   Functional novel renaming (already implemented in `NovelGridView`).
    -   "Download Project" (download active novel data as JSON - implemented in `NovelOverviewTab.jsx`).
    -   "Export" to Markdown/TXT with options (implemented in `NovelOverviewTab.jsx` via `ExportModal.jsx`).
    -   "Import Novel" (upload and parse JSON to create/restore a novel).
    -   Consider a global "Settings" distinct from per-novel settings.
-   **Search Debounce**: (For concept search within a novel).
-   **AI Integration (Beyond Mockup)**:
    -   Replace mock AI calls in `AISuggestionModal` with actual API calls to a chosen AI service.
    -   Implement robust error handling for AI API calls.
    -   Enhance loading states and user feedback during AI interactions.
    -   Allow configuration of AI provider/model (potentially via `SettingsContext.jsx`).
    -   Expand the use of `AISuggestionModal` to other text fields (e.g., concept descriptions). (Already in `WriteView` for scene content).
-   **AI Novel Writer Enhancements**:
    -   Option to resume an interrupted AI novel writing session.
    -   More granular control (e.g., write specific chapter, skip scenes).
    -   Allow user to review/edit each scene before AI proceeds to the next.
-   **UI/UX Refinements**: (General improvements across the app)
-   **Advanced Export Formats**: (e.g., PDF, DOCX, more customization options beyond current Markdown/TXT).


This roadmap provides a clear path for expanding Plothare beyond its current state.
