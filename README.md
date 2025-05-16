# Plot Bunni

Plot Bunni is an open-source novel writing tool designed to assist novelists in organizing their ideas, structuring their stories, and leveraging AI for brainstorming and drafting. This version supports managing multiple novels and persists data locally using IndexedDB.

## Features

Plot Bunni offers a comprehensive suite of features for novelists:

### I. Global & Novel Management

-   **Novel Grid View (`NovelGridView.jsx`)**:
    -   Landing page displaying all user novels as cards.
    -   Creation of new novels with a user-defined name.
    -   Opening an existing novel to its dedicated editor view.
    -   Renaming existing novels directly on the card.
    -   Deleting existing novels (with confirmation).
    -   Client-side search/filter for novels by name.
-   **Data Storage (Multi-Novel)**:
    -   Each novel's data (overview, plan, concepts, manuscript) is stored separately in IndexedDB.
    -   Novel metadata (ID, name, last modified) is also stored for the grid view.

### II. Novel Editor (`App.jsx` - Main Shell for an Opened Novel)

-   **Unified Editor Interface**: Centralized view for working on a single novel.
-   **Responsive Layout**:
    -   **Desktop**: Two-pane layout with a resizable and collapsible sidebar (for Overview & Concepts) and a main content area.
    -   **Mobile**: Single-pane layout with tab-based navigation for all sections.
-   **Header Bar**:
    -   Quick navigation back to "My Novels" (Home icon).
    -   Current novel name display (with a bunny icon!).
    -   Sidebar toggle button (desktop).
    -   Font settings popover for customizing editor font family and size.
    -   Theme toggle button (Light/Dark mode).
-   **Tab-based Navigation**:
    -   **Main Tabs (Desktop & Mobile)**: Plan, Write, Settings.
    -   **Mobile-Only Main Tabs**: Overview, Concepts (these are in the sidebar on desktop).
-   **Novel Overview (`NovelOverviewTab.jsx` - in Sidebar/Mobile Tab)**:
    -   Edit novel metadata: name, author, synopsis, cover image.
    -   "Download Project" button: Exports the full novel data (including plan, concepts, manuscript) as a single JSON file.
    -   "Export Manuscript": Exports novel content in Markdown (.md) or Text (.txt) format with options for including a table of contents and headings.
-   **Settings (`SettingsView.jsx`)**:
    -   Global application settings.
    -   AI endpoint configuration and profile management.
    -   Theme customization (see Theme Features).

### III. Story Planning (`PlanView.jsx`)

-   **Hierarchical Structure**: Organize stories into Acts, Chapters, and Scenes.
    -   **Acts**: Create, rename, delete (with confirmation, cascades to children).
    -   **Chapters**: Create (within Acts), rename, delete (with confirmation, cascades to children). Displayed as cards.
    -   **Scenes**: Create (within Chapters), rename, edit synopsis & tags, delete (with confirmation). Displayed as smaller cards within Chapter cards.
-   **Visual Plan**:
    -   Acts are displayed as sections.
    -   Chapters are displayed in a responsive grid within their Act.
    -   Scenes are listed within their Chapter card.
-   **Concept Linking**: Scenes can be linked to multiple Concepts from the Concept Cache (visible on Scene cards).
-   **Navigation to Write View**:
    -   "Write" button on each Chapter card.
    -   If a chapter has multiple scenes, a dropdown allows selecting a specific scene to jump to in the Write view.
    -   Automatically switches to the `Write` tab and scrolls to/focuses the selected chapter or scene.
-   **Import Outline (`ImportOutlineModal.jsx`)**:
    -   Import story structures from a simple, indented text format.
    -   Option to replace the existing plan or append to it.
-   **AI Story Chat (`AIChatModal.jsx`)**:
    -   Floating action button to open an AI chat modal.
    -   Chat history and current input are persisted in `localStorage`, scoped to the active novel.
    -   Useful for brainstorming, getting ideas, or discussing plot points with an AI assistant.

### IV. Concept Cache (`ConceptCacheList.jsx` - in Sidebar/Mobile Tab)

-   **Centralized Idea Management**: Store and organize characters, locations, items, lore, etc.
-   **CRUD Operations**:
    -   Create new concepts (from templates or blank).
    -   Edit existing concepts (name, description, image, tags, aliases, custom fields based on template).
    -   Delete concepts (with confirmation).
    -   Duplicate concepts.
-   **Search & Filter**: Quickly find concepts by name, tags, aliases, or description. (Filter UI present, full functionality TBD).
-   **Template System**:
    -   Utilizes novel-specific concept templates (e.g., Character, Location).
    -   `CreateConceptModal` allows choosing a template to pre-fill structure.
    -   (Management of templates themselves via `ManageTemplatesModal.jsx`).
-   **Display**: Concepts are listed, potentially grouped by their template type, with image thumbnail and name.

### V. Manuscript Writing (`WriteView.jsx`)

-   **Focused Writing Environment**: Dedicated view for drafting scene content.
-   **Editable Titles**:
    -   Act and Chapter titles are displayed and can be edited directly within the `WriteView`.
-   **Scene-by-Scene Writing**:
    -   Each scene has its own `AutoExpandingTextarea`.
    -   Textarea automatically adjusts height to fit content.
    -   Scene content is saved to IndexedDB on blur (if changed).
    -   Placeholder text includes scene name and synopsis for context.
-   **AI-Powered Scene Writing**:
    -   **AI Suggestions (`AISuggestionModal.jsx`)**:
        -   Button on each scene textarea to get AI-generated suggestions for the current scene.
        -   Context for AI includes novel details (synopsis, genre), plot structure, preceding scenes, and linked concepts.
    -   **AI Novel Writer (`AINovelWriterModal.jsx`)**:
        -   A dedicated modal to have AI write content for all (or selected) scenes in the novel sequentially.
        -   Uses contextual prompts, displays progress, live output, and memory usage.
        -   Supports partial saving if interrupted.
-   **Navigation & Focus**:
    -   Automatically scrolls to and focuses the target chapter/scene when navigated from `PlanView`.
-   **Structure Display**: Renders the novel's hierarchy (Acts > Chapters > Scenes) for writing.
-   **Empty State Handling**: Provides guidance if no acts/chapters/scenes exist.

### VI. Cross-Cutting & Utility Features

-   **Theme Customization (`SettingsContext.jsx`, `ThemeEditor.jsx`)**:
    -   Select Light, Dark, or System theme mode.
    -   Choose from predefined light and dark theme presets.
    -   Customize individual HSL color values for active light and dark themes.
    -   Theme preferences persisted in `localStorage`.
-   **Font Customization (`FontSettingsControl.jsx`)**:
    -   Users can select font family and adjust font size for the editor.
    -   Preferences persisted in `localStorage`.
-   **AI Integration Framework**:
    -   Reusable `AISuggestionModal` for various text generation tasks.
    -   Context generation utilities (`aiContextUtils.js`) with truncation strategies to manage token limits.
    -   Task-specific AI configurations and system prompts.
-   **Data Persistence**: All novel-specific data is saved locally using IndexedDB, ensuring work is not lost.
-   **Responsive Design**: UI adapts for optimal use on desktop, tablet, and mobile devices.
-   **Error Handling & Loading States**: Provides feedback during data operations and loading.

## Directory Tree (src folder)

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
│   │   └── CreateConceptModal.jsx
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

## Setup Instructions

To set up and run Plot Bunni locally:

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    ```
    (Replace `<repository_url>` with the actual URL of the Plot Bunni repository)

2.  **Navigate to the project directory:**
    ```bash
    cd Plot Bunni
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```

This will start the application, typically accessible at `http://localhost:5173/` (or another port if 5173 is in use).
