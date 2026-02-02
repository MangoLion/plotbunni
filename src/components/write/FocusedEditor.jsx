import React, { useRef, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext'; // Added import
import {
  MDXEditor,
  headingsPlugin,
  linkPlugin,
  linkDialogPlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  quotePlugin, // Useful for dialogues or emphasis in stories
  markdownShortcutPlugin,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertThematicBreak,
  UndoRedo,
  Separator // Visually separates groups of toolbar controls
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

function FocusedEditor({ 
  markdown, 
  onChange, 
  sceneName, 
  height = '400px', // Default fixed height
  placeholder = "Tell your story..." 
}) {
  const editorRef = useRef(null);
  const { themeMode, activeOsTheme } = useSettings(); // Get theme settings

  // Determine if dark theme is active
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'system' && activeOsTheme === 'dark');

  // Update editor content if the markdown prop changes externally
  useEffect(() => {
    if (editorRef.current && markdown !== editorRef.current.getMarkdown()) {
      editorRef.current.setMarkdown(markdown);
    }
  }, [markdown]);

  return (
    <div className="focused-editor-container w-full flex flex-col" style={{ height }}>
      {sceneName && (
        <div className="p-2 text-sm font-semibold text-center border-b">
          {sceneName}
        </div>
      )}
      <div className="flex-grow overflow-hidden"> {/* This div will contain the editor and allow it to take remaining space */}
        <MDXEditor
          ref={editorRef}
          markdown={markdown || ''} // Use provided markdown or empty string
          onChange={onChange} // Propagate changes
          // List of plugins to enable features
          plugins={[
          headingsPlugin(), // Enables #, ##, etc. for headings
          quotePlugin(),    // Enables > for blockquotes
          thematicBreakPlugin(), // Enables --- for horizontal rules
          linkPlugin(),     // Enables link creation and rendering
          linkDialogPlugin(), // Provides the dialog UI for creating/editing links
          markdownShortcutPlugin(), // Enables markdown shortcuts like * for italic
          
          // Toolbar plugin with customized contents
          toolbarPlugin({
            toolbarContents: () => (
              <>
                {/* Undo and Redo buttons */}
                <UndoRedo />
                <Separator />

                {/* Dropdown for selecting block types (headings, paragraph, quote) 
                <BlockTypeSelect />
                <Separator />
                */}

                {/* Toggles for bold, italic, and underline formatting */}
                <BoldItalicUnderlineToggles />
                <Separator />
                
                {/* Button to create or edit links */}
                <CreateLink />
                
                {/* Button to insert a horizontal rule (thematic break) */}
                <InsertThematicBreak />
              </>
            )
          })
        ]}
          // You can add more props as needed, e.g., contentEditableClassName for custom styling
          className={isDarkMode ? 'dark-theme' : ''} // Apply dark-theme to the editor's root
          contentEditableClassName="prose prose-sm dark:prose-invert max-w-none p-3 flex-grow" // Reverted to original
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export default FocusedEditor;
