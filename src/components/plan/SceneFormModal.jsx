import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WandSparkles } from 'lucide-react';
import { AISuggestionModal } from '../ai/AISuggestionModal';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useData } from '@/context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateContextWithRetry } from '../../lib/aiContextUtils';
import ConfirmModal from '@/components/ui/ConfirmModal'; // Import ConfirmModal
import { Trash2 } from 'lucide-react'; // Import Trash2 icon

const SceneFormModal = ({ open, onOpenChange, sceneToEdit, chapterId }) => {
  const { t } = useTranslation();
  const {
    addSceneToChapter,
    updateScene,
    deleteScene, // Add deleteScene
    concepts, 
    acts,
    chapters,
    scenes,
    actOrder,
    // Destructure all required novel detail fields from useData()
    novelSynopsis,
    genre,
    pointOfView,
    timePeriod,
    targetAudience,
    themes,
    tone
    // authorName is intentionally omitted as per requirements
  } = useData();
  const { taskSettings, TASK_KEYS, systemPrompt, getActiveProfile, showAiFeatures } = useSettings();

  const [name, setName] = useState('');
  const [tags, setTags] = useState(''); // Comma-separated
  const [synopsisText, setSynopsisText] = useState('');
  const [selectedContextConcepts, setSelectedContextConcepts] = useState([]);
  const [autoUpdateContext, setAutoUpdateContext] = useState(true);
  const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false); // State for confirm modal
  
  const [aiContext, setAiContext] = useState({
    contextString: "",
    estimatedTokens: 0,
    level: 0,
    error: null,
  });

  const isEditing = Boolean(sceneToEdit);

  useEffect(() => {
    if (open) {
      if (isEditing && sceneToEdit) {
        setName(sceneToEdit.name || '');
        setTags(sceneToEdit.tags ? sceneToEdit.tags.join(', ') : '');
        setSynopsisText(sceneToEdit.synopsis || '');
        setSelectedContextConcepts(sceneToEdit.context || []);
        setAutoUpdateContext(sceneToEdit.autoUpdateContext === undefined ? true : sceneToEdit.autoUpdateContext);
      } else {
        setName('');
        setTags('');
        setSynopsisText('');
        setSelectedContextConcepts([]);
        setAutoUpdateContext(true);
      }
      setAiContext({ contextString: "", estimatedTokens: 0, level: 0, error: null }); // Reset AI context
    }
  }, [sceneToEdit, isEditing, open]);

  const resetForm = () => {
    setName('');
    setTags('');
    setSynopsisText('');
    setSelectedContextConcepts([]);
    setAutoUpdateContext(true);
    setAiContext({ contextString: "", estimatedTokens: 0, level: 0, error: null });
    setIsConfirmDeleteOpen(false);
  };

  const handleContextConceptChange = (conceptId) => {
    setSelectedContextConcepts(prev =>
      prev.includes(conceptId)
        ? prev.filter(id => id !== conceptId)
        : [...prev, conceptId]
    );
  };

  const handleSubmit = () => {
    if (!isEditing && !chapterId) {
      console.error(t('scene_form_modal_error_chapter_id_required'));
      // Potentially show an error to the user
      return;
    }

    const sceneData = {
      name,
      tags: tags.split(',').map(s => s.trim()).filter(s => s),
      synopsis: synopsisText,
      context: selectedContextConcepts,
      autoUpdateContext,
    };

    if (isEditing && sceneToEdit) {
      updateScene({ ...sceneToEdit, ...sceneData });
    } else if (chapterId) {
      addSceneToChapter(chapterId, sceneData);
    }
    
    resetForm();
    onOpenChange(false);
  };

  const handleDeleteScene = () => {
    if (sceneToEdit && chapterId) { // Ensure chapterId is available
      deleteScene(sceneToEdit.id, chapterId);
      resetForm();
      onOpenChange(false); // Close main modal
      setIsConfirmDeleteOpen(false); // Close confirm modal
    } else if (sceneToEdit) {
        // Fallback if chapterId is somehow not passed during edit (should not happen with current PlanView structure)
        console.warn("Attempting to delete scene without parent chapterId. This might lead to orphaned data if not handled by deleteScene globally.");
        deleteScene(sceneToEdit.id, null); 
        resetForm();
        onOpenChange(false);
        setIsConfirmDeleteOpen(false);
    }
  };
  
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const prepareAIContext = async () => {
    if (!acts || !chapters || !scenes || !concepts || !actOrder) {
      setAiContext({ contextString: "", estimatedTokens: 0, level: 0, error: t('scene_form_modal_ai_context_error_data_not_loaded') });
      return;
    }

    let effectiveChapterIdForContext = chapterId;
    let effectiveSceneIdForContext = null;

    if (isEditing && sceneToEdit) {
      effectiveSceneIdForContext = sceneToEdit.id;
      // Find the chapterId for the scene being edited
      for (const actId of actOrder) {
        const act = acts[actId];
        if (act?.chapterOrder) {
          for (const chapId of act.chapterOrder) {
            const chapter = chapters[chapId];
            if (chapter?.sceneOrder?.includes(sceneToEdit.id)) {
              effectiveChapterIdForContext = chapId;
              break;
            }
          }
        }
        if (effectiveChapterIdForContext && acts[actId]?.chapterOrder.includes(effectiveChapterIdForContext)) break;
      }
    }
    
    const activeAIProfile = getActiveProfile();
    if (!activeAIProfile) {
      setAiContext({ contextString: "", estimatedTokens: 0, level: 0, error: t('scene_form_modal_ai_context_error_no_profile') });
      return;
    }

    const novelDetails = {
      synopsis: novelSynopsis,
      genre,
      pointOfView,
      timePeriod,
      targetAudience,
      themes,
      tone,
    };

    const contextResult = await generateContextWithRetry({
      strategy: 'novelOutline',
      baseData: { actOrder, acts, chapters, scenes, concepts, novelDetails }, // Pass novelDetails object
      targetData: { targetChapterId: effectiveChapterIdForContext, targetSceneId: effectiveSceneIdForContext },
      aiProfile: activeAIProfile,
      systemPromptText: systemPrompt,
      userQueryText: taskSettings[TASK_KEYS.SYNOPSIS]?.prompt || '',
    });
    setAiContext(contextResult);
  };

  const handleOpenAISuggestionModal = async () => {
    await prepareAIContext();
    setIsAISuggestionModalOpen(true);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('scene_form_modal_title_edit') : t('scene_form_modal_title_create')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('scene_form_modal_desc_edit') : (chapterId ? t('scene_form_modal_desc_create_to_chapter') : t('scene_form_modal_desc_create_to_plan'))}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scene-name" className="text-right">{t('scene_form_modal_label_name')}</Label>
            <Input id="scene-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder={t('scene_form_modal_placeholder_name')} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scene-tags" className="text-right">{t('scene_form_modal_label_tags')}</Label>
            <Input id="scene-tags" value={tags} onChange={(e) => setTags(e.target.value)} className="col-span-3" placeholder={t('scene_form_modal_placeholder_tags')} />
          </div>

          <Tabs defaultValue="outline" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="outline">{t('scene_form_modal_tab_outline')}</TabsTrigger>
              <TabsTrigger value="concepts">{t('scene_form_modal_tab_concepts')}</TabsTrigger>
            </TabsList>
            <TabsContent value="outline">
              <div className="grid grid-cols-1 gap-2 pt-4">
                <div className="relative">
                  <Textarea
                    id="scene-outline" // Changed id
                    value={synopsisText}
                    onChange={(e) => setSynopsisText(e.target.value)}
                    placeholder={t('scene_form_modal_placeholder_outline_textarea')}
                    rows={6} // Increased rows
                    className={showAiFeatures ? "pr-10" : ""}
                  />
                  {showAiFeatures && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700"
                      onClick={handleOpenAISuggestionModal}
                      aria-label={t('scene_form_modal_aria_label_ai_outline')} // Changed aria-label
                    >
                      <WandSparkles className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="concepts">
              <div className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <Label>{t('scene_form_modal_label_context_concepts')}</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-update-context"
                      checked={autoUpdateContext}
                      onCheckedChange={setAutoUpdateContext}
                    />
                    <label
                      htmlFor="auto-update-context"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('scene_form_modal_label_auto_update_context')}
                    </label>
                  </div>
                </div>
                <ScrollArea className="h-32 rounded-md border p-2">
                  {concepts.length > 0 ? concepts.map(concept => (
                    <div key={concept.id} className="flex items-center space-x-2 mb-1">
                      <Checkbox
                        id={`concept-${concept.id}`}
                        checked={selectedContextConcepts.includes(concept.id)}
                        onCheckedChange={() => handleContextConceptChange(concept.id)}
                      />
                      <label
                        htmlFor={`concept-${concept.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {concept.name}
                      </label>
                    </div>
                  )) : <p className="text-xs text-slate-500">{t('scene_form_modal_no_concepts_available')}</p>}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="flex justify-between w-full">
          <div className="flex items-center gap-2">
            {isEditing && sceneToEdit && chapterId && (
              <Button type="button" variant="destructive" size="icon" onClick={() => setIsConfirmDeleteOpen(true)} title={t('tooltip_delete_scene')}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-grow"></div>
            <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
            <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
              {isEditing ? t('save_changes_button') : t('scene_form_modal_button_create')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {sceneToEdit && (
        <ConfirmModal
          open={isConfirmDeleteOpen}
          onOpenChange={setIsConfirmDeleteOpen}
          title={t('scene_form_modal_confirm_delete_title')}
          description={t('scene_form_modal_confirm_delete_description', { sceneName: sceneToEdit.name })}
          onConfirm={handleDeleteScene}
        />
      )}

      {isAISuggestionModalOpen && aiContext && (
        <AISuggestionModal
          isOpen={isAISuggestionModalOpen}
          onClose={() => setIsAISuggestionModalOpen(false)}
          currentText={synopsisText}
          initialQuery={taskSettings[TASK_KEYS.SYNOPSIS]?.prompt || ''}
          novelData={aiContext.contextString} // Pass the generated context string
          novelDataTokens={aiContext.estimatedTokens} // Pass its tokens
          novelDataLevel={aiContext.level} // Pass the level
          // taskKeyForProfile is implicitly handled by AISuggestionModal using getActiveProfile or specific task settings
          onAccept={(suggestion) => {
            setSynopsisText(suggestion);
            setIsAISuggestionModalOpen(false);
          }}
          fieldLabel={t('scene_form_modal_ai_field_label_scene_outline')} // Changed
          // Pass taskKeyForProfile to ensure AISuggestionModal uses the correct profile for *its* token calculations
          // and API call if its internal logic relies on it directly (though it should get it from useSettings)
          taskKeyForProfile={TASK_KEYS.SYNOPSIS} 
        />
      )}
    </Dialog>
  );
};

export default SceneFormModal;
