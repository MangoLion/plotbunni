import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FullscreenTextareaEditModal } from './FullscreenTextareaEditModal'; // Added
// import Markdown from 'react-markdown'; // Added Markdown
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// Input import removed as it's not used
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Added RadioGroup
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, TriangleAlert, Database } from 'lucide-react'; // Or ChevronsUpDown
import { Progress } from "@/components/ui/progress"; // Added Progress
import { useSettings } from '../../context/SettingsContext';
import { tokenCount, removeIndentation } from '../../lib/utils'; // Added tokenCount and removeIndentation

export const AISuggestionModal = ({
  isOpen,
  onClose,
  currentText,
  onAccept,
  fieldLabel,
  initialQuery,
  novelData, // Existing prop, will be the context string
  novelDataTokens, // New prop for pre-calculated tokens of novelData
  novelDataLevel,  // New prop for the context level achieved
  taskKeyForProfile,
}) => {
  const { t } = useTranslation();
  const {
    systemPrompt,
    endpointProfiles,
    activeProfileId: globalActiveProfileId,
    taskSettings,
    // getActiveProfile, // Removed as it's not used directly by this component
  } = useSettings();

  const [query, setQuery] = useState(initialQuery || '');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestion');
  const abortControllerRef = useRef(null);
  const suggestionTextareaRef = useRef(null); // Added ref for suggestion textarea
  const [isEditingSuggestion, setIsEditingSuggestion] = useState(false); // Added for editable suggestion

  // State for FullscreenTextareaEditModal
  const [isFullscreenEditModalOpen, setIsFullscreenEditModalOpen] = useState(false);
  const [fullscreenEditModalConfig, setFullscreenEditModalConfig] = useState({
    initialValue: '',
    onSave: () => {},
    title: '',
    textareaId: '',
  });

  // State for "Continue Generating" feature
  const [lastSuccessfulQuery, setLastSuccessfulQuery] = useState('');
  const [lastSuccessfulEditableSystemPrompt, setLastSuccessfulEditableSystemPrompt] = useState('');
  const [lastSuccessfulEditableNovelData, setLastSuccessfulEditableNovelData] = useState('');
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [isNovelDataOpen, setIsNovelDataOpen] = useState(false);
  const [isCurrentTextOpen, setIsCurrentTextOpen] = useState(false);
  const [promptMode, setPromptMode] = useState('scratch'); // 'scratch', 'continue', 'modify'

  // Editable versions of systemPrompt and novelData
  const [editableSystemPrompt, setEditableSystemPrompt] = useState('');
  const [editableNovelData, setEditableNovelData] = useState('');

  // State for memory progress bar
  const [estimatedTotalTokens, setEstimatedTotalTokens] = useState(0);
  const [maxContextTokensForPrompt, setMaxContextTokensForPrompt] = useState(4096);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [tokenBreakdown, setTokenBreakdown] = useState({
    system: 0,
    query: 0,
    novelData: 0,
    currentText: 0,
  });
  const [isMemoryDetailOpen, setIsMemoryDetailOpen] = useState(false); // State for new collapsible

  useEffect(() => {
    // Determine and set the active profile when the modal opens or settings change
    let profileIdToUse = globalActiveProfileId;
    if (taskKeyForProfile && taskSettings && taskSettings[taskKeyForProfile]?.profileId) {
      profileIdToUse = taskSettings[taskKeyForProfile].profileId;
    }
    const activeProf = endpointProfiles?.find(p => p.id === profileIdToUse);
    setCurrentProfile(activeProf);
  }, [isOpen, endpointProfiles, globalActiveProfileId, taskKeyForProfile, taskSettings]);
  
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setAiResponse('');
      setActiveTab('query');
      setPromptMode('scratch'); // Reset to default
      setIsSystemPromptOpen(false);
      setIsNovelDataOpen(false);
      setIsCurrentTextOpen(false);
      setIsEditingSuggestion(false); // Reset edit state
      // Initialize editable fields with current context/props
      setEditableSystemPrompt(systemPrompt || t('ai_suggestion_modal_default_system_prompt'));
      setEditableNovelData(novelData || '');

      // Reset states for "Continue Generating"
      setLastSuccessfulQuery('');
      setLastSuccessfulEditableSystemPrompt('');
      setLastSuccessfulEditableNovelData('');

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }, [isOpen, initialQuery, systemPrompt, novelData]);

// Effect to pre-fill aiResponse when "Continue from" is selected
useEffect(() => {
  if (isOpen && promptMode === 'continue') {
    setAiResponse(currentText || '');
  }
  // For 'scratch' or 'modify', aiResponse should start empty or be cleared by handleGetSuggestion.
}, [isOpen, promptMode, currentText]);

// Effect to update token estimation and max context tokens
useEffect(() => {
    if (!isOpen || !currentProfile) {
      setEstimatedTotalTokens(0);
      // Potentially set maxContextTokensForPrompt to a default if profile is null
      // For now, it will retain its last value or default if profile becomes null after being set.
      return;
    }

    const { contextLength, maxOutputTokens } = currentProfile;
    const safetyBuffer = 50; // Small buffer
    const calculatedMaxPromptTokens = (contextLength || 4096) - (maxOutputTokens || 1024) - safetyBuffer;
    setMaxContextTokensForPrompt(calculatedMaxPromptTokens > 0 ? calculatedMaxPromptTokens : 200); // Ensure it's positive

    const systemPromptTokens = tokenCount(editableSystemPrompt);
    const queryTokens = tokenCount(query);
    const novelContextTokensValue = tokenCount(editableNovelData); // Use editableNovelData for token count
    const currentTextTokensValue = (promptMode === 'continue' || promptMode === 'modify') ? tokenCount(currentText) : 0;
    
    setTokenBreakdown({
      system: systemPromptTokens,
      query: queryTokens,
      novelData: novelContextTokensValue,
      currentText: currentTextTokensValue,
    });
    setEstimatedTotalTokens(systemPromptTokens + queryTokens + novelContextTokensValue + currentTextTokensValue);

  }, [isOpen, currentProfile, editableSystemPrompt, query, editableNovelData, currentText, promptMode]);

  // Effect for resizing suggestion textarea
  useEffect(() => {
    if (isEditingSuggestion && suggestionTextareaRef.current) {
      const textarea = suggestionTextareaRef.current;
      textarea.style.height = '0px'; // Reset height to correctly calculate scrollHeight
      // It's often good to defer the height setting to allow the DOM to update
      setTimeout(() => {
        if (textarea) { // Check ref again in case component unmounted
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      }, 0);
    }
  }, [aiResponse, isEditingSuggestion]); // Rerun when aiResponse changes or editing mode toggles

  const isMobileDevice = () => {
    // Simple check, can be made more robust if needed
    return window.innerWidth < 768; // md breakpoint in Tailwind is 768px
  };

  const openFullscreenEditor = (value, onSaveCallback, title, id) => {
    setFullscreenEditModalConfig({
      initialValue: value,
      onSave: onSaveCallback,
      title: title,
      textareaId: id,
    });
    setIsFullscreenEditModalOpen(true);
  };

  const getActiveEndpointConfig = () => {
    if (!currentProfile) {
      console.warn(t('ai_novel_writer_error_no_profile')); // Re-use from novel writer
      return null;
    }
    if (!currentProfile.endpointUrl) {
      console.warn(t('ai_novel_writer_error_profile_no_url', { profileName: currentProfile.name, profileId: currentProfile.id })); // Re-use from novel writer
      return null;
    }

    return {
      url: currentProfile.endpointUrl,
      token: currentProfile.apiToken || '',
      model: currentProfile.modelName,
      maxOutputTokens: currentProfile.maxOutputTokens || 1024, // Ensure this is passed
      contextLength: currentProfile.contextLength || 4096, // For reference, not directly in payload
    };
  };

  const handleGetSuggestion = async (options = {}) => {
    const { isContinuationOfCurrentSuggestion = false } = options;

    let systemPromptForAPI;
    let queryForAPI;
    let novelDataForAPI;
    let textToContinueWithForAPI;
    let shouldClearResponseInitially;

    if (isContinuationOfCurrentSuggestion) {
      if (!lastSuccessfulQuery && !lastSuccessfulEditableSystemPrompt && !lastSuccessfulEditableNovelData) {
        // It's possible lastSuccessfulQuery is empty if the initial query was empty,
        // but system prompt and novel data should ideally exist if a suggestion was made.
        // For robustness, check if all are effectively empty or rely on aiResponse content.
        // If aiResponse is also empty, this button shouldn't have been shown.
        setAiResponse(prev => prev + t('ai_suggestion_modal_error_cannot_continue_context_not_found'));
        setIsLoading(false);
        return;
      }
      systemPromptForAPI = lastSuccessfulEditableSystemPrompt;
      queryForAPI = lastSuccessfulQuery;
      novelDataForAPI = lastSuccessfulEditableNovelData;
      textToContinueWithForAPI = aiResponse; // Current aiResponse is the base
      shouldClearResponseInitially = false; // We are appending
    } else {
      systemPromptForAPI = editableSystemPrompt;
      queryForAPI = query;
      novelDataForAPI = editableNovelData;

      if (promptMode === 'scratch' || promptMode === 'modify') {
        textToContinueWithForAPI = (promptMode === 'modify') ? currentText : null; // Pass currentText for API if modifying
        shouldClearResponseInitially = true; // Clear response area for both scratch and modify
      } else { // 'continue'
        textToContinueWithForAPI = currentText;
        shouldClearResponseInitially = false;
      }
    }

    const endpointConfig = getActiveEndpointConfig();
    if (!endpointConfig) {
      setAiResponse((shouldClearResponseInitially ? '' : aiResponse) + t('ai_suggestion_modal_error_endpoint_not_configured_suffix'));
      setActiveTab('suggestion');
      setIsLoading(false);
      return;
    }

    // Token calculation for THIS specific request
    const tempSystemPromptTokens = tokenCount(systemPromptForAPI);
    const tempQueryTokens = tokenCount(queryForAPI);
    const tempNovelContextTokensValue = tokenCount(novelDataForAPI);
    const tempCurrentTextTokensValue = textToContinueWithForAPI ? tokenCount(textToContinueWithForAPI) : 0;
    const tempTotalTokens = tempSystemPromptTokens + tempQueryTokens + tempNovelContextTokensValue + tempCurrentTextTokensValue;
    
    if (tempTotalTokens > maxContextTokensForPrompt) {
      setAiResponse((shouldClearResponseInitially ? '' : aiResponse) +
        t('ai_suggestion_modal_error_prompt_too_large_suffix', { tokens: tempTotalTokens, maxTokens: maxContextTokensForPrompt }));
      setActiveTab('suggestion');
      setIsLoading(false);
      return;
    }

    // If all checks passed and we are about to make the API call, update last successful states if it's a new query
    if (!isContinuationOfCurrentSuggestion) {
      setLastSuccessfulQuery(queryForAPI);
      setLastSuccessfulEditableSystemPrompt(systemPromptForAPI);
      setLastSuccessfulEditableNovelData(novelDataForAPI);
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setIsEditingSuggestion(false); // Exit edit mode when loading starts
    if (shouldClearResponseInitially) {
      setAiResponse('');
    }
    // If continuing (from checkbox or "Continue Generating"), aiResponse already holds the base text.
    setActiveTab('suggestion');

    try {
      let userContent = "";
      if (novelDataForAPI && novelDataForAPI.trim() !== '') {
        userContent += t('ai_suggestion_modal_text_novel_data_context_prefix', { context: novelDataForAPI });
      }
      userContent += t('ai_suggestion_modal_text_user_query_prefix', { query: queryForAPI });

      if (textToContinueWithForAPI && textToContinueWithForAPI.trim() !== '') {
        if (isContinuationOfCurrentSuggestion) {
          // When "Continue Generating" is clicked, always use this suffix
          userContent += t('ai_suggestion_modal_text_continue_suffix', { text: textToContinueWithForAPI });
        } else {
          // For initial suggestions from the Query tab, use the selected promptMode
          if (promptMode === 'continue') {
            userContent += t('ai_suggestion_modal_text_continue_suffix', { text: textToContinueWithForAPI });
          } else if (promptMode === 'modify') {
            userContent += t('ai_suggestion_modal_text_modify_suffix', { text: textToContinueWithForAPI });
          }
          // For 'scratch', textToContinueWithForAPI is null, so this block is skipped.
        }
      }

      const payload = {
        model: endpointConfig.model,
        messages: [
          { role: 'system', content: systemPromptForAPI || t('ai_chat_modal_default_system_prompt') },
          { role: 'user', content: userContent },
        ],
        stream: true,
        max_tokens: endpointConfig.maxOutputTokens,
      };

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
        let detailMessage = errorText;
        try {
            const errorJson = JSON.parse(errorText);
            detailMessage = errorJson.error?.message || errorJson.message || errorText;
        } catch (e) {
            // Keep errorText as detailMessage
        }
        throw new Error(t('ai_suggestion_modal_error_api_generic', { status: response.status, message: detailMessage }));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
            const eventString = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);

            if (eventString.startsWith('data: ')) {
                const jsonData = eventString.substring('data: '.length).trim();
                if (jsonData === '[DONE]') {
                  // OpenAI specific [DONE] signal, loop will break on next reader.read()
                  // For robustness, we can break here if we are sure it's the end.
                  // await reader.cancel(); // This might be too aggressive
                  // The 'done' flag from reader.read() is the primary way to exit.
                } else {
                  try {
                      const parsed = JSON.parse(jsonData);
                      if (parsed.choices && parsed.choices[0]?.delta?.content) {
                          setAiResponse(prev => prev + parsed.choices[0].delta.content);
                      }
                  } catch (e) {
                      console.error('Error parsing stream JSON chunk:', e, jsonData);
                      // Potentially append raw chunk if it's just text and not JSON
                  }
                }
            }
            boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setAiResponse(prev => prev + "\n\n"); // Keep newline for visual separation if aborted
      } else {
        console.error('Streaming error:', error);
        setAiResponse(prev => prev + t('ai_suggestion_modal_error_generic_suffix', { message: error.message }));
      }
    } finally {
      setIsLoading(false);
      // Ensure ref is cleared if not aborted by user action that already clears it
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
         abortControllerRef.current = null;
      }
    }
  };
  
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // abortControllerRef.current = null; // Let the finally block in handleGetSuggestion clear it
    }
    // setIsLoading(false); // isLoading will be set to false in the finally block
    // setIsEditingSuggestion(false); // Already handled by finally block of handleGetSuggestion
  };

  const handleContinueSuggGeneration = () => {
    handleGetSuggestion({ isContinuationOfCurrentSuggestion: true });
  };

  const handleAccept = () => {
    onAccept(aiResponse);
    onClose();
  };
  
  const handleModalClose = () => {
    // This is called by Dialog's onOpenChange when closing
    // The useEffect for isOpen will handle aborting and cleanup
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl w-[90vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{t('ai_suggestion_modal_dialog_title', { fieldLabel: fieldLabel || t('ai_suggestion_modal_default_field_label') })}</DialogTitle>

        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-grow overflow-y-auto px-6">
          {/* Memory Progress Bar */}
          <div className="flex items-center gap-2 py-3 border-b"> {/* Removed px-6 */}
          <Database className="h-5 w-5 text-muted-foreground" />
          <Progress 
            value={maxContextTokensForPrompt > 0 ? (estimatedTotalTokens / maxContextTokensForPrompt) * 100 : 0} 
            className={`w-full [&>div]:transition-all [&>div]:duration-500 ${
              maxContextTokensForPrompt > 0 && estimatedTotalTokens / maxContextTokensForPrompt >= 1 ? ' [&>div]:bg-destructive' : 
              maxContextTokensForPrompt > 0 && estimatedTotalTokens / maxContextTokensForPrompt >= 0.5 ? ' [&>div]:bg-yellow-500' : ''
            }`}
          />
          {/* Token count text removed as per request */}
        </div>

        {/* Collapsible Memory Details */}
        <Collapsible open={isMemoryDetailOpen} onOpenChange={setIsMemoryDetailOpen} className="py-2 border-b text-xs"> {/* Removed px-6 */}
          <CollapsibleTrigger asChild>
            <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground flex items-center">
              {t('ai_chat_modal_memory_usage_details_button')}
              {isMemoryDetailOpen ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1 text-muted-foreground">
                {estimatedTotalTokens > 0 && currentProfile ? (
                  <>
                    <p>{t('ai_suggestion_modal_memory_system_prompt_stats', { percentage: (tokenBreakdown.system / estimatedTotalTokens * 100).toFixed(1), tokens: tokenBreakdown.system })}</p>
                    <p>{t('ai_suggestion_modal_memory_your_query_stats', { percentage: (tokenBreakdown.query / estimatedTotalTokens * 100).toFixed(1), tokens: tokenBreakdown.query })}</p>
                    {tokenBreakdown.novelData > 0 && (
                      <p className="flex items-center">
                        {novelDataLevel && novelDataLevel > 1 && novelDataLevel !== -1 && (
                          <TriangleAlert className="h-3 w-3 mr-1 text-yellow-500" />
                        )}
                        {novelDataLevel === -1 && (
                           <TriangleAlert className="h-3 w-3 mr-1 text-destructive" />
                        )}
                        <span className={
                          novelDataLevel === -1 ? 'text-destructive' :
                          novelDataLevel === 4 ? 'text-destructive' :
                          novelDataLevel === 2 || novelDataLevel === 3 ? 'text-yellow-600 dark:text-yellow-400' : ''
                        }>
                          {t('ai_novel_writer_memory_novel_context_stats_label', { level: novelDataLevel === -1 ? t('ai_novel_writer_memory_details_level_err') : novelDataLevel })}:
                        </span>
                        <span className="ml-1">
                          {t('ai_novel_writer_memory_novel_context_stats_tokens', { percentage: (tokenBreakdown.novelData / estimatedTotalTokens * 100).toFixed(1), tokens: tokenBreakdown.novelData })}
                        </span>
                      </p>
                    )}
                     {novelDataLevel && novelDataLevel > 1 && novelDataLevel !== -1 && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 pl-4">
                        {t('ai_novel_writer_memory_context_reduced_note')}
                      </p>
                    )}
                    {novelDataLevel === -1 && (
                       <p className="text-xs text-destructive pl-4">
                        {t('ai_novel_writer_memory_context_failed_note')}
                      </p>
                    )}
                    {(promptMode === 'continue' || promptMode === 'modify') && tokenBreakdown.currentText > 0 && (
                      <p>{t('ai_suggestion_modal_memory_current_text_stats', { percentage: (tokenBreakdown.currentText / estimatedTotalTokens * 100).toFixed(1), tokens: tokenBreakdown.currentText })}</p>
                    )}
                    <p className="pt-1 border-t mt-1 font-semibold">{t('ai_novel_writer_memory_total_input_tokens', { tokens: estimatedTotalTokens })}</p>
                    <p className="text-slate-500 dark:text-slate-400">{t('ai_novel_writer_memory_max_output_tokens', { tokens: currentProfile.maxOutputTokens || t('ai_novel_writer_memory_details_level_na') })}</p>
                    <p className="text-slate-500 dark:text-slate-400">{t('ai_novel_writer_memory_safety_buffer', { tokens: 50 })}</p>
                    <p>{t('ai_novel_writer_memory_available_for_input', { tokens: maxContextTokensForPrompt })}</p>
                    <p className="text-slate-500 dark:text-slate-400">{t('ai_novel_writer_memory_total_model_context', { tokens: currentProfile.contextLength || t('ai_novel_writer_memory_details_level_na') })}</p>
                  </>
            ) : (
              <p>{t('ai_novel_writer_memory_token_details_unavailable')}</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col pb-1 pt-2"> {/* Removed flex-grow, overflow-hidden, px-6 */}
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="query" disabled={isLoading}>{t('ai_suggestion_modal_tab_query')}</TabsTrigger>
            <TabsTrigger value="suggestion">{t('ai_suggestion_modal_tab_suggestion')}</TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="flex-grow space-y-3 py-1 pr-1"> {/* Removed overflow-y-auto */}
            <div className="pb-3">
              <Button onClick={handleGetSuggestion} className="w-full" disabled={isLoading}>
                {t('ai_suggestion_modal_button_get_suggestion')}
              </Button>
            </div>
            <Collapsible open={isSystemPromptOpen} onOpenChange={setIsSystemPromptOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between w-full px-1 py-1.5 text-sm font-medium text-left">
                  {t('ai_suggestion_modal_label_system_prompt')}
                  {isSystemPromptOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  value={editableSystemPrompt}
                  onChange={(e) => {
                    if (!isMobileDevice()) {
                      setEditableSystemPrompt(e.target.value);
                    }
                  }}
                  onClick={() => {
                    if (isMobileDevice()) {
                      openFullscreenEditor(
                        editableSystemPrompt,
                        (newValue) => setEditableSystemPrompt(newValue),
                        t('ai_suggestion_modal_label_system_prompt'),
                        'fullscreen-system-prompt'
                      );
                    }
                  }}
                  readOnly={isMobileDevice()}
                  rows={3}
                  className="w-full resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
                  placeholder={t('ai_suggestion_modal_placeholder_system_prompt')}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* NovelData is now always potentially present due to editableNovelData state */}
            <Collapsible open={isNovelDataOpen} onOpenChange={setIsNovelDataOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                {/* The trigger text can still refer to the original novelData's properties like level */}
                <Button variant="ghost" className="flex items-center justify-between w-full px-1 py-1.5 text-sm font-medium text-left">
                    <span>
                      {t('ai_suggestion_modal_label_novel_data_context')}
                       {novelDataLevel !== undefined && novelDataLevel > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">{t('ai_suggestion_modal_label_novel_data_context_level', { level: novelDataLevel })}</span>
                      )}
                       {novelDataLevel === -1 && (
                        <span className="text-xs text-destructive ml-2">{t('ai_suggestion_modal_memory_context_too_large_label')}</span>
                      )}
                    </span>
                    {isNovelDataOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    value={editableNovelData}
                    onChange={(e) => {
                      if (!isMobileDevice()) {
                        setEditableNovelData(e.target.value);
                      }
                    }}
                    onClick={() => {
                      if (isMobileDevice()) {
                        openFullscreenEditor(
                          editableNovelData,
                          (newValue) => setEditableNovelData(newValue),
                          t('ai_suggestion_modal_label_novel_data_context'),
                          'fullscreen-novel-data'
                        );
                      }
                    }}
                    readOnly={isMobileDevice()}
                    rows={5}
                    className="w-full resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
                    placeholder={t('ai_suggestion_modal_placeholder_novel_data_context')}
                  />
                </CollapsibleContent>
              </Collapsible>
            {/* )} */} {/* Closing bracket for the original conditional rendering, now removed */}
            
            <div className="py-2 space-y-2">
              <Label className="text-sm font-medium">{t('ai_suggestion_modal_label_prompt_mode')}</Label>
              <RadioGroup
                value={promptMode}
                onValueChange={setPromptMode}
                className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                disabled={!currentText || currentText.trim() === ''} // Disable group if no current text for continue/modify
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scratch" id="r-scratch" />
                  <Label htmlFor="r-scratch" className="font-normal">{t('ai_suggestion_modal_radio_write_from_scratch')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="continue" id="r-continue" disabled={!currentText || currentText.trim() === ''} />
                  <Label htmlFor="r-continue" className={`font-normal ${(!currentText || currentText.trim() === '') ? 'text-muted-foreground' : ''}`}>{t('ai_suggestion_modal_radio_continue_from_previous')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="modify" id="r-modify" disabled={!currentText || currentText.trim() === ''} />
                  <Label htmlFor="r-modify" className={`font-normal ${(!currentText || currentText.trim() === '') ? 'text-muted-foreground' : ''}`}>{t('ai_suggestion_modal_radio_modify_previous')}</Label>
                </div>
              </RadioGroup>
            </div>

            <Collapsible
              open={(promptMode === 'continue' || promptMode === 'modify') && isCurrentTextOpen}
              onOpenChange={setIsCurrentTextOpen}
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center justify-between w-full px-1 py-1.5 text-sm font-medium text-left"
                  disabled={!(promptMode === 'continue' || promptMode === 'modify') || (!currentText || currentText.trim() === '')}
                >
                  {t('ai_suggestion_modal_label_current_text', { fieldLabel: fieldLabel || t('ai_suggestion_modal_default_field_label')})}
                  {((promptMode === 'continue' || promptMode === 'modify') && isCurrentTextOpen) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  id="currentTextDisplay"
                  value={currentText || t('ai_suggestion_modal_placeholder_no_current_text', {fieldLabel: fieldLabel?.toLowerCase() || t('ai_suggestion_modal_default_field_label').toLowerCase() })}
                  readOnly
                  rows={3}
                  className="w-full resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-1 pt-2">
              <Label htmlFor="aiQueryInput">{t('ai_suggestion_modal_label_your_query')}</Label>
                <Textarea
                  id="aiQueryInput"
                  value={query}
                  onChange={(e) => {
                    if (!isMobileDevice()) {
                      setQuery(e.target.value);
                    }
                  }}
                  onClick={() => {
                    if (isMobileDevice()) {
                      openFullscreenEditor(
                        query,
                        (newValue) => setQuery(newValue),
                        t('ai_suggestion_modal_label_your_query'),
                        'fullscreen-query-input'
                      );
                    }
                  }}
                  readOnly={isMobileDevice()}
                  placeholder={t('ai_suggestion_modal_placeholder_your_query')}
                  rows={5}
                  className="resize-none"
                  disabled={isLoading}
                />
              </div>
            </TabsContent>

          <TabsContent value="suggestion" className="flex flex-col flex-grow py-1 pr-1">
            {/* Buttons Area: Moved to the top of the tab content */}
            {(isLoading || (aiResponse && aiResponse.trim() !== '')) && (
              <div className="pt-2 pb-2 mb-2"> 
                {isLoading ? (
                  <Button onClick={handleStopGeneration} variant="destructive" className="w-full">
                    {t('ai_chat_modal_tooltip_stop_generating')} 
                  </Button>
                ) : (
                  // This branch is taken if !isLoading.
                  // The outer condition ensures (aiResponse && aiResponse.trim() !== '') is true here.
                  // Add check for lastSuccessfulEditableSystemPrompt to ensure context exists for continuation.
                  <Button 
                    onClick={handleContinueSuggGeneration} 
                    className="w-full"
                    disabled={!lastSuccessfulEditableSystemPrompt} // Disable if no prior successful context
                  >
                    {t('ai_suggestion_modal_button_continue_generating')}
                  </Button>
                )}
              </div>
            )}

            {/* Response Area: Takes up available space and scrolls */}
            <div className="flex-grow overflow-y-auto p-2"> {/* Added p-2 for consistency */}
              {isLoading && !aiResponse && (
                <div className="w-full text-muted-foreground min-h-[100px]">{t('ai_suggestion_modal_status_streaming')}</div>
              )}
              {isLoading && aiResponse && (
                 <div className="w-full whitespace-pre-wrap break-words min-h-[100px]">
                  {aiResponse}
                  <span className="text-muted-foreground">{t('ai_suggestion_modal_status_streaming_suffix')}</span>
                </div>
              )}
              {!isLoading && !aiResponse && (
                <div className="flex items-center justify-center h-full text-slate-500 min-h-[100px]">
                  <p>{t('ai_suggestion_modal_placeholder_no_suggestion')}</p>
                </div>
              )}
              {!isLoading && aiResponse && (
                isEditingSuggestion ? ( // This block is for when editing is active (desktop or mobile before fullscreen)
                  <Textarea
                    ref={suggestionTextareaRef}
                    value={aiResponse}
                    onChange={(e) => {
                      if (!isMobileDevice()) {
                        setAiResponse(e.target.value);
                      }
                    }}
                    onBlur={() => {
                      if (!isMobileDevice()) setIsEditingSuggestion(false);
                    }}
                    onClick={() => { // For mobile, clicking the already-editing textarea also opens fullscreen
                      if (isMobileDevice()) {
                        openFullscreenEditor(
                          aiResponse,
                          (newValue) => {
                            setAiResponse(newValue);
                            setIsEditingSuggestion(false); // Close inline edit after save from fullscreen
                          },
                          t('ai_suggestion_modal_tab_suggestion'),
                          'fullscreen-ai-suggestion'
                        );
                      }
                    }}
                    readOnly={isMobileDevice()}
                    autoFocus={!isMobileDevice()} // Only autofocus on desktop
                    className="w-full min-h-[100px] resize-none overflow-hidden text-base leading-relaxed focus-visible:ring-1 border border-input bg-background rounded-md p-3"
                  />
                ) : ( // This block is for when suggestion is displayed (not in edit mode)
                  <div
                    onClick={() => {
                      if (!isLoading) {
                        if (isMobileDevice()) {
                          openFullscreenEditor(
                            aiResponse,
                            (newValue) => setAiResponse(newValue),
                            t('ai_suggestion_modal_tab_suggestion'),
                            'fullscreen-ai-suggestion'
                          );
                        } else {
                          setIsEditingSuggestion(true);
                        }
                      }
                    }}
                    className="w-full p-2 whitespace-pre-wrap break-words min-h-[100px] cursor-text" // Added cursor-text for better UX
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { 
                      if (!isLoading && (e.key === 'Enter' || e.key === ' ')) { 
                        e.preventDefault(); 
                        if (isMobileDevice()) {
                          openFullscreenEditor(
                            aiResponse,
                            (newValue) => setAiResponse(newValue),
                            t('ai_suggestion_modal_tab_suggestion'),
                            'fullscreen-ai-suggestion'
                          );
                        } else {
                          setIsEditingSuggestion(true);
                        }
                      }
                    }}
                  >
                    {aiResponse}
                  </div>
                )
              )}
            </div>

            {/* Buttons Area was here, now moved to the top */}
          </TabsContent>
        </Tabs>
      </div> {/* End of scrollable content area */}

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={handleModalClose} disabled={isLoading && abortControllerRef.current && !abortControllerRef.current.signal.aborted}>
            {t('cancel')}
          </Button>
          <Button onClick={handleAccept} disabled={!aiResponse || isLoading || activeTab !== 'suggestion' || isEditingSuggestion}>
            {t('ai_suggestion_modal_button_accept_suggestion')}
          </Button>
        </DialogFooter>
      </DialogContent>
      {isFullscreenEditModalOpen && (
        <FullscreenTextareaEditModal
          isOpen={isFullscreenEditModalOpen}
          onClose={() => setIsFullscreenEditModalOpen(false)}
          initialValue={fullscreenEditModalConfig.initialValue}
          onSave={fullscreenEditModalConfig.onSave}
          title={fullscreenEditModalConfig.title}
          textareaId={fullscreenEditModalConfig.textareaId}
        />
      )}
    </Dialog>
  );
};
