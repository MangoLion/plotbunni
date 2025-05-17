import React, { useState, useEffect, useCallback, useRef } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { useData } from '../../context/DataContext';
import { updateNovelMetadata, getAllNovelMetadata } from '../../lib/indexedDb';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { ChevronDown, ChevronUp, Trash2, UploadCloud, WandSparkles, Download, FileText, HelpCircle } from 'lucide-react'; // Added HelpCircle, Chevrons
import { useToast } from '../../hooks/use-toast';
import { AISuggestionModal } from '../ai/AISuggestionModal';
import { ExportModal } from './ExportModal';
import { useSettings } from '../../context/SettingsContext';
import { generateContextWithRetry } from '../../lib/aiContextUtils'; // Import generateContextWithRetry


const NovelOverviewTab = () => {
  const {
    novelId: currentNovelIdFromAppContext,
    authorName, 
    synopsis, 
    coverImage,
    pointOfView,
    genre,
    timePeriod,
    targetAudience,
    themes,
    tone,
    updateNovelDetails, 
    currentNovelId: novelIdFromData,
    concepts,    // Added for export
    acts,        // Added for export
    chapters,    // Added for export
    scenes,      // Added for export
    actOrder,
    isDataLoaded
  } = useData();
  const novelId = currentNovelIdFromAppContext || novelIdFromData;

  const [localNovelName, setLocalNovelName] = useState('');
  const [localAuthorName, setLocalAuthorName] = useState('');
  const [localSynopsis, setLocalSynopsis] = useState('');
  const [localCoverImage, setLocalCoverImage] = useState(null);
  const [localPointOfView, setLocalPointOfView] = useState('');
  const [localGenre, setLocalGenre] = useState('');
  const [localTimePeriod, setLocalTimePeriod] = useState('');
  const [localTargetAudience, setLocalTargetAudience] = useState('');
  const [localThemes, setLocalThemes] = useState('');
  const [localTone, setLocalTone] = useState('');
  const [originalNovelName, setOriginalNovelName] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // For collapsible
  const { toast } = useToast();
  const { 
    systemPrompt, 
    taskSettings, 
    TASK_KEYS, 
    themeMode, 
    activeOsTheme, 
    endpointProfiles, 
    activeProfileId,
    showAiFeatures
  } = useSettings();
  const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // State for AI Synopsis Suggestion context
  const [aiSynopsisContext, setAiSynopsisContext] = useState({
    contextString: "",
    estimatedTokens: 0,
    level: 0,
    error: null,
  });

  // Joyride state
  const [runTour, setRunTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([]);
  const [joyrideStyles, setJoyrideStyles] = useState({});

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const isMounted = useRef(false);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    // Effect to track component mount status
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (novelId) {
      const fetchMetadata = async () => {
        const allMeta = await getAllNovelMetadata();
        const currentMeta = allMeta.find(m => m.id === novelId);
        if (currentMeta) {
          setLocalNovelName(currentMeta.name);
          setOriginalNovelName(currentMeta.name);
        }
      };
      fetchMetadata();
    }
    setLocalAuthorName(authorName || '');
    setLocalSynopsis(synopsis || '');
    setLocalCoverImage(coverImage || null);
    setLocalPointOfView(pointOfView || '');
    setLocalGenre(genre || '');
    setLocalTimePeriod(timePeriod || '');
    setLocalTargetAudience(targetAudience || '');
    setLocalThemes(themes || '');
    setLocalTone(tone || '');
    setAiSynopsisContext({ contextString: "", estimatedTokens: 0, level: 0, error: null }); // Reset AI context on novel change
  }, [novelId, authorName, synopsis, coverImage, pointOfView, genre, timePeriod, targetAudience, themes, tone]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalCoverImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process the file from a drop event
  const processDroppedFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalCoverImage(reader.result);
        toast({ title: "Image Uploaded", description: "Cover image has been updated." });
      };
      reader.readAsDataURL(file);
    } else {
      toast({ 
        title: "Invalid File", 
        description: "Please drop an image file.", 
        variant: "destructive" 
      });
    }
  };

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processDroppedFile(file);
    }
  };

  const handleClearImage = () => {
    setLocalCoverImage(null); // Update local state for immediate UI feedback
    updateNovelDetails({ // Update global state directly
        coverImage: null
    });
    // The setTimeout was causing a race condition with prop synchronization.
    // The console.log inside the original setTimeout would also log the stale value of localCoverImage due to closure.
  };

  // Debounced effect for saving text inputs
  useEffect(() => {
    if (!isMounted.current || !novelId) {
      return;
    }

    const handler = setTimeout(async () => {
      let novelNameUpdated = false;
      let detailsUpdated = false;

      // Update novel name in metadata if changed
      if (localNovelName !== originalNovelName) {
        try {
          await updateNovelMetadata(novelId, { name: localNovelName });
          setOriginalNovelName(localNovelName); // Update original name after successful save
          novelNameUpdated = true;
        } catch (error) {
          console.error("Error auto-saving novel name:", error);
          toast({ title: "Error", description: "Could not auto-save novel name.", variant: "destructive" });
        }
      }

      // Update other details if they have changed from DataContext's state
      if (
        localAuthorName !== authorName || 
        localSynopsis !== synopsis ||
        localPointOfView !== pointOfView ||
        localGenre !== genre ||
        localTimePeriod !== timePeriod ||
        localTargetAudience !== targetAudience ||
        localThemes !== themes ||
        localTone !== tone
      ) {
        try {
          updateNovelDetails({
            authorName: localAuthorName,
            synopsis: localSynopsis,
            coverImage: localCoverImage, // Pass current localCoverImage
            pointOfView: localPointOfView,
            genre: localGenre,
            timePeriod: localTimePeriod,
            targetAudience: localTargetAudience,
            themes: localThemes,
            tone: localTone,
          });
          detailsUpdated = true;
        } catch (error) {
          console.error("Error auto-saving novel details:", error);
          toast({ title: "Error", description: "Could not auto-save novel details.", variant: "destructive" });
        }
      }
      
      if (novelNameUpdated && detailsUpdated) {
        toast({ title: "Auto-Saved", description: "Novel name & details updated." });
      } else if (novelNameUpdated) {
        toast({ title: "Auto-Saved", description: "Novel name updated." });
      } else if (detailsUpdated) {
        toast({ title: "Auto-Saved", description: "Novel details updated." });
      }
    }, 1500); // 1.5-second debounce

    return () => {
      clearTimeout(handler);
    };
  }, [
    localNovelName, localAuthorName, localSynopsis, localPointOfView, localGenre, localTimePeriod, localTargetAudience, localThemes, localTone, 
    novelId, updateNovelDetails, updateNovelMetadata, toast, 
    originalNovelName, authorName, synopsis, pointOfView, genre, timePeriod, targetAudience, themes, tone, 
    localCoverImage
  ]);

  // Effect for immediate cover image save
  useEffect(() => {
    if (!isMounted.current || !novelId) {
      return;
    }

    // Only save if localCoverImage has actually changed from the one in DataContext (coverImage prop)
    // This prevents saving on initial load and if it's set back to the original value.
    if (localCoverImage && localCoverImage !== coverImage) {
      try {
        updateNovelDetails({
          // Pass all current local details to ensure atomicity if other fields are also being updated by their own effects
          authorName: localAuthorName, 
          synopsis: localSynopsis,
          coverImage: localCoverImage,
          pointOfView: localPointOfView,
          genre: localGenre,
          timePeriod: localTimePeriod,
          targetAudience: localTargetAudience,
          themes: localThemes,
          tone: localTone,
        });
        toast({ title: "Auto-Saved", description: "Cover image updated." });
      } catch (error) {
        console.error("Error auto-saving cover image:", error);
        toast({ title: "Error", description: "Could not auto-save cover image.", variant: "destructive" });
      }
    }
  }, [localCoverImage, novelId, updateNovelDetails, toast, localAuthorName, localSynopsis, localPointOfView, localGenre, localTimePeriod, localTargetAudience, localThemes, localTone, coverImage]);

  const downloadFile = ({ data, fileName, fileType }) => {
    const blob = new Blob([data], { type: fileType });
    const a = document.createElement('a');
    a.download = fileName;
    a.href = window.URL.createObjectURL(blob);
    const clickEvt = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvt);
    a.remove();
    window.URL.revokeObjectURL(a.href); // Clean up
  };

  const handleExportJson = () => {
    if (!isDataLoaded || !localNovelName) {
      toast({ title: "Error", description: "Novel data not fully loaded or novel name is missing.", variant: "destructive" });
      return;
    }
    const novelData = {
      novelName: localNovelName, // Use localNovelName as it's tied to the input field
      authorName: localAuthorName, // Use localAuthorName
      synopsis: localSynopsis,     // Use localSynopsis
      coverImage: localCoverImage, // Use localCoverImage
      pointOfView: localPointOfView,
      genre: localGenre,
      timePeriod: localTimePeriod,
      targetAudience: localTargetAudience,
      themes: localThemes,
      tone: localTone,
      concepts,
      acts,
      chapters,
      scenes,
      actOrder,
    };
    const fileName = `${localNovelName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'novel'}.json`;
    downloadFile({
      data: JSON.stringify(novelData, null, 2),
      fileName,
      fileType: 'application/json',
    });
    toast({ title: "Exported", description: `${fileName} has been downloaded.` });
  };

  // The handleExportMarkdown logic will be moved to/adapted in ExportModal.jsx
  // For now, we just need to open the modal.

  const prepareAIContextForSynopsis = async () => {
    if (!acts || !chapters || !scenes || !concepts || !actOrder || !isDataLoaded) {
      setAiSynopsisContext({ contextString: "", estimatedTokens: 0, level: 0, error: "Base novel data not fully loaded for AI context." });
      return;
    }

    const novelDetailsFromLocalState = {
      synopsis: localSynopsis, // Use local state as it's being edited
      genre: localGenre,
      pointOfView: localPointOfView,
      timePeriod: localTimePeriod,
      targetAudience: localTargetAudience,
      themes: localThemes,
      tone: localTone,
    };

    let profileIdToUse = activeProfileId;
    if (taskSettings && taskSettings[TASK_KEYS.NOVEL_DESC]?.profileId) {
      profileIdToUse = taskSettings[TASK_KEYS.NOVEL_DESC].profileId;
    }
    const activeAIProfile = endpointProfiles?.find(p => p.id === profileIdToUse);
    
    if (!activeAIProfile) {
      setAiSynopsisContext({ contextString: "", estimatedTokens: 0, level: 0, error: "No active AI profile found. Please check settings." });
      toast({ title: "AI Profile Error", description: "No active AI profile found. Please configure one in settings.", variant: "destructive" });
      return;
    }
    if (!activeAIProfile.endpointUrl) {
      setAiSynopsisContext({ contextString: "", estimatedTokens: 0, level: 0, error: `AI Profile "${activeAIProfile.name}" has no endpoint URL.` });
      toast({ title: "AI Profile Error", description: `The selected AI Profile "${activeAIProfile.name}" is missing an endpoint URL.`, variant: "destructive" });
      return;
    }

    const contextResult = await generateContextWithRetry({
      strategy: 'novelOutline', // Novel outline seems appropriate for overall synopsis
      baseData: { 
        actOrder, 
        acts, 
        chapters, 
        scenes, 
        concepts, 
        novelDetails: novelDetailsFromLocalState // Pass the constructed novelDetails
      },
      targetData: { targetChapterId: null, targetSceneId: null }, // No specific target for overall synopsis
      aiProfile: activeAIProfile,
      systemPromptText: systemPrompt, // from useSettings
      userQueryText: taskSettings[TASK_KEYS.NOVEL_DESC]?.prompt || "Write a compelling synopsis for this novel.", // Default query
    });
    setAiSynopsisContext(contextResult);
  };

  const handleOpenAISynopsisSuggestionModal = async () => {
    await prepareAIContextForSynopsis();
    setIsAISuggestionModalOpen(true);
  };


  if (!novelId) {
    return <div className="p-4 text-muted-foreground">Select a novel to see its overview.</div>;
  }

  useEffect(() => {
    // Define tour steps dynamically based on screen size
    const isMobile = window.innerWidth < 768; // md breakpoint

    const conceptsStep = isMobile 
      ? {
          target: '[data-joyride="concepts-tab"]', 
          content: "Manage your characters, locations, and lore in the 'Concepts' area.",
          placement: 'auto', 
          disableBeacon: false, 
        }
      : {
          target: '[data-joyride="concepts-tab-desktop"]', 
          content: "Manage your characters, locations, and lore in the 'Concept Cache' sidebar.",
          placement: 'right', 
          disableBeacon: false, 
        };

    const steps = [
      {
        target: 'body',
        content: "Welcome to Plot Bunni! Let's take a quick tour of the main features.",
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-joyride="plan-tab"]',
        content: "The 'Plan' tab is where you can outline your story with acts, chapters, and scenes.",
        placement: 'bottom',
      },
      {
        target: '[data-joyride="write-tab"]',
        content: "Switch to the 'Write' tab to draft your manuscript scene by scene.",
        placement: 'bottom',
      },
      conceptsStep, // Dynamically inserted concepts step
      {
        target: '[data-joyride="settings-tab"]',
        content: "Customize application settings, including theme and AI configurations, in the 'Settings' tab.",
        placement: 'bottom',
      },
    ];

    if (showAiFeatures) {
      steps.push({
        target: 'button[aria-label="Get AI Suggestion for Synopsis"]',
        content: "Look for the magic wand icon! It offers AI assistance for various tasks, like generating text or ideas. You'll find similar icons in other parts of the app.",
        placement: 'top',
      });
    }
    setTourSteps(steps);

    // Check for first run
    const tutorialShown = localStorage.getItem('plotbunni_tutorial_shown');
    if (!tutorialShown) {
      setRunTour(true);
      localStorage.setItem('plotbunni_tutorial_shown', 'true');
    }
  }, [novelId]); // Re-run if novelId changes, also runs on mount

  useEffect(() => {
    // Update Joyride styles when theme changes
    const getRawHslString = (cssVar) => getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    
    const formatToCssHsl = (rawHslStr) => {
      if (!rawHslStr) return 'hsl(0, 0%, 0%)'; // Default fallback for safety
      // Check if it's already a full hsl() function string
      if (rawHslStr.toLowerCase().startsWith('hsl(') && rawHslStr.endsWith(')')) {
        return rawHslStr;
      }
      // Assuming rawHslStr is "H S% L%" or "H.D S.D% L.D%"
      const parts = rawHslStr.split(' ');
      if (parts.length === 3 && parts[1].includes('%') && parts[2].includes('%')) {
        // Remove any existing commas from HSL components if they exist (e.g. "210, 40%, 50%")
        const hue = parts[0].replace(',', '');
        const saturation = parts[1].replace(',', '');
        const lightness = parts[2].replace(',', '');
        return `hsl(${hue}, ${saturation}, ${lightness})`;
      }
      // console.warn(`Unexpected HSL string format for Joyride: '${rawHslStr}'. Defaulting.`);
      return 'hsl(0, 0%, 0%)'; // Fallback for unexpected format
    };

    setJoyrideStyles({
      options: {
        arrowColor: formatToCssHsl(getRawHslString('--popover')),
        backgroundColor: formatToCssHsl(getRawHslString('--popover')),
        primaryColor: formatToCssHsl(getRawHslString('--primary')),
        textColor: formatToCssHsl(getRawHslString('--popover-foreground')),
        zIndex: 10000,
      },
      buttonClose: {
        color: formatToCssHsl(getRawHslString('--popover-foreground')),
      },
      buttonNext: {
        backgroundColor: formatToCssHsl(getRawHslString('--primary')),
        color: formatToCssHsl(getRawHslString('--primary-foreground')),
        borderRadius: '0.375rem', 
        padding: '0.5rem 1rem',
      },
      buttonBack: {
        backgroundColor: formatToCssHsl(getRawHslString('--secondary')),
        color: formatToCssHsl(getRawHslString('--secondary-foreground')),
        borderRadius: '0.375rem',
        padding: '0.5rem 1rem',
        marginRight: '0.5rem',
      },
      tooltip: {
        borderRadius: '0.5rem', // Equivalent to 'rounded-lg'
        padding: '1rem',
      },
      tooltipContent: {
        padding: '0',
      },
      floater: {
        tooltip: {
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))', // Example shadow
        },
      },
    });
  }, [themeMode, activeOsTheme]); // Re-run when theme changes

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if ([EVENTS.TOUR_END, EVENTS.STEP_AFTER].includes(type)) {
      // You can also set event.preventDefault() to stop the tour based on conditions
    }
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
    }
     if (action === ACTIONS.CLOSE || status === STATUS.PAUSED) {
      setRunTour(false);
    }
  };
  
  const startTour = () => {
    // Re-evaluate steps based on current screen size when manually starting tour
    const isMobile = window.innerWidth < 768;
    const conceptsStep = isMobile 
      ? {
          target: '[data-joyride="concepts-tab"]', 
          content: "Manage your characters, locations, and lore in the 'Concepts' area.",
          placement: 'auto', 
          disableBeacon: false, 
        }
      : {
          target: '[data-joyride="concepts-tab-desktop"]', 
          content: "Manage your characters, locations, and lore in the 'Concept Cache' sidebar.",
          placement: 'right', 
          disableBeacon: false, 
        };
    
    const currentSteps = [
      {
        target: 'body',
        content: "Welcome to Plot Bunni! Let's take a quick tour of the main features.",
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-joyride="plan-tab"]',
        content: "The 'Plan' tab is where you can outline your story with acts, chapters, and scenes.",
        placement: 'bottom',
      },
      {
        target: '[data-joyride="write-tab"]',
        content: "Switch to the 'Write' tab to draft your manuscript scene by scene.",
        placement: 'bottom',
      },
      conceptsStep,
      {
        target: '[data-joyride="settings-tab"]',
        content: "Customize application settings, including theme and AI configurations, in the 'Settings' tab.",
        placement: 'bottom',
      },
    ];
    if (showAiFeatures) {
      currentSteps.push({
        target: 'button[aria-label="Get AI Suggestion for Synopsis"]',
        content: "Look for the magic wand icon! It offers AI assistance for various tasks, like generating text or ideas. You'll find similar icons in other parts of the app.",
        placement: 'top',
      });
    }
    setTourSteps(currentSteps);
    setRunTour(true);
  };

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]"> {/* Root ScrollArea like in PlanView */}
      <Joyride
        continuous
        run={runTour}
        steps={tourSteps}
        scrollToFirstStep
        showProgress
        showSkipButton
        styles={joyrideStyles}
        callback={handleJoyrideCallback}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip',
        }}
      />
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Novel Overview</CardTitle>
            <CardDescription>Edit your novel's basic information and cover image.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={startTour} title="Show Tutorial">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
          <Label htmlFor="novelName">Novel Name *</Label>
          <Input
            id="novelName"
            value={localNovelName}
            onChange={(e) => setLocalNovelName(e.target.value)}
            placeholder="Your amazing novel title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="authorName">Author Name</Label>
          <Input
            id="authorName"
            value={localAuthorName}
            onChange={(e) => setLocalAuthorName(e.target.value)}
            placeholder="Pen name or your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="synopsis">Synopsis</Label>
          <div className="relative">
            <Textarea
              id="synopsis"
              value={localSynopsis}
              onChange={(e) => setLocalSynopsis(e.target.value)}
              placeholder="A short, captivating summary of your novel..."
              rows={4}
              className={showAiFeatures ? "pr-10" : ""} // Add padding for the button
            />
            {showAiFeatures && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute bottom-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700"
                onClick={handleOpenAISynopsisSuggestionModal}
                aria-label="Get AI Suggestion for Synopsis"
              >
                <WandSparkles className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent">
              {isDetailsOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              Additional Novel Details (Optional)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="pointOfView">Point of View</Label>
              <Input
                id="pointOfView"
                value={localPointOfView}
                onChange={(e) => setLocalPointOfView(e.target.value)}
                placeholder="e.g., First Person, Third Person Limited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre">Genre & Subgenre</Label>
              <Input
                id="genre"
                value={localGenre}
                onChange={(e) => setLocalGenre(e.target.value)}
                placeholder="e.g., Fantasy - Urban Fantasy, Sci-Fi - Space Opera"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timePeriod">Time Period</Label>
              <Input
                id="timePeriod"
                value={localTimePeriod}
                onChange={(e) => setLocalTimePeriod(e.target.value)}
                placeholder="e.g., Contemporary, Historical, Futuristic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Input
                id="targetAudience"
                value={localTargetAudience}
                onChange={(e) => setLocalTargetAudience(e.target.value)}
                placeholder="e.g., Young Adult, Middle Grade, Adult"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="themes">Themes</Label>
              <Textarea
                id="themes"
                value={localThemes}
                onChange={(e) => setLocalThemes(e.target.value)}
                placeholder="e.g., Love, betrayal, redemption, overcoming adversity"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Textarea
                id="tone"
                value={localTone}
                onChange={(e) => setLocalTone(e.target.value)}
                placeholder="e.g., Dark, humorous, suspenseful, whimsical"
                rows={3}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-2">
          <Label htmlFor="coverImageInputFile">Cover Image</Label>
          <Input
            id="coverImageInputFile"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            ref={fileInputRef}
          />
          {localCoverImage ? (
            <div
              ref={dropZoneRef}
              className={`relative group mt-2 border rounded-md p-2 flex justify-center items-center cursor-pointer transition-colors ${
                isDraggingOver 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-muted/40 hover:bg-muted/50'
              }`}
              style={{ height: '200px', width: '100%' }}
              onClick={triggerFileUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              title="Click or drag image to change cover"
            >
              <img
                src={localCoverImage}
                alt="Cover Preview"
                className="max-h-full max-w-full object-contain rounded"
              />
              {isDraggingOver && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-md">
                  <span className="text-primary font-medium">Drop to replace image</span>
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering file upload on parent
                  handleClearImage();
                }}
                title="Remove Cover Image"
                className="absolute bottom-2 right-2 transition-opacity shadow-md rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              ref={dropZoneRef}
              className={`mt-2 border-2 border-dashed rounded-md p-8 flex flex-col justify-center items-center text-sm cursor-pointer transition-all ${
                isDraggingOver 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-muted-foreground/30 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:border-muted-foreground/50'
              }`}
              style={{ height: '200px', width: '100%' }}
              onClick={triggerFileUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              title="Click or drag image to upload"
            >
              <UploadCloud className={`h-10 w-10 mb-2 ${isDraggingOver ? 'text-primary' : 'text-gray-400'}`} />
              <span>{isDraggingOver ? 'Drop image here' : 'Click or drag image to upload'}</span>
            </div>
          )}
        </div>
        

        <div className="space-y-2">
          <div className="flex space-x-2">
            <Button
              onClick={handleExportJson}
              variant="default"
              className="flex-1"
              disabled={!isDataLoaded || !localNovelName}
            >
              <Download className="mr-2 h-4 w-4" /> Download Project
            </Button>
            <Button
              onClick={() => setIsExportModalOpen(true)}
              variant="default"
              className="flex-1"
              disabled={!isDataLoaded || !localNovelName}
            >
              <FileText className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </CardContent>
      {isAISuggestionModalOpen && (
        <AISuggestionModal
          isOpen={isAISuggestionModalOpen}
          onClose={() => setIsAISuggestionModalOpen(false)}
          currentText={localSynopsis}
          initialQuery={taskSettings[TASK_KEYS.NOVEL_DESC]?.prompt || "Write a compelling synopsis for this novel."}
          novelData={aiSynopsisContext.contextString}
          novelDataTokens={aiSynopsisContext.estimatedTokens}
          novelDataLevel={aiSynopsisContext.level}
          onAccept={(suggestion) => {
            setLocalSynopsis(suggestion);
            setIsAISuggestionModalOpen(false);
          }}
          fieldLabel="Novel Synopsis"
          taskKeyForProfile={TASK_KEYS.NOVEL_DESC}
        />
      )}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          novelData={{
            novelName: localNovelName,
            authorName: localAuthorName,
            synopsis: localSynopsis,
            // coverImage: localCoverImage, // Cover image not typically part of text exports
            concepts,
            acts,
            chapters,
            scenes,
            actOrder,
          }}
          isDataLoaded={isDataLoaded}
        />
      )}
    </Card>
    </ScrollArea>
  );
};

export default NovelOverviewTab;
