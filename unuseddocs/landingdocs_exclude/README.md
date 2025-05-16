# Plothare

## Description

Plothare is an open-source novel writing tool designed to help novelists organize ideas, structure stories, and leverage AI for brainstorming and drafting. It focuses on core needs like concept management, story planning, and AI-powered assistance, supporting multiple novels.

## Directory Structure

```
src/
├── RootApp.jsx
├── App.jsx
├── main.jsx
├── index.css
├── lib/
│   ├── indexedDb.js
│   ├── utils.js
│   └── aiContextUtils.js
├── data/
│   ├── models.js
│   ├── conceptTemplates.js
│   └── themePresets.js
├── context/
│   ├── DataContext.jsx
│   └── SettingsContext.jsx
├── components/
│   ├── novel/
│   │   ├── NovelGridView.jsx
│   │   ├── NovelCard.jsx
│   │   ├── NovelOverviewTab.jsx
│   │   └── ExportModal.jsx
│   ├── concept/
│   │   ├── ConceptCacheList.jsx
│   │   ├── ConceptFormModal.jsx
│   │   └── CreateConceptModal.jsx
│   ├── plan/
│   │   ├── PlanView.jsx
│   │   ├── ActFormModal.jsx
│   │   ├── ChapterFormModal.jsx
│   │   └── SceneFormModal.jsx
│   ├── write/
│   │   └── WriteView.jsx
│   ├── ai/
│   │   ├── AISuggestionModal.jsx
│   │   └── AINovelWriterModal.jsx
│   ├── settings/
│   │   ├── SettingsView.jsx
│   │   ├── ThemeEditor.jsx
│   │   └── EndpointProfileFormModal.jsx
│   └── ui/
│       ├── button.jsx
│       └── ...
└── assets/
```

## Features

Plothare offers a range of features to streamline the novel writing process, all managed on a per-novel basis:

  * **Novel Management**:

      * View all your novels in a central grid.
      * Create, open, rename, and delete novels.
      * Search for novels by name.
      * Edit novel details: name, author, synopsis, and cover image.
      * Download your entire novel project as a JSON file.
      * Export novel content to Markdown (.md) or Text (.txt) with options for including a table of contents and formatting headings.

  * **Story Organization**:

      * **Concept Cache**: Manage your story's key elements (characters, locations, items, lore) with full create, read, update, and delete (CRUD) operations, search functionality, and concept templates.
      * **Planning Interface**: Structure your novel hierarchically with acts, chapters, and scenes, including full CRUD capabilities and the ability to link scenes to concepts.
      * **Import Story Outlines**: Import outlines from a simple indented text format.

  * **Writing Environment**:

      * **Manuscript Editor**: Write your novel scene by scene, with editable act and chapter titles.
      * **Markdown Support**: Scene content is rendered as Markdown by default and can be edited in a rich text area.
      * **Smooth Editing Experience**: Text areas auto-expand and animate height changes.
      * **Integrated Markdown Help**: Access quick Markdown syntax tips while editing.
      * **Novel Outline Navigation**: Quickly jump to any scene using a popover that displays your novel's structure.
      * **Focused Writing**: Navigate directly from the plan view to the writing area for a specific chapter.

  * **AI-Powered Assistance**:

      * **Contextual AI Suggestions**: Get AI-powered text suggestions for various parts of your novel, including scene synopses, new novel outlines, novel descriptions, and individual scene text.
          * The AI considers global system prompts, relevant novel data context (like outlines or preceding scenes), and the current text you're working on.
          * Suggestions are streamed live from your configured AI endpoint.
          * Control the AI by including or excluding your current text as a basis for continuation.
          * Cancel generation at any time.
      * **AI Novel Writer**: Let the AI write content for all scenes in your novel sequentially.
          * It uses context from earlier chapters and preceding scenes for narrative continuity.
          * Monitors token usage for the scene being written.
          * View overall progress and live AI output.
          * Saves content in batches upon completion or allows saving completed scenes if interrupted.
      * **AI Configuration**:
          * Manage AI endpoint profiles (URL, token, model).
          * Customize task-specific AI prompts.
          * Monitor estimated token usage against model limits.

  * **Customization and Data Management**:

      * **Local Data Storage**: All novel data is stored locally in your browser using IndexedDB, allowing for offline access.
      * **Theme Customization**:
          * Choose between Light, Dark, or System theme modes.
          * Select from predefined theme presets (e.g., Sepia, Paper, VSCode Dark).
          * Customize individual colors for your light and dark themes.
          * Theme preferences are saved locally.