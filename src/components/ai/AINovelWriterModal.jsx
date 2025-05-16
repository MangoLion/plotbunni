import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  // DialogClose, // No longer explicitly needed if ConfirmModal handles its own closure actions
} from '@/components/ui/dialog';
import ConfirmModal from '@/components/ui/ConfirmModal'; // Import ConfirmModal
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WandSparkles, Database, ChevronDown, ChevronRight, TriangleAlert, Settings2 } from 'lucide-react'; // Added icons
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"; // Added
import { Label } from "@/components/ui/label"; // Added
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added
import { useData } from '../../context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { generateContextWithRetry } from '../../lib/aiContextUtils'; // Added
import { tokenCount } from '../../lib/utils'; // Added

// Constants
const ROLLING_WINDOW_SIZE = 200;
const DEFAULT_SCENE_OPTION_VALUE = "__default__"; // Added for placeholder SelectItem

export const AINovelWriterModal = ({
  isOpen,
  onClose,
  novelData, // { actOrder, acts, chapters, scenes, concepts, novelSynopsis (from useData) }
}) => {
  const { updateScene, novelSynopsis } = useData(); // Added novelSynopsis from useData
  const { 
    systemPrompt, 
    endpointProfiles, 
    activeProfileId: globalActiveProfileId, 
    taskSettings,
    TASK_KEYS,
    getActiveProfile // Added
  } = useSettings();

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [scenesQueue, setScenesQueue] = useState([]);
  const [totalScenesCount, setTotalScenesCount] = useState(0);
  const [scenesWrittenCount, setScenesWrittenCount] = useState(0);
  
  const [currentChapterName, setCurrentChapterName] = useState('');
  const [currentSceneName, setCurrentSceneName] = useState('');
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [errorMessages, setErrorMessages] = useState([]);
  const [generatedContents, setGeneratedContents] = useState(new Map());
  const [hasAttemptedSaveOnStop, setHasAttemptedSaveOnStop] = useState(false);

  // State for memory UI for the current scene being processed
  const [currentSceneTokenBreakdown, setCurrentSceneTokenBreakdown] = useState({ system: 0, query: 0, novelData: 0, currentText: 0 });
  const [currentSceneEstimatedTokens, setCurrentSceneEstimatedTokens] = useState(0);
  const [currentSceneMaxPromptTokens, setCurrentSceneMaxPromptTokens] = useState(4096);
  const [currentSceneNovelContextLevel, setCurrentSceneNovelContextLevel] = useState(0);
  const [isMemoryDetailOpen, setIsMemoryDetailOpen] = useState(false);
  const [currentAIProfile, setCurrentAIProfile] = useState(null);
  const [currentSceneNovelDataContextString, setCurrentSceneNovelDataContextString] = useState(""); // For debugging
  const [isNovelDataCtxOpen, setIsNovelDataCtxOpen] = useState(false); // For new collapsible

  // New state for scene range selection
  const [selectedStartSceneId, setSelectedStartSceneId] = useState('');
  const [selectedEndSceneId, setSelectedEndSceneId] = useState('');
  const [sceneOptions, setSceneOptions] = useState([]);
  const [isRangeSelectorOpen, setIsRangeSelectorOpen] = useState(false);


  const abortControllerRef = useRef(null);
  const confirmActionExecutedRef = useRef(false);

  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  });

  // Effect to set the current AI profile based on task settings
  useEffect(() => {
    if (isOpen) {
      let profileIdToUse = globalActiveProfileId;
      const taskKey = TASK_KEYS.SCENE_TEXT;
      if (taskKey && taskSettings && taskSettings[taskKey]?.profileId) {
        profileIdToUse = taskSettings[taskKey].profileId;
      }
      const activeProf = endpointProfiles?.find(p => p.id === profileIdToUse);
      setCurrentAIProfile(activeProf);
    }
  }, [isOpen, endpointProfiles, globalActiveProfileId, taskSettings, TASK_KEYS]);


  useEffect(() => {
    if (isOpen && novelData) {
      const { actOrder, acts, chapters, scenes } = novelData;
      const options = [];
      let initialProcessingQueue = [];

      if (actOrder && acts && chapters && scenes) {
        actOrder.forEach((actId, actIndex) => {
          const act = acts[actId];
          if (act && act.chapterOrder) {
            act.chapterOrder.forEach((chapterId, chapterIndex) => {
              const chapter = chapters[chapterId];
              if (chapter && chapter.sceneOrder) {
                chapter.sceneOrder.forEach((sceneId, sceneIndex) => {
                  const scene = scenes[sceneId];
                  if (scene) {
                    const sceneDetail = {
                      id: scene.id,
                      name: scene.name || 'Unnamed Scene',
                      content: scene.content || '',
                      chapterId: chapter.id,
                      chapterName: chapter.name || 'Unnamed Chapter',
                      actName: act.name || 'Unnamed Act',
                      originalIndices: { actIndex, chapterIndex, sceneIndex }
                    };
                    initialProcessingQueue.push(sceneDetail);
                    options.push({
                      value: scene.id,
                      label: `${act.name || `Act ${actIndex + 1}`} / ${chapter.name || `Chapter ${chapterIndex + 1}`} / ${scene.name || `Scene ${sceneIndex + 1}`}`,
                      originalIndices: { actIndex, chapterIndex, sceneIndex }
                    });
                  }
                });
              }
            });
          }
        });
      }
      setSceneOptions(options);

      let filteredQueue = [...initialProcessingQueue];
      // Adjust filtering logic to handle DEFAULT_SCENE_OPTION_VALUE
      const effectiveStartSceneId = selectedStartSceneId === DEFAULT_SCENE_OPTION_VALUE ? '' : selectedStartSceneId;
      const effectiveEndSceneId = selectedEndSceneId === DEFAULT_SCENE_OPTION_VALUE ? '' : selectedEndSceneId;

      if (effectiveStartSceneId) {
        const startIndex = initialProcessingQueue.findIndex(s => s.id === effectiveStartSceneId);
        if (startIndex !== -1) {
          filteredQueue = initialProcessingQueue.slice(startIndex);
        }
      }

      if (effectiveEndSceneId) {
        // If a start scene is selected, search within the already sliced queue. Otherwise, search in the initial full queue.
        const queueToSearchForEnd = effectiveStartSceneId ? filteredQueue : initialProcessingQueue;
        const endIndexInThatQueue = queueToSearchForEnd.findIndex(s => s.id === effectiveEndSceneId);
        
        if (endIndexInThatQueue !== -1) {
          if (effectiveStartSceneId) {
            // If start was selected, slice the `filteredQueue` (which starts from `effectiveStartSceneId`)
            filteredQueue = filteredQueue.slice(0, endIndexInThatQueue + 1);
          } else {
            // If no start was selected, slice the `initialProcessingQueue`
            const originalEndIndex = initialProcessingQueue.findIndex(s => s.id === effectiveEndSceneId);
             if (originalEndIndex !== -1) { // Should always be found if endIndexInThatQueue was found
                filteredQueue = initialProcessingQueue.slice(0, originalEndIndex + 1);
             }
          }
        }
      }
      
      setScenesQueue(filteredQueue);
      setTotalScenesCount(filteredQueue.length);

      // Reset generation state as the queue/range might have changed
      setIsGenerating(false);
      setCurrentSceneIndex(0);
      setScenesWrittenCount(0);
      // Don't clear errorMessages or generatedContents here, only on explicit start
      setCurrentStreamingText('');
      
      if (filteredQueue.length > 0) {
        setCurrentChapterName(filteredQueue[0].chapterName);
        setCurrentSceneName(filteredQueue[0].name);
      } else {
        setCurrentChapterName('');
        setCurrentSceneName('');
      }
      
      // Reset memory UI states for the (potentially new) first scene in queue
      setCurrentSceneTokenBreakdown({ system: 0, query: 0, novelData: 0, currentText: 0 });
      setCurrentSceneEstimatedTokens(0);
      setCurrentSceneMaxPromptTokens(currentAIProfile?.contextLength || 4096);
      setCurrentSceneNovelContextLevel(0);
      setIsMemoryDetailOpen(false); // Close memory details when range changes

    } else if (!isOpen) {
        // Full reset when modal closes
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsGenerating(false);
        setSceneOptions([]);
        setSelectedStartSceneId(DEFAULT_SCENE_OPTION_VALUE); // Reset to default placeholder value
        setSelectedEndSceneId(DEFAULT_SCENE_OPTION_VALUE);   // Reset to default placeholder value
        setIsRangeSelectorOpen(false);
        setScenesQueue([]);
        setTotalScenesCount(0);
        setScenesWrittenCount(0);
        setCurrentSceneIndex(0);
        setCurrentChapterName('');
        setCurrentSceneName('');
        setErrorMessages([]);
        setCurrentStreamingText('');
        setGeneratedContents(new Map());
        setHasAttemptedSaveOnStop(false);
        setCurrentSceneTokenBreakdown({ system: 0, query: 0, novelData: 0, currentText: 0 });
        setCurrentSceneEstimatedTokens(0);
        setCurrentSceneMaxPromptTokens(currentAIProfile?.contextLength || 4096);
        setCurrentSceneNovelContextLevel(0);
        setIsMemoryDetailOpen(false);
        setIsNovelDataCtxOpen(false);
    }
  }, [isOpen, novelData, currentAIProfile, selectedStartSceneId, selectedEndSceneId]);

  const getActiveEndpointConfig = () => { // This function now primarily uses currentAIProfile state
    if (!currentAIProfile) {
      setErrorMessages(prev => [...prev, "No AI profile determined."]);
      return null;
    }
    if (!currentAIProfile.endpointUrl) {
      setErrorMessages(prev => [...prev, `AI Profile ${currentAIProfile.name} (ID: ${currentAIProfile.id}) has no endpoint URL configured.`]);
      return null;
    }
    return {
      url: currentAIProfile.endpointUrl,
      token: currentAIProfile.apiToken || '',
      model: currentAIProfile.modelName,
      maxOutputTokens: currentAIProfile.maxOutputTokens || 1024,
      contextLength: currentAIProfile.contextLength || 4096,
    };
  };

  const processSceneQueue = async () => {
    if (currentSceneIndex >= scenesQueue.length || !currentAIProfile) {
      setIsGenerating(false);
      return;
    }

    const currentSceneData = scenesQueue[currentSceneIndex];
    setCurrentChapterName(currentSceneData.chapterName);
    setCurrentSceneName(currentSceneData.name);
    setCurrentStreamingText('');
    setCurrentSceneNovelDataContextString(''); // Reset for current scene

    const endpointConfig = getActiveEndpointConfig(); // Uses currentAIProfile
    if (!endpointConfig) {
      setIsGenerating(false);
      return;
    }
    
    const sceneTextPrompt = taskSettings[TASK_KEYS.SCENE_TEXT]?.prompt || "Write the scene.";

    // The currentRunScenes local variable is no longer needed here, 
    // as generateContextWithRetry now handles merging novelData.scenes with generatedContents.

    const contextResult = await generateContextWithRetry({
      strategy: 'sceneText',
      baseData: { 
        ...(novelData || {}), 
        scenes: novelData?.scenes, // Pass original scenes from novelData prop
        currentGeneratedContents: generatedContents, // Pass the map of currently generated contents
        novelSynopsis 
      },
      targetData: { 
        targetChapterId: currentSceneData.chapterId, 
        targetSceneId: currentSceneData.id, 
        currentSceneText: currentSceneData.content // Use original content of the scene to be written
      },
      aiProfile: currentAIProfile,
      systemPromptText: systemPrompt,
      userQueryText: sceneTextPrompt,
    });

    if (contextResult.error || contextResult.level === -1) {
      setErrorMessages(prev => [...prev, `Failed to generate context for scene ${currentSceneData.name}: ${contextResult.error || 'Context too large.'}`]);
      setCurrentSceneIndex(prev => prev + 1); // Skip to next scene
      return;
    }
    
    setCurrentSceneNovelContextLevel(contextResult.level);
    setCurrentSceneNovelDataContextString(contextResult.contextString || ""); // Store for display
    
    const systemPromptTokens = tokenCount(systemPrompt);
    const queryTokens = tokenCount(sceneTextPrompt);
    // currentText is not explicitly added to payload by default in AINovelWriter, so 0 for breakdown unless logic changes
    const currentTextInPayloadTokens = 0; 
    
    setCurrentSceneTokenBreakdown({
      system: systemPromptTokens,
      query: queryTokens,
      novelData: contextResult.estimatedTokens,
      currentText: currentTextInPayloadTokens 
    });
    const totalEstTokens = systemPromptTokens + queryTokens + contextResult.estimatedTokens + currentTextInPayloadTokens;
    setCurrentSceneEstimatedTokens(totalEstTokens);

    const safetyBuffer = 50; // Consistent with AISuggestionModal
    const calculatedMaxPrompt = (endpointConfig.contextLength || 4096) - (endpointConfig.maxOutputTokens || 1024) - safetyBuffer;
    setCurrentSceneMaxPromptTokens(calculatedMaxPrompt > 0 ? calculatedMaxPrompt : 200);

    if (totalEstTokens > calculatedMaxPrompt) {
      setErrorMessages(prev => [...prev, `Prompt for scene ${currentSceneData.name} too large (${totalEstTokens}/${calculatedMaxPrompt} tokens) even after context retry. Skipping.`]);
      setCurrentSceneIndex(prev => prev + 1);
      return;
    }

    let userContent = "";
    if (contextResult.contextString && contextResult.contextString.trim() !== '') {
      userContent += `Novel Data Context (Level ${contextResult.level}):\n${contextResult.contextString}\n\n---\n`;
    }
    userContent += `User Query (Instructions for this scene):\n${sceneTextPrompt}`;

    const payload = {
      model: endpointConfig.model,
      max_tokens: endpointConfig.maxOutputTokens,
      messages: [
        { role: 'system', content: systemPrompt || "You are a helpful assistant." },
        { role: 'user', content: userContent },
      ],
      stream: true,
    };

    try {
      const response = await fetch(endpointConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${endpointConfig.token}`,
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullSceneResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (abortControllerRef.current && abortControllerRef.current.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
            const eventString = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);

            if (eventString.startsWith('data: ')) {
                const jsonData = eventString.substring('data: '.length).trim();
                if (jsonData === '[DONE]') break;
                try {
                    const parsed = JSON.parse(jsonData);
                    if (parsed.choices && parsed.choices[0]?.delta?.content) {
                        const chunk = parsed.choices[0].delta.content;
                        fullSceneResponse += chunk;
                        setCurrentStreamingText(prev => (prev + chunk).slice(-ROLLING_WINDOW_SIZE));
                    }
                } catch (e) {
                    console.error('Error parsing stream JSON chunk:', e, jsonData);
                    setErrorMessages(prev => [...prev, `Error parsing AI response chunk for scene ${currentSceneData.name}.`]);
                }
            }
            boundary = buffer.indexOf('\n\n');
        }
      }
      
      if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
        setErrorMessages(prev => [...prev, `Generation stopped for scene: ${currentSceneData.name}`]);
      } else {
        // Store content locally instead of immediate updateScene
        setGeneratedContents(prevMap => new Map(prevMap).set(currentSceneData.id, fullSceneResponse));
        setScenesWrittenCount(prev => prev + 1);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        setErrorMessages(prev => [...prev, `Generation aborted for scene: ${currentSceneData.name}`]);
      } else {
        console.error('Streaming error:', error);
        setErrorMessages(prev => [...prev, `Error during generation for scene ${currentSceneData.name}: ${error.message}`]);
      }
    } finally {
      if (isGenerating && (!abortControllerRef.current || !abortControllerRef.current.signal.aborted)) {
        setCurrentSceneIndex(prev => prev + 1); 
      }
    }
  };
  
  useEffect(() => {
    if (isGenerating && currentSceneIndex < scenesQueue.length) {
        if (abortControllerRef.current) { 
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        processSceneQueue();
    } else if (isGenerating && currentSceneIndex >= scenesQueue.length && scenesQueue.length > 0) {
        // All scenes processed, now batch update
        setIsGenerating(false); 
        if (generatedContents.size > 0) {
            let savedCount = 0;
            generatedContents.forEach((content, sceneId) => {
                updateScene({ id: sceneId, content: content });
                savedCount++;
            });
            setErrorMessages(prev => [...prev, `Successfully generated and saved ${savedCount} of ${totalScenesCount} scenes!`]);
            setGeneratedContents(new Map()); // Clear after successful full save
        } else if (scenesWrittenCount === totalScenesCount && totalScenesCount > 0) { 
             setErrorMessages(prev => [...prev, `Novel generation process complete. ${scenesWrittenCount} scenes processed.`]);
        } else if (totalScenesCount === 0) { // Handles case where queue was empty from start
             setErrorMessages(prev => [...prev, "No scenes were available to process."]);
        }
    } else if (isGenerating && scenesQueue.length === 0) { // Edge case: started with no scenes
        setIsGenerating(false);
        setErrorMessages(prev => [...prev, "No scenes to process."]);
    }
    
    // Cleanup function
    return () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };
  }, [isGenerating, currentSceneIndex]); // Removed scenesQueue from deps to avoid re-triggering on initial setup

  const handleStartStopGeneration = () => {
    if (isGenerating) { // Stop
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      // setErrorMessages(prev => [...prev, "Generation stopped by user."]); // Message moved to promptAndSavePartial
      promptAndSavePartial("stopped by user"); 
      setHasAttemptedSaveOnStop(true);
    } else { // Start
      if (scenesQueue.length === 0) {
        setErrorMessages(["No scenes found in the novel to write."]);
        return;
      }
      setErrorMessages([]);
      setScenesWrittenCount(0);
      setCurrentSceneIndex(0);
      setGeneratedContents(new Map()); // Clear any previous partial data before new start
      setHasAttemptedSaveOnStop(false);
      setIsGenerating(true); 
    }
  };

  const promptAndSavePartial = (actionContext = "interrupted") => {
    if (actionContext === "stopped by user") {
        setErrorMessages(prev => [...prev, "Generation stopped by user."]);
    } else if (actionContext === "interrupted by closing modal") {
        setErrorMessages(prev => [...prev, "Generation interrupted."]);
    }


    if (generatedContents.size > 0) {
      confirmActionExecutedRef.current = false; // Reset before showing modal
      setConfirmModalState({
        isOpen: true,
        title: "Save Partial Progress?",
        description: `AI writing was ${actionContext}. Do you want to save the ${generatedContents.size} scene(s) written so far?`,
        confirmText: "Save Progress",
        cancelText: "Discard Progress",
        onConfirm: () => {
          let savedCount = 0;
          generatedContents.forEach((content, sceneId) => {
            updateScene({ id: sceneId, content: content });
            savedCount++;
          });
          setErrorMessages(prev => [...prev, `Saved ${savedCount} partially generated scene(s).`]);
          setGeneratedContents(new Map()); 
          confirmActionExecutedRef.current = true;
        },
      });
    } else {
      // No content to save, ensure it's cleared if action implies it (e.g. stop)
    // This path means no prompt will be shown.
    // If called from stop/close, and no content, it's fine.
    }
  };

  const getSceneComparableOrder = (sceneId) => {
    if (!sceneId || sceneOptions.length === 0) return null;
    const sceneDetail = sceneOptions.find(s => s.value === sceneId);
    if (!sceneDetail || !sceneDetail.originalIndices) return null;
    const { actIndex, chapterIndex, sceneIndex } = sceneDetail.originalIndices;
    const pad = (num) => String(num).padStart(3, '0'); // Pad for correct string comparison
    return `${pad(actIndex)}_${pad(chapterIndex)}_${pad(sceneIndex)}`;
  };

  const isStartAfterEnd = () => {
    const effectiveStartSceneId = selectedStartSceneId === DEFAULT_SCENE_OPTION_VALUE ? '' : selectedStartSceneId;
    const effectiveEndSceneId = selectedEndSceneId === DEFAULT_SCENE_OPTION_VALUE ? '' : selectedEndSceneId;

    if (!effectiveStartSceneId || !effectiveEndSceneId) return false;
    
    const startOrder = getSceneComparableOrder(effectiveStartSceneId);
    const endOrder = getSceneComparableOrder(effectiveEndSceneId);
    return startOrder && endOrder && startOrder > endOrder;
  };

  const progressValue = totalScenesCount > 0 ? (scenesWrittenCount / totalScenesCount) * 100 : 0;

  const handleCloseModal = () => {
    if (isGenerating) { 
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsGenerating(false); 
        if (!hasAttemptedSaveOnStop) { 
            promptAndSavePartial("interrupted by closing modal");
        }
    } else {
        // Not generating.
        // If stop button was clicked, hasAttemptedSaveOnStop is true.
        // promptAndSavePartial would have been called, and generatedContents handled.
        // If generation completed successfully, generatedContents is cleared.
        // If generation stopped due to error (not user stop), and not all scenes done:
        if (!hasAttemptedSaveOnStop && generatedContents.size > 0 && scenesWrittenCount < totalScenesCount) {
             promptAndSavePartial("interrupted before full completion");
        } else if (generatedContents.size > 0) {
            // Fallback: if there's still content and no other path handled it, clear it on close.
            // This might happen if promptAndSavePartial was called, user cancelled, and modal wasn't closed immediately.
            // The onOpenChange of ConfirmModal should handle this.
        }
    }
    onClose();
  };

  return (
    <> {/* Fragment to hold Dialog and ConfirmModal */}
      <Dialog open={isOpen && !confirmModalState.isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        {/* Main Dialog Content, only show if confirm modal is NOT open to prevent overlap issues */}
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl w-[90vw] h-[85vh] flex flex-col p-0"> {/* Added h-[85vh] */}
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center">
              <WandSparkles className="mr-2 h-5 w-5 text-primary" />
              AI Novel Writer
            </DialogTitle>
            <DialogDescription>
              The AI will attempt to write your entire novel, one scene at a time. This process may take a while.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-grow">
            <div className="px-6 py-4 space-y-4">
              {/* Scene Range Selector Collapsible */}
              <Collapsible open={isRangeSelectorOpen} onOpenChange={setIsRangeSelectorOpen} className="border-b pb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent">
                    {isRangeSelectorOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                    <Settings2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    Select Scene Range (Optional)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="startScene" className="text-xs">Start Scene</Label>
                      <Select 
                        value={selectedStartSceneId || DEFAULT_SCENE_OPTION_VALUE} 
                        onValueChange={(value) => setSelectedStartSceneId(value === DEFAULT_SCENE_OPTION_VALUE ? '' : value)} 
                        disabled={isGenerating}
                      >
                        <SelectTrigger id="startScene">
                          <SelectValue placeholder="From First Scene" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_SCENE_OPTION_VALUE}>From First Scene</SelectItem>
                          {sceneOptions.map(option => (
                            <SelectItem key={`start-${option.value}`} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="endScene" className="text-xs">End Scene</Label>
                      <Select 
                        value={selectedEndSceneId || DEFAULT_SCENE_OPTION_VALUE} 
                        onValueChange={(value) => setSelectedEndSceneId(value === DEFAULT_SCENE_OPTION_VALUE ? '' : value)} 
                        disabled={isGenerating}
                      >
                        <SelectTrigger id="endScene">
                          <SelectValue placeholder="To Last Scene" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_SCENE_OPTION_VALUE}>To Last Scene</SelectItem>
                          {sceneOptions.map(option => (
                            <SelectItem key={`end-${option.value}`} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isStartAfterEnd() && (
                    <p className="text-xs text-destructive text-center pt-1">
                      Start scene cannot be after the end scene.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Memory Progress Bar & Details for Current Scene */}
              {isGenerating && scenesQueue[currentSceneIndex] && (
                <>
                  <div className="flex items-center gap-2 py-3 border-b">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <Progress
                      value={currentSceneMaxPromptTokens > 0 ? (currentSceneEstimatedTokens / currentSceneMaxPromptTokens) * 100 : 0}
                      className={`w-full [&>div]:transition-all [&>div]:duration-500 ${
                        currentSceneMaxPromptTokens > 0 && currentSceneEstimatedTokens / currentSceneMaxPromptTokens >= 1 ? ' [&>div]:bg-destructive' :
                        currentSceneMaxPromptTokens > 0 && currentSceneEstimatedTokens / currentSceneMaxPromptTokens >= 0.5 ? ' [&>div]:bg-yellow-500' : ''
                      }`}
                    />
                  </div>
                  <Collapsible open={isMemoryDetailOpen} onOpenChange={setIsMemoryDetailOpen} className="py-2 border-b text-xs">
                    <CollapsibleTrigger asChild>
                      <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground flex items-center">
                        Memory Details for: "{scenesQueue[currentSceneIndex].name}" (Lvl: {currentSceneNovelContextLevel > 0 ? currentSceneNovelContextLevel : currentSceneNovelContextLevel === -1 ? 'ERR' : 'N/A'})
                        {isMemoryDetailOpen ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-1 text-muted-foreground">
                      {currentSceneEstimatedTokens > 0 && currentAIProfile ? (
                        <>
                          <p>System Prompt: {(currentSceneTokenBreakdown.system / currentSceneEstimatedTokens * 100).toFixed(1)}% ({currentSceneTokenBreakdown.system} tokens)</p>
                          <p>Base Query (Scene Instructions): {(currentSceneTokenBreakdown.query / currentSceneEstimatedTokens * 100).toFixed(1)}% ({currentSceneTokenBreakdown.query} tokens)</p>
                          {currentSceneTokenBreakdown.novelData > 0 && (
                            <p className="flex items-center">
                              {currentSceneNovelContextLevel && currentSceneNovelContextLevel > 1 && currentSceneNovelContextLevel !== -1 && (
                                <TriangleAlert className="h-3 w-3 mr-1 text-yellow-500" />
                              )}
                              {currentSceneNovelContextLevel === -1 && (
                                 <TriangleAlert className="h-3 w-3 mr-1 text-destructive" />
                              )}
                              <span className={
                                currentSceneNovelContextLevel === -1 ? 'text-destructive' :
                                currentSceneNovelContextLevel === 4 ? 'text-destructive' : // Assuming level 4 is also an error/bad state
                                currentSceneNovelContextLevel === 2 || currentSceneNovelContextLevel === 3 ? 'text-yellow-600 dark:text-yellow-400' : ''
                              }>
                                Novel Data Context (Lvl {currentSceneNovelContextLevel === -1 ? 'ERR' : currentSceneNovelContextLevel}):
                              </span>
                              <span className="ml-1">
                                {(currentSceneTokenBreakdown.novelData / currentSceneEstimatedTokens * 100).toFixed(1)}% ({currentSceneTokenBreakdown.novelData} tokens)
                              </span>
                            </p>
                          )}
                          {currentSceneNovelContextLevel && currentSceneNovelContextLevel > 1 && currentSceneNovelContextLevel !== -1 && ( // Exclude error level -1
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 pl-4">
                              (Context automatically reduced to fit model limits. Level 1 is most detailed.)
                            </p>
                          )}
                          {currentSceneNovelContextLevel === -1 && (
                             <p className="text-xs text-destructive pl-4">
                              (Failed to generate context, likely too large even after trimming.)
                            </p>
                          )}
                          <p className="pt-1 border-t mt-1 font-semibold">Total Estimated Input: {currentSceneEstimatedTokens} tokens</p>
                          <p className="text-slate-500 dark:text-slate-400">Max Output Tokens (Model Setting): {currentAIProfile.maxOutputTokens || 'N/A'} tokens</p>
                          <p className="text-slate-500 dark:text-slate-400">Safety Buffer: {50} tokens</p>
                          <p>Available for Input Prompt: {currentSceneMaxPromptTokens} tokens</p>
                          <p className="text-slate-500 dark:text-slate-400">Total Model Context Length: {currentAIProfile.contextLength || 'N/A'} tokens</p>
                        </>
                      ) : <p>Token details not yet available for this scene. Ensure AI profile is configured.</p>}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Collapsible for Novel Data Context String */}
                  <Collapsible open={isNovelDataCtxOpen} onOpenChange={setIsNovelDataCtxOpen} className="py-2 border-b text-xs">
                    <CollapsibleTrigger asChild>
                      <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground flex items-center">
                        View Full Prompt Context for "{scenesQueue[currentSceneIndex].name}"
                        {isNovelDataCtxOpen ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <Textarea
                        readOnly
                        value={currentSceneNovelDataContextString}
                        className="h-40 w-full resize-none bg-muted/30 text-xs"
                        placeholder="Novel data context will appear here..."
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Overall Progress:</span>
                  <span>
                    {scenesQueue.length > 0 || totalScenesCount > 0 ? 
                      `${scenesWrittenCount} / ${totalScenesCount} scenes` : 
                      "No scenes selected/available"
                    }
                  </span>
                </div>
                <Progress value={progressValue} className="w-full" />
              </div>

              <div className="text-sm text-muted-foreground">
                {isGenerating && currentSceneIndex < totalScenesCount ? (
                  <p>Currently writing: Chapter "{currentChapterName}", Scene "{currentSceneName}"...</p>
                ) : scenesWrittenCount === totalScenesCount && totalScenesCount > 0 && !isGenerating ? (
                  <p>Novel generation complete!</p>
                ) : !isGenerating && scenesWrittenCount > 0 && scenesWrittenCount < totalScenesCount ? (
                  <p>Generation paused. {scenesWrittenCount} of {totalScenesCount} scenes written.</p>
                ) : !isGenerating && scenesWrittenCount === 0 && totalScenesCount > 0 ? (
                  <p>Ready to start. {totalScenesCount} scenes in queue.</p>
                ) : !isGenerating && totalScenesCount === 0 ? (
                  <p>No scenes in queue. Add scenes in the 'Plan' tab.</p>
                ) : (
                  <p>Status unavailable.</p>
                )}
              </div>

              {isGenerating && (
                <div>
                  <label htmlFor="rollingTextDisplay" className="text-sm font-medium">Live AI Output (last {ROLLING_WINDOW_SIZE} chars):</label>
                <Textarea
                  id="rollingTextDisplay"
                  readOnly
                  value={currentStreamingText}
                  className="mt-1 h-20 w-full resize-none bg-muted/50 text-xs [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] blur-sm hover:blur-none transition-all duration-200"
                  placeholder="AI output will appear here..."
                />
              </div>
            )}

            {errorMessages.length > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <h4 className="font-semibold text-destructive mb-1">Errors:</h4>
                <ul className="list-disc list-inside text-destructive text-xs space-y-1">
                  {errorMessages.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          </ScrollArea> {/* Closing ScrollArea tag added here */}

          <DialogFooter className="p-6 pt-4 border-t mt-auto">
            <Button variant="outline" onClick={handleCloseModal} disabled={isGenerating && scenesQueue.length > 0 && totalScenesCount > 0}>
              Close
            </Button>
            <Button 
              onClick={handleStartStopGeneration} 
              disabled={
                (totalScenesCount === 0 && !isGenerating && scenesQueue.length === 0) || 
                isStartAfterEnd() ||
                (isGenerating && scenesQueue.length === 0) // Also disable if generating but queue became empty (shouldn't happen)
              }
            >
              {isGenerating ? 'Stop Writing' : 'Start Writing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmModalState.isOpen}
        onOpenChange={(openState) => {
          if (!openState) { // Modal is closing
            if (!confirmActionExecutedRef.current && confirmModalState.isOpen) { 
              // It was open, it's now closing, AND confirm action didn't run (i.e. cancel)
              setErrorMessages(prev => [...prev, "Partial progress was not saved."]);
              setGeneratedContents(new Map()); // Clear if cancelled
            }
            confirmActionExecutedRef.current = false; // Reset for next time
          }
          setConfirmModalState(prev => ({ ...prev, isOpen: openState }));
        }}
        title={confirmModalState.title}
        description={confirmModalState.description}
        onConfirm={() => { 
          if (confirmModalState.onConfirm) {
            confirmModalState.onConfirm(); 
          }
        }}
        confirmText={confirmModalState.confirmText}
        cancelText={confirmModalState.cancelText}
      />
    </>
  );
};
