import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        toast({ title: t('novel_overview_toast_image_uploaded_title'), description: t('novel_overview_toast_image_uploaded_desc') });
      };
      reader.readAsDataURL(file);
    } else {
      toast({ 
        title: t('novel_overview_toast_invalid_file_title'), 
        description: t('novel_overview_toast_invalid_file_desc'), 
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
          toast({ title: t('novel_overview_toast_error_title'), description: t('novel_overview_toast_error_autosave_name_desc'), variant: "destructive" });
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
          toast({ title: t('novel_overview_toast_error_title'), description: t('novel_overview_toast_error_autosave_details_desc'), variant: "destructive" });
        }
      }
      
      if (novelNameUpdated && detailsUpdated) {
        toast({ title: t('novel_overview_toast_autosaved_title'), description: t('novel_overview_toast_autosaved_name_details_desc') });
      } else if (novelNameUpdated) {
        toast({ title: t('novel_overview_toast_autosaved_title'), description: t('novel_overview_toast_autosaved_name_desc') });
      } else if (detailsUpdated) {
        toast({ title: t('novel_overview_toast_autosaved_title'), description: t('novel_overview_toast_autosaved_details_desc') });
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
        toast({ title: t('novel_overview_toast_autosaved_title'), description: t('novel_overview_toast_autosaved_image_desc') });
      } catch (error) {
        console.error("Error auto-saving cover image:", error);
        toast({ title: t('novel_overview_toast_error_title'), description: t('novel_overview_toast_error_autosave_image_desc'), variant: "destructive" });
      }
    }
  }, [localCoverImage, novelId, updateNovelDetails, toast, localAuthorName, localSynopsis, localPointOfView, localGenre, localTimePeriod, localTargetAudience, localThemes, localTone, coverImage, t]);

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
      toast({ title: t('novel_overview_toast_error_title'), description: t('novel_overview_toast_error_export_data_missing_desc'), variant: "destructive" });
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
    toast({ title: t('novel_overview_toast_exported_title'), description: t('novel_overview_toast_exported_json_desc', { fileName }) });
  };

  // The handleExportMarkdown logic will be moved to/adapted in ExportModal.jsx
  // For now, we just need to open the modal.

  const prepareAIContextForSynopsis = async () => {
    if (!acts || !chapters || !scenes || !concepts || !actOrder || !isDataLoaded) {
      setAiSynopsisContext({ contextString: "", estimatedTokens: 0, level: 0, error: t('novel_overview_ai_context_error_data_not_loaded') });
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
      setAiSynopsisContext({ contextString: "", estimatedTokens: 0, level: 0, error: t('novel_overview_ai_context_error_no_profile') });
      toast({ title: t('novel_overview_toast_ai_profile_error_title'), description: t('novel_overview_toast_ai_profile_error_no_active_desc'), variant: "destructive" });
      return;
    }
    if (!activeAIProfile.endpointUrl) {
      setAiSynopsisContext({ contextString: "", estimatedTokens: 0, level: 0, error: t('novel_overview_ai_context_error_profile_no_url', {profileName: activeAIProfile.name}) });
      toast({ title: t('novel_overview_toast_ai_profile_error_title'), description: t('novel_overview_toast_ai_profile_error_no_url_desc', {profileName: activeAIProfile.name}), variant: "destructive" });
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
      userQueryText: taskSettings[TASK_KEYS.NOVEL_DESC]?.prompt || t('novel_overview_ai_modal_default_synopsis_prompt'), // Default query
    });
    setAiSynopsisContext(contextResult);
  };

  const handleOpenAISynopsisSuggestionModal = async () => {
    await prepareAIContextForSynopsis();
    setIsAISuggestionModalOpen(true);
  };


  if (!novelId) {
    return <div className="p-4 text-muted-foreground">{t('novel_overview_no_novel_selected')}</div>;
  }

  useEffect(() => {
    // Define tour steps dynamically based on screen size
    const isMobile = window.innerWidth < 768; // md breakpoint

    const conceptsStep = isMobile 
      ? {
          target: '[data-joyride="concepts-tab"]', 
          content: t('novel_overview_joyride_step_concepts_tab_mobile'),
          placement: 'auto', 
          disableBeacon: false, 
        }
      : {
          target: '[data-joyride="concepts-tab-desktop"]', 
          content: t('novel_overview_joyride_step_concepts_tab_desktop'),
          placement: 'right', 
          disableBeacon: false, 
        };

    const steps = [
      {
        target: 'body',
        content: t('novel_overview_joyride_step_welcome'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-joyride="plan-tab"]',
        content: t('novel_overview_joyride_step_plan_tab'),
        placement: 'bottom',
      },
      {
        target: '[data-joyride="write-tab"]',
        content: t('novel_overview_joyride_step_write_tab'),
        placement: 'bottom',
      },
      conceptsStep, // Dynamically inserted concepts step
      {
        target: '[data-joyride="settings-tab"]',
        content: t('novel_overview_joyride_step_settings_tab'),
        placement: 'bottom',
      },
    ];

    if (showAiFeatures) {
      steps.push({
        target: `button[aria-label="${t('novel_overview_aria_label_ai_synopsis')}"]`,
        content: t('novel_overview_joyride_step_ai_features'),
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
          content: t('novel_overview_joyride_step_concepts_tab_mobile'),
          placement: 'auto', 
          disableBeacon: false, 
        }
      : {
          target: '[data-joyride="concepts-tab-desktop"]', 
          content: t('novel_overview_joyride_step_concepts_tab_desktop'),
          placement: 'right', 
          disableBeacon: false, 
        };
    
    const currentSteps = [
      {
        target: 'body',
        content: t('novel_overview_joyride_step_welcome'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-joyride="plan-tab"]',
        content: t('novel_overview_joyride_step_plan_tab'),
        placement: 'bottom',
      },
      {
        target: '[data-joyride="write-tab"]',
        content: t('novel_overview_joyride_step_write_tab'),
        placement: 'bottom',
      },
      conceptsStep,
      {
        target: '[data-joyride="settings-tab"]',
        content: t('novel_overview_joyride_step_settings_tab'),
        placement: 'bottom',
      },
    ];
    if (showAiFeatures) {
      currentSteps.push({
        target: `button[aria-label="${t('novel_overview_aria_label_ai_synopsis')}"]`,
        content: t('novel_overview_joyride_step_ai_features'),
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
          back: t('novel_overview_joyride_locale_back'),
          close: t('novel_overview_joyride_locale_close'),
          last: t('novel_overview_joyride_locale_finish'),
          next: t('novel_overview_joyride_locale_next'),
          skip: t('novel_overview_joyride_locale_skip'),
        }}
      />
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>{t('novel_overview_title')}</CardTitle>
            <CardDescription>{t('novel_overview_description')}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={startTour} title={t('novel_overview_button_show_tutorial_title')}>
            <HelpCircle className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
          <Label htmlFor="novelName">{t('novel_overview_label_novel_name')}</Label>
          <Input
            id="novelName"
            value={localNovelName}
            onChange={(e) => setLocalNovelName(e.target.value)}
            placeholder={t('novel_overview_placeholder_novel_name')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="authorName">{t('novel_overview_label_author_name')}</Label>
          <Input
            id="authorName"
            value={localAuthorName}
            onChange={(e) => setLocalAuthorName(e.target.value)}
            placeholder={t('novel_overview_placeholder_author_name')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="synopsis">{t('novel_overview_label_synopsis')}</Label>
          <div className="relative">
            <Textarea
              id="synopsis"
              value={localSynopsis}
              onChange={(e) => setLocalSynopsis(e.target.value)}
              placeholder={t('novel_overview_placeholder_synopsis')}
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
                aria-label={t('novel_overview_aria_label_ai_synopsis')}
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
              {t('novel_overview_collapsible_details_title')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="pointOfView">{t('novel_overview_label_pov')}</Label>
              <Input
                id="pointOfView"
                value={localPointOfView}
                onChange={(e) => setLocalPointOfView(e.target.value)}
                placeholder={t('novel_overview_placeholder_pov')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre">{t('novel_overview_label_genre')}</Label>
              <Input
                id="genre"
                value={localGenre}
                onChange={(e) => setLocalGenre(e.target.value)}
                placeholder={t('novel_overview_placeholder_genre')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timePeriod">{t('novel_overview_label_time_period')}</Label>
              <Input
                id="timePeriod"
                value={localTimePeriod}
                onChange={(e) => setLocalTimePeriod(e.target.value)}
                placeholder={t('novel_overview_placeholder_time_period')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAudience">{t('novel_overview_label_target_audience')}</Label>
              <Input
                id="targetAudience"
                value={localTargetAudience}
                onChange={(e) => setLocalTargetAudience(e.target.value)}
                placeholder={t('novel_overview_placeholder_target_audience')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="themes">{t('novel_overview_label_themes')}</Label>
              <Textarea
                id="themes"
                value={localThemes}
                onChange={(e) => setLocalThemes(e.target.value)}
                placeholder={t('novel_overview_placeholder_themes')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">{t('novel_overview_label_tone')}</Label>
              <Textarea
                id="tone"
                value={localTone}
                onChange={(e) => setLocalTone(e.target.value)}
                placeholder={t('novel_overview_placeholder_tone')}
                rows={3}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-2">
          <Label htmlFor="coverImageInputFile">{t('novel_overview_label_cover_image')}</Label>
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
              title={t('novel_overview_title_change_cover')}
            >
              <img
                src={localCoverImage}
                alt={t('novel_overview_alt_cover_preview')}
                className="max-h-full max-w-full object-contain rounded"
              />
              {isDraggingOver && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-md">
                  <span className="text-primary font-medium">{t('novel_overview_text_drop_to_replace')}</span>
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering file upload on parent
                  handleClearImage();
                }}
                title={t('novel_overview_title_remove_cover')}
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
              title={t('novel_overview_title_upload_cover')}
            >
              <UploadCloud className={`h-10 w-10 mb-2 ${isDraggingOver ? 'text-primary' : 'text-gray-400'}`} />
              <span>{isDraggingOver ? t('novel_overview_text_drop_image_here') : t('novel_overview_text_click_or_drag_upload')}</span>
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
              <Download className="mr-2 h-4 w-4" /> {t('novel_overview_button_download_project')}
            </Button>
            <Button
              onClick={() => setIsExportModalOpen(true)}
              variant="default"
              className="flex-1"
              disabled={!isDataLoaded || !localNovelName}
            >
              <FileText className="mr-2 h-4 w-4" /> {t('novel_overview_button_export')}
            </Button>
          </div>
        </div>
      </CardContent>
      {isAISuggestionModalOpen && (
        <AISuggestionModal
          isOpen={isAISuggestionModalOpen}
          onClose={() => setIsAISuggestionModalOpen(false)}
          currentText={localSynopsis}
          initialQuery={taskSettings[TASK_KEYS.NOVEL_DESC]?.prompt || t('novel_overview_ai_modal_default_synopsis_prompt')}
          novelData={aiSynopsisContext.contextString}
          novelDataTokens={aiSynopsisContext.estimatedTokens}
          novelDataLevel={aiSynopsisContext.level}
          onAccept={(suggestion) => {
            setLocalSynopsis(suggestion);
            setIsAISuggestionModalOpen(false);
          }}
          fieldLabel={t('novel_overview_ai_modal_field_label_synopsis')}
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
