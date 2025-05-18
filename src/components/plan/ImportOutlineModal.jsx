import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(t('import_outline_modal_error_empty'));
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
          if (!currentAct) throw new Error(t('import_outline_modal_error_chapter_no_act', { content }));
          currentChapter = createChapter({ name: content });
          currentChapter.scenes = [];
          currentAct.chapters.push(currentChapter);
          currentScene = null;
        } else if (level === 2) { // Scene
          if (!currentChapter) throw new Error(t('import_outline_modal_error_scene_no_chapter', { content }));
          currentScene = createScene({ name: content, synopsis: '' });
          currentChapter.scenes.push(currentScene);
        } else if (level === 3) { // Scene Synopsis
          if (!currentScene) throw new Error(t('import_outline_modal_error_synopsis_no_scene', { content }));
          currentScene.synopsis = (currentScene.synopsis ? currentScene.synopsis + '\n' : '') + content;
        } else if (content) {
            throw new Error(t('import_outline_modal_error_indentation', { line, count: indentation.count }));
        }
      }

      if (newActs.length === 0) {
        setError(t('import_outline_modal_error_no_acts'));
        return;
      }
      
      onImportConfirm(newActs, replaceExisting);
      onOpenChange(false);
    } catch (e) {
      setError(e.message || t('import_outline_modal_error_parsing'));
      console.error("Parsing error:", e);
    }
  };

  const novelDataContextForAI = novelSynopsis ? `Synopsis: ${novelSynopsis}` : "";
  const novelDataTokensForAI = tokenCount(novelDataContextForAI);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('import_outline_modal_title')}</DialogTitle>
          <DialogDescription style={{ whiteSpace: 'pre-line' }}>
            {t('import_outline_modal_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Textarea
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            rows={15}
            placeholder={t('import_outline_modal_placeholder_textarea')}
            className={`font-mono text-sm ${showAiFeatures ? "pr-10" : ""}`}
          />
          {showAiFeatures && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute bottom-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700"
              onClick={() => setIsAISuggestionModalOpen(true)}
              aria-label={t('import_outline_modal_aria_label_ai_suggestion')}
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
            {t('import_outline_modal_checkbox_replace_existing')}
          </Label>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('cancel')}
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleImport}>
            {t('import_outline_modal_button_import')}
          </Button>
        </DialogFooter>
      </DialogContent>
      {isAISuggestionModalOpen && (
        <AISuggestionModal
          isOpen={isAISuggestionModalOpen}
          onClose={() => setIsAISuggestionModalOpen(false)}
          currentText={outlineText}
          initialQuery={taskSettings[TASK_KEYS.PLANNER_OUTLINE]?.prompt || t('import_outline_modal_ai_initial_query')}
          novelData={novelDataContextForAI}
          novelDataTokens={novelDataTokensForAI}
          novelDataLevel={0} // Level 0 for simple, non-retry context
          onAccept={(suggestion) => {
            setOutlineText(suggestion);
            setIsAISuggestionModalOpen(false);
          }}
          fieldLabel={t('import_outline_modal_ai_field_label')}
          taskKeyForProfile={TASK_KEYS.PLANNER_OUTLINE}
        />
      )}
    </Dialog>
  );
};

export default ImportOutlineModal;
