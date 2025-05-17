import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { AISuggestionModal } from '../ai/AISuggestionModal';
import { AINovelWriterModal } from '../ai/AINovelWriterModal';
import { WandSparkles, Sparkles, Type as TypeIcon, NotebookText } from 'lucide-react'; // Added TypeIcon and NotebookText
import Markdown from 'react-markdown';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent, CardHeader } from '../ui/card';
import { generateContextWithRetry } from '../../lib/aiContextUtils'; // Added
import { removeIndentation } from '../../lib/utils'; // Added

// Helper component for editable titles
const EditableTitle = ({ initialValue, onSave, placeholder, className, inputClassName, tag: Component = 'div' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        setIsEditing(false);
        // Allow saving empty titles if placeholder logic handles it, or revert
        // For simplicity, we save what's there. Validation can be added.
        onSave(value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission if wrapped in form
            handleSave();
        } else if (e.key === 'Escape') {
            setValue(initialValue);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`${inputClassName || className || ''} p-0 h-auto border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none`}
            />
        );
    }

    return (
        <Component
            onClick={() => setIsEditing(true)}
            className={`${className} cursor-pointer hover:bg-muted/30 p-1 -m-1 rounded-md transition-colors`} // Negative margin for better click area
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsEditing(true); }}}
        >
            {value || <span className="text-muted-foreground italic">{placeholder}</span>}
        </Component>
    );
};

// Helper component for auto-expanding textarea, now forwarding refs
const AutoExpandingTextarea = React.forwardRef(({
    sceneId,
    initialValue,
    placeholder,
    // novelContextString, // This will be generated internally now
    sceneName,
    sceneSynopsis, // Retained for potential use, though current scene content is primary
    // Add base data props needed for context generation
    actOrder, 
    acts, 
    chapters, 
    scenesData, // Renamed to avoid conflict with useData().scenes
    concepts,
    // Pass all novel detail fields
    novelDetailsForContext
}, forwardedRef) => { // Renamed ref to forwardedRef for clarity
    const internalTextareaRef = useRef(null); // For the <Textarea> element itself
    const popoverTriggerRef = useRef(null); // Ref for Popover trigger
    const popoverContentRef = useRef(null); // Ref for Popover content
    const [text, setText] = useState(initialValue || '');
    const [isEditingScene, setIsEditingScene] = useState(false); // New state for editing
    const { updateScene, scenes: scenesFromHook } = useData(); // scenesFromHook to differentiate
    const { taskSettings, TASK_KEYS, systemPrompt, getActiveProfile, showAiFeatures } = useSettings();
    const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false);
    const [aiSceneContext, setAiSceneContext] = useState({
        contextString: "",
        estimatedTokens: 0,
        level: 0,
        error: null,
    });

    useEffect(() => {
        setText(initialValue || '');
        setAiSceneContext({ contextString: "", estimatedTokens: 0, level: 0, error: null }); // Reset on initialValue change
    }, [initialValue]);

    // Effect for resizing and focusing
    useEffect(() => {
        if (isEditingScene && internalTextareaRef.current) {
            const textarea = internalTextareaRef.current;
            textarea.focus(); // Focus when entering edit mode

            // Resize logic
            textarea.style.height = '0px'; // Reset height
            setTimeout(() => { // Defer to next tick
                if (textarea) { // Check ref again
                    textarea.style.height = textarea.scrollHeight + 'px';
                }
            }, 0);
        }
    }, [isEditingScene, text, initialValue]); // Ensure it runs if initialValue changes while editing too

    const handleChange = (e) => {
        setText(e.target.value);
    };

    const handleBlur = (e) => {
        // Check if the focus is moving to the popover trigger or inside the popover content
        if (
            (popoverTriggerRef.current && popoverTriggerRef.current.contains(e.relatedTarget)) ||
            (popoverContentRef.current && popoverContentRef.current.contains(e.relatedTarget))
        ) {
            // Focus is moving to the popover or its trigger, so don't switch out of edit mode
            // and ensure the textarea remains focused if possible, or at least don't hide it.
            if(internalTextareaRef.current) internalTextareaRef.current.focus(); // Re-focus textarea
            return;
        }

        // Also check if focus is moving to the AI suggestion modal's trigger (wand icon)
        // This requires a ref on the wand button if it's not covered by a similar Popover logic.
        // For now, assuming the onMouseDown on wand button is sufficient.

        setIsEditingScene(false); // Exit editing mode
        const originalScene = scenesFromHook[sceneId];
        if (originalScene && originalScene.content !== text) {
            updateScene({ id: sceneId, content: text });
        }
    };

    const handleMarkdownClick = () => {
        setIsEditingScene(true);
    };

    const prepareAISceneContext = async () => {
        if (!actOrder || !acts || !chapters || !scenesData || !concepts) {
            setAiSceneContext({ contextString: "", estimatedTokens: 0, level: 0, error: "Base novel data for scene context not fully loaded." });
            return;
        }
        const activeAIProfile = getActiveProfile();
        if (!activeAIProfile) {
            setAiSceneContext({ contextString: "", estimatedTokens: 0, level: 0, error: "No active AI profile found for scene context." });
            return;
        }

        // Find current chapter ID for the scene
        let currentChapterId = null;
        for (const act of Object.values(acts)) {
            if (act.chapterOrder) {
                for (const chapId of act.chapterOrder) {
                    const chapter = chapters[chapId];
                    if (chapter?.sceneOrder?.includes(sceneId)) {
                        currentChapterId = chapId;
                        break;
                    }
                }
            }
            if (currentChapterId) break;
        }
        if (!currentChapterId) {
             setAiSceneContext({ contextString: "", estimatedTokens: 0, level: 0, error: "Could not determine current chapter for the scene." });
            return;
        }

        const contextResult = await generateContextWithRetry({
            strategy: 'sceneText',
            baseData: { actOrder, acts, chapters, scenes: scenesData, concepts, novelDetails: novelDetailsForContext }, // Pass novelDetails object
            targetData: { targetChapterId: currentChapterId, targetSceneId: sceneId, currentSceneText: text },
            aiProfile: activeAIProfile,
            systemPromptText: systemPrompt,
            userQueryText: taskSettings[TASK_KEYS.SCENE_TEXT]?.prompt || '',
        });
        setAiSceneContext(contextResult);
    };

    const handleOpenAISuggestionModal = async () => {
        await prepareAISceneContext();
        setIsAISuggestionModalOpen(true);
    };
    
    const handleAcceptAISuggestion = (suggestion) => {
        setText(suggestion);
        updateScene({ id: sceneId, content: suggestion });
        setIsAISuggestionModalOpen(false);
    };

    // The forwardedRef is applied to the outermost div of this component
    // internalTextareaRef is for the <Textarea> itself

    return (
        <div className="relative group" ref={forwardedRef}> {/* Apply forwardedRef to the outermost div */}
            {isEditingScene ? (
                <>
                    <Textarea
                        ref={internalTextareaRef} // Use internal ref for the textarea
                        value={text}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={placeholder || "Write your scene here..."}
                        className="w-full resize-none overflow-hidden text-base leading-relaxed focus-visible:ring-1 pr-10 transition-all duration-200 ease-in-out" // Removed pl-10, not needed for top-right button
                    />
                    {/* Markdown Help Popover Button */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                ref={popoverTriggerRef} // Assign ref
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700"
                                onMouseDown={(e) => e.preventDefault()} 
                                aria-label="Markdown Formatting Help"
                            >
                                <TypeIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent ref={popoverContentRef} className="w-80" side="bottom" align="end"> {/* Added side and align for better positioning */}
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Markdown Basics</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Simple formatting syntax.
                                    </p>
                                </div>
                                <div className="grid gap-2 text-sm">
                                    <div className="grid grid-cols-2 items-center gap-4"><span>`# Heading 1`</span> <span><h1>Heading 1</h1></span></div>
                                    <div className="grid grid-cols-2 items-center gap-4"><span>`## Heading 2`</span> <span><h2>Heading 2</h2></span></div>
                                    <div className="grid grid-cols-2 items-center gap-4"><span>`*italic*`</span> <span><em>italic</em></span></div>
                                    <div className="grid grid-cols-2 items-center gap-4"><span>`**bold**`</span> <span><strong>bold</strong></span></div>
                                    <div className="grid grid-cols-2 items-center gap-4"><span>`- item`</span> <span><li>list item</li></span></div>
                                    <div className="grid grid-cols-2 items-center gap-4"><span>`---`</span> <hr /></div>
                                    <div className="grid grid-cols-2 items-center gap-4"><span>`[text](url)`</span> <a href="#">link</a></div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* AI Suggestion Button */}
                    {showAiFeatures && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute bottom-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700" // Remains bottom-right
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleOpenAISuggestionModal}
                            aria-label="Get AI Suggestion for Scene Text"
                        >
                            <WandSparkles className="h-4 w-4" />
                        </Button>
                    )}
                </>
            ) : (
                <div
                    onClick={handleMarkdownClick}
                    className="prose prose-sm dark:prose-invert max-w-none p-3 min-h-[100px] border border-input rounded-md bg-background hover:bg-muted/50 cursor-text transition-colors text-base leading-relaxed"
                    // Style to mimic textarea, make it clickable
                >
                    {text ? <Markdown>{removeIndentation(text)}</Markdown> : <p className="text-muted-foreground italic">{placeholder || "Write your scene here..."}</p>}
                </div>
            )}
            {isAISuggestionModalOpen && aiSceneContext && (
                <AISuggestionModal
                    isOpen={isAISuggestionModalOpen}
                    onClose={() => setIsAISuggestionModalOpen(false)}
                    currentText={text} 
                    initialQuery={taskSettings[TASK_KEYS.SCENE_TEXT]?.prompt || ''}
                    novelData={aiSceneContext.contextString}
                    novelDataTokens={aiSceneContext.estimatedTokens}
                    novelDataLevel={aiSceneContext.level}
                    onAccept={handleAcceptAISuggestion}
                    fieldLabel={`Scene: ${sceneName || 'Unnamed Scene'}`}
                    taskKeyForProfile={TASK_KEYS.SCENE_TEXT}
                />
            )}
        </div>
    );
});
  

const WriteView = ({ targetChapterId, targetSceneId }) => {
    const {
      acts, chapters, scenes, actOrder, concepts,
      updateAct, updateChapter,
      // Destructure all novel detail fields needed for AutoExpandingTextarea context
      novelSynopsis, genre, pointOfView, timePeriod, targetAudience, themes, tone
    } = useData();
    const { showAiFeatures } = useSettings(); // Get showAiFeatures
    const [isAINovelWriterModalOpen, setIsAINovelWriterModalOpen] = useState(false);
    const [isOutlinePopoverOpen, setIsOutlinePopoverOpen] = useState(false); // State for outline popover
    const chapterRefs = useRef({});
    const sceneTextareaRefs = useRef({}); // This will store refs to the AutoExpandingTextarea's outer div

    const novelDataForAI = useMemo(() => {
        return { actOrder, acts, chapters, scenes, concepts };
    }, [actOrder, acts, chapters, scenes, concepts]);

    useEffect(() => {
        if (scenes && sceneTextareaRefs.current) { // Ensure scenes and refs are available
            if (targetSceneId && sceneTextareaRefs.current[targetSceneId]) {
                const targetTextarea = sceneTextareaRefs.current[targetSceneId];
                targetTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => targetTextarea.focus(), 300);
            } else if (targetChapterId && chapters && chapterRefs.current) {
                const chapter = chapters[targetChapterId];
                if (chapter && chapter.sceneOrder && chapter.sceneOrder.length > 0) {
                    const firstSceneIdInChapter = chapter.sceneOrder[0];
                    if (sceneTextareaRefs.current[firstSceneIdInChapter]) {
                        const firstSceneTextarea = sceneTextareaRefs.current[firstSceneIdInChapter];
                        firstSceneTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => firstSceneTextarea.focus(), 300);
                    } else if (chapterRefs.current[targetChapterId]) {
                        chapterRefs.current[targetChapterId].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else if (chapterRefs.current[targetChapterId]) {
                    chapterRefs.current[targetChapterId].scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }
    }, [targetChapterId, targetSceneId, chapters, scenes]); // Added targetSceneId and refined dependencies

    const handleSceneSelect = (sceneIdToFocus) => {
        const sceneContainer = sceneTextareaRefs.current[sceneIdToFocus];
        if (sceneContainer) {
            sceneContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
            setTimeout(() => {
                // Attempt to find the non-editing view (Markdown display) first
                const markdownDisplay = sceneContainer.querySelector('.prose'); 
                if (markdownDisplay) {
                    markdownDisplay.click(); // This should trigger edit mode and focus via AutoExpandingTextarea's internal logic
                } else {
                    // If not found, it might already be in editing mode
                    const textarea = sceneContainer.querySelector('textarea');
                    if (textarea) {
                        textarea.focus();
                    }
                }
            }, 300); // Delay to allow for scroll and potential DOM updates
        }
        setIsOutlinePopoverOpen(false);
    };

    const handleActTitleChange = useCallback((actId, newName) => {
        const act = acts[actId];
        if (act && act.name !== newName) {
            updateAct(actId, { name: newName });
        }
    }, [acts, updateAct]);

    const handleChapterTitleChange = useCallback((chapterId, newName) => {
        const chapter = chapters[chapterId];
        if (chapter && chapter.name !== newName) {
            updateChapter(chapterId, { name: newName });
        }
    }, [chapters, updateChapter]);

    if (!acts || !chapters || !scenes || !actOrder) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground p-8">
                Loading data or initializing...
            </div>
        );
    }
    
    if (actOrder.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                <p className="text-lg mb-2">Your story awaits!</p>
                <p>There are no acts in your novel yet. </p>
                <p>Head over to the 'Plan' tab to outline your acts, chapters, and scenes.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 relative">
            {/* Outline Popover Button */}
            <div className="absolute top-4 left-4 z-10">
                <Popover open={isOutlinePopoverOpen} onOpenChange={setIsOutlinePopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full shadow-lg hover:bg-primary/10"
                            title="View Novel Outline"
                        >
                            <NotebookText className="h-5 w-5 text-primary" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" side="right" align="start">
                        <ScrollArea className="h-[500px] max-h-[80vh] p-4">
                            <div className="text-lg font-semibold mb-3">Outline</div>
                            {actOrder.map(actId => {
                                const act = acts[actId];
                                if (!act) return null;
                                return (
                                    <div key={actId} className="mb-3">
                                        <h3 className="font-semibold text-sm mb-1 text-foreground">{act.name || "Untitled Act"}</h3>
                                        {act.chapterOrder?.map(chapterId => {
                                            const chapter = chapters[chapterId];
                                            if (!chapter) return null;
                                            return (
                                                <div key={chapterId} className="ml-3 mb-2">
                                                    <h4 className="font-medium text-xs text-muted-foreground mb-1">{chapter.name || "Untitled Chapter"}</h4>
                                                    {chapter.sceneOrder?.map(sceneId => {
                                                        const scene = scenes[sceneId];
                                                        if (!scene) return null;
                                                        return (
                                                            <Button
                                                                key={sceneId}
                                                                variant="ghost"
                                                                className="w-full justify-start h-auto py-1 px-2 text-xs font-normal text-left"
                                                                onClick={() => handleSceneSelect(sceneId)}
                                                            >
                                                                {scene.name || "Untitled Scene"}
                                                            </Button>
                                                        );
                                                    })}
                                                    {(!chapter.sceneOrder || chapter.sceneOrder.length === 0) && (
                                                        <p className="ml-2 text-xs text-muted-foreground italic">No scenes</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {(!act.chapterOrder || act.chapterOrder.length === 0) && (
                                            <p className="ml-3 text-xs text-muted-foreground italic">No chapters</p>
                                        )}
                                    </div>
                                );
                            })}
                            {actOrder.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">Outline is empty. Add acts, chapters, and scenes in the 'Plan' tab.</p>
                            )}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Button to open AI Novel Writer Modal */}
            {showAiFeatures && (
                <div className="absolute top-4 right-4 z-10">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsAINovelWriterModalOpen(true)}
                        className="rounded-full shadow-lg hover:bg-primary/10"
                        title="AI Novel Writer"
                    >
                        <Sparkles className="h-5 w-5 text-primary" />
                    </Button>
                </div>
            )}

            <div className="mx-auto max-w-[800px] w-full space-y-10 pt-12"> {/* Added pt-12 to avoid overlap with button */}
                {actOrder.map((actId) => {
                    const act = acts[actId];
                    if (!act) return null;

                return (
                    <section key={actId} aria-labelledby={`act-title-${actId}`} className="space-y-6">
                        <h2 id={`act-title-${actId}`} className="sr-only">{`Act: ${act.name}`}</h2>
                        <EditableTitle
                            initialValue={act.name}
                            onSave={(newName) => handleActTitleChange(actId, newName)}
                            placeholder="Act Title"
                            className="block text-2xl font-bold tracking-tight text-center w-full"
                            inputClassName="text-2xl font-bold tracking-tight text-center w-full"
                            tag="div" // Renders as a div, styled as h1 effectively
                        />

                        {act.chapterOrder && act.chapterOrder.map((chapterId) => {
                            const chapter = chapters[chapterId];
                            if (!chapter) return null;

                            return (
                                // Assign ref to the chapter card
                                <Card
                                    key={chapterId}
                                    ref={el => chapterRefs.current[chapterId] = el} // Assign element to ref map
                                    className="overflow-hidden border-0"
                                >
                                    <CardHeader className="p-4">
                                        <EditableTitle
                                            initialValue={chapter.name}
                                            onSave={(newName) => handleChapterTitleChange(chapterId, newName)}
                                            placeholder="Chapter Title"
                                            className="block text-2xl font-semibold w-full"
                                            inputClassName="text-2xl font-semibold w-full"
                                            tag="h3" // Renders as h3
                                        />
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        {chapter.sceneOrder && chapter.sceneOrder.map((sceneId, sceneIndex) => {
                                            const scene = scenes[sceneId];
                                            if (!scene) return null;

                                            return (
                                                <article key={sceneId} aria-labelledby={`scene-heading-${sceneId}`}>
                                                    {/* Scene name can be displayed as non-editable heading if desired - REMOVED based on feedback */}
                                                    {/* {scene.name && <h4 id={`scene-heading-${sceneId}`} className="text-sm font-medium text-muted-foreground mb-1">Scene: {scene.name}</h4>} */}
                                                    {/* Assign ref to the textarea */}
                                                    <AutoExpandingTextarea
                                                        ref={el => sceneTextareaRefs.current[sceneId] = el}
                                                        sceneId={sceneId}
                                                        initialValue={scene.content || ''}
                                                        placeholder={`${scene.name || 'Unnamed Scene'}: ${scene.synopsis || 'Write your scene text here...'}`}
                                                        // Pass necessary data for AutoExpandingTextarea to generate its own context
                                                        actOrder={actOrder}
                                                        acts={acts}
                                                        chapters={chapters}
                                                        scenesData={scenes} // Pass all scenes data
                                                        concepts={concepts}
                                                        novelDetailsForContext={{ // Construct and pass novelDetails object
                                                          synopsis: novelSynopsis,
                                                          genre,
                                                          pointOfView,
                                                          timePeriod,
                                                          targetAudience,
                                                          themes,
                                                          tone,
                                                        }}
                                                        sceneName={scene.name}
                                                        sceneSynopsis={scene.synopsis}
                                                    />
                                                    {sceneIndex < chapter.sceneOrder.length - 1 && (
                                                        <div className="flex justify-center">
                                                            <div className="w-2/3 h-px mx-auto my-3 bg-gradient-to-r from-transparent via-muted-foreground/70 to-transparent"></div>
                                                            {/* Alternative "nicer" separator:
                                                            <div className="text-center text-muted-foreground text-lg tracking-widest">~ &lowast; ~</div>
                                                            */}
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                        {(!chapter.sceneOrder || chapter.sceneOrder.length === 0) && (
                                            <p className="text-sm text-muted-foreground">This chapter has no scenes yet. Add scenes in the 'Plan' tab.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {(!act.chapterOrder || act.chapterOrder.length === 0) && (
                            <p className="text-sm text-muted-foreground ml-4">This act has no chapters yet. Add chapters in the 'Plan' tab.</p>
                        )}
                    </section>
                );
            })}
            </div> {/* Close inner div */}

            {isAINovelWriterModalOpen && (
                <AINovelWriterModal
                    isOpen={isAINovelWriterModalOpen}
                    onClose={() => setIsAINovelWriterModalOpen(false)}
                    novelData={novelDataForAI}
                />
            )}
        </ScrollArea> // Close ScrollArea
    );
};

export default WriteView;
