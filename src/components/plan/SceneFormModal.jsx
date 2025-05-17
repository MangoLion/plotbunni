import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added
import { generateContextWithRetry } from '../../lib/aiContextUtils'; // Added

const SceneFormModal = ({ open, onOpenChange, sceneToEdit, chapterId }) => {
  const {
    addSceneToChapter,
    updateScene,
    concepts, // All concepts from DataContext
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
  const [synopsisText, setSynopsisText] = useState(''); // Renamed from synopsis to avoid conflict
  const [selectedContextConcepts, setSelectedContextConcepts] = useState([]); // Array of concept IDs
  const [autoUpdateContext, setAutoUpdateContext] = useState(true);
  const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false);
  
  // State for AI suggestion context
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
      console.error("Chapter ID is required to create a new scene.");
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
  
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Determine effective chapter and scene IDs for context generation
  const prepareAIContext = async () => {
    if (!acts || !chapters || !scenes || !concepts || !actOrder) {
      setAiContext({ contextString: "", estimatedTokens: 0, level: 0, error: "Base novel data not fully loaded." });
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
      setAiContext({ contextString: "", estimatedTokens: 0, level: 0, error: "No active AI profile found." });
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
          <DialogTitle>{isEditing ? 'Edit Scene' : 'Create New Scene'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this scene.' : `Add a new scene to ${chapterId ? 'the chapter' : 'the plan'}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scene-name" className="text-right">Name*</Label>
            <Input id="scene-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="Scene Name or Number" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="scene-tags" className="text-right">Tags</Label>
            <Input id="scene-tags" value={tags} onChange={(e) => setTags(e.target.value)} className="col-span-3" placeholder="e.g., action, dialogue (comma-separated)" />
          </div>

          <Tabs defaultValue="outline" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="outline">Outline</TabsTrigger>
              <TabsTrigger value="concepts">Concepts</TabsTrigger>
            </TabsList>
            <TabsContent value="outline">
              <div className="grid grid-cols-1 gap-2 pt-4">
                <div className="relative">
                  <Textarea
                    id="scene-outline" // Changed id
                    value={synopsisText}
                    onChange={(e) => setSynopsisText(e.target.value)}
                    placeholder="Brief summary of what happens in the scene (Outline)." // Updated placeholder
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
                      aria-label="Get AI Suggestion for Outline" // Changed aria-label
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
                  <Label>Context (Relevant Concepts)</Label>
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
                      Auto-update
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
                  )) : <p className="text-xs text-slate-500">No concepts available.</p>}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
            {isEditing ? 'Save Changes' : 'Create Scene'}
          </Button>
        </DialogFooter>
      </DialogContent>
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
          fieldLabel="Scene Outline" // Changed
          // Pass taskKeyForProfile to ensure AISuggestionModal uses the correct profile for *its* token calculations
          // and API call if its internal logic relies on it directly (though it should get it from useSettings)
          taskKeyForProfile={TASK_KEYS.SYNOPSIS} 
        />
      )}
    </Dialog>
  );
};

export default SceneFormModal;
