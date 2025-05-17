import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '../../context/DataContext';
import { createAct, createChapter, createScene } from '@/data/models';
import { WandSparkles } from 'lucide-react';
import { AISuggestionModal } from '../ai/AISuggestionModal';
import { useSettings } from '../../context/SettingsContext';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { tokenCount } from '../../lib/utils'; // Added tokenCount

const EXAMPLE_OUTLINE = `Act 1: The Beginning
    Chapter 1: A New Dawn
        Scene 1: Sunrise
            The sun rises over the sleepy town.
            Birds begin to chirp.
        Scene 2: The Mysterious Letter
            A mysterious letter arrives.
    Chapter 2: The Journey Starts
        Scene 1: Packing Up
            Our hero packs their bags.
Act 2: The Middle
    Chapter 3: Challenges
        Scene 1: The First Obstacle
            A difficult challenge is presented.`;

const ImportOutlineModal = ({ open, onOpenChange, onImportConfirm }) => {
  const [outlineText, setOutlineText] = useState(EXAMPLE_OUTLINE);
  const [error, setError] = useState('');
  const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const { taskSettings, TASK_KEYS, showAiFeatures } = useSettings();
  const { synopsis: novelSynopsis } = useData();

  useEffect(() => {
    if (open) {
      setOutlineText(EXAMPLE_OUTLINE);
      setError('');
      setReplaceExisting(false);
    }
  }, [open]);

  const detectIndentation = (lines) => {
    for (const line of lines) {
      if (line.startsWith('    ')) return { type: 'spaces', count: 4 };
      if (line.startsWith('  ')) return { type: 'spaces', count: 2 };
      if (line.startsWith('\t')) return { type: 'tabs', count: 1 };
    }
    return { type: 'spaces', count: 4 };
  };

  const getIndentationLevel = (line, indentType, indentCount) => {
    let level = 0;
    if (indentType === 'tabs') {
      while (line.startsWith('\t'.repeat(level + 1))) {
        level++;
      }
    } else {
      const indentUnit = ' '.repeat(indentCount);
      while (line.startsWith(indentUnit.repeat(level + 1))) {
        level++;
      }
    }
    return level;
  };

  const handleImport = () => {
    setError('');
    const lines = outlineText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      setError('Outline text is empty.');
      return;
    }

    const indentation = detectIndentation(lines);
    const newActs = [];
    let currentAct = null;
    let currentChapter = null;
    let currentScene = null;

    try {
      for (const line of lines) {
        const trimmedLine = line.trimStart();
        const content = line.trim();
        const level = getIndentationLevel(line, indentation.type, indentation.count);

        if (level === 0) { // Act
          currentAct = createAct({ name: content });
          currentAct.chapters = [];
          newActs.push(currentAct);
          currentChapter = null;
          currentScene = null;
        } else if (level === 1) { // Chapter
          if (!currentAct) throw new Error('Chapter "' + content + '" found without a preceding Act.');
          currentChapter = createChapter({ name: content });
          currentChapter.scenes = [];
          currentAct.chapters.push(currentChapter);
          currentScene = null;
        } else if (level === 2) { // Scene
          if (!currentChapter) throw new Error('Scene "' + content + '" found without a preceding Chapter.');
          currentScene = createScene({ name: content, synopsis: '' });
          currentChapter.scenes.push(currentScene);
        } else if (level === 3) { // Scene Synopsis
          if (!currentScene) throw new Error('Synopsis line "' + content + '" found without a preceding Scene.');
          currentScene.synopsis = (currentScene.synopsis ? currentScene.synopsis + '\n' : '') + content;
        } else if (content) {
            throw new Error('Line with unexpected indentation: "' + line + '". Ensure consistent use of tabs or spaces (' + indentation.count + ' per level).');
        }
      }

      if (newActs.length === 0) {
        setError("No valid acts found in the outline.");
        return;
      }
      
      onImportConfirm(newActs, replaceExisting);
      onOpenChange(false);
    } catch (e) {
      setError(e.message || "An error occurred during parsing.");
      console.error("Parsing error:", e);
    }
  };

  const novelDataContextForAI = novelSynopsis ? `Synopsis: ${novelSynopsis}` : "";
  const novelDataTokensForAI = tokenCount(novelDataContextForAI);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Outline</DialogTitle>
          <DialogDescription>
            Paste your novel outline below. Use indentation (tabs or spaces) to define acts, chapters, and scenes.
            Example: Act (no indent), Chapter (1 indent), Scene (2 indents), Synopsis (3 indents).
            You can also use the AI wand icon on the textarea to help generate an outline.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Textarea
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            rows={15}
            placeholder="Paste your outline here, or use the AI wand to generate one..."
            className={`font-mono text-sm ${showAiFeatures ? "pr-10" : ""}`}
          />
          {showAiFeatures && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute bottom-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700"
              onClick={() => setIsAISuggestionModalOpen(true)}
              aria-label="Get AI Suggestion for Outline"
            >
              <WandSparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="replace-existing-outline"
            checked={replaceExisting}
            onCheckedChange={setReplaceExisting}
          />
          <Label htmlFor="replace-existing-outline" className="text-sm font-medium">
            Replace existing outline
          </Label>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleImport}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
      {isAISuggestionModalOpen && (
        <AISuggestionModal
          isOpen={isAISuggestionModalOpen}
          onClose={() => setIsAISuggestionModalOpen(false)}
          currentText={outlineText}
          initialQuery={taskSettings[TASK_KEYS.PLANNER_OUTLINE]?.prompt || "Generate a comprehensive plot outline for a new novel: (TYPE IN YOUR NOVEL IDEA HERE!!)"}
          novelData={novelDataContextForAI}
          novelDataTokens={novelDataTokensForAI}
          novelDataLevel={0} // Level 0 for simple, non-retry context
          onAccept={(suggestion) => {
            setOutlineText(suggestion);
            setIsAISuggestionModalOpen(false);
          }}
          fieldLabel="Novel Outline"
          taskKeyForProfile={TASK_KEYS.PLANNER_OUTLINE}
        />
      )}
    </Dialog>
  );
};

export default ImportOutlineModal;
