import React, { useState, useEffect, useRef } from 'react';
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
      setEditableSystemPrompt(systemPrompt || "You are an experienced creative writing assistant.");
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


  const getActiveEndpointConfig = () => {
    if (!currentProfile) {
      console.warn("No AI profile determined.");
      return null;
    }
    if (!currentProfile.endpointUrl) {
      console.warn(`AI Profile ${currentProfile.name} (ID: ${currentProfile.id}) has no endpoint URL configured.`);
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
        setAiResponse(prev => prev + "\n\n--- Error: Cannot continue, original context not found. ---");
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
      setAiResponse((shouldClearResponseInitially ? '' : aiResponse) + "\n\n--- AI endpoint not configured. Please check settings. ---");
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
        `\n\n--- Estimated prompt tokens (${tempTotalTokens}) for this request exceed the maximum allowed (${maxContextTokensForPrompt}). Please shorten your query or context. ---`);
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
        userContent += `Novel Data Context:\n${novelDataForAPI}\n\n---\n`;
      }
      userContent += `User Query:\n${queryForAPI}`;

      if (textToContinueWithForAPI && textToContinueWithForAPI.trim() !== '') {
        if (isContinuationOfCurrentSuggestion) {
          // When "Continue Generating" is clicked, always use this suffix
          userContent += `\n\n---${textToContinueWithForAPI} (CONTINUE FROM HERE!)`;
        } else {
          // For initial suggestions from the Query tab, use the selected promptMode
          if (promptMode === 'continue') {
            userContent += `\n\n---${textToContinueWithForAPI} (CONTINUE FROM HERE!)`;
          } else if (promptMode === 'modify') {
            userContent += `\n\n---${textToContinueWithForAPI} (MODIFY THIS)`;
          }
          // For 'scratch', textToContinueWithForAPI is null, so this block is skipped.
        }
      }

      const payload = {
        model: endpointConfig.model,
        messages: [
          { role: 'system', content: systemPromptForAPI || "You are a helpful assistant." },
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
        let errorMessage = `API Error: ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage += ` - ${errorJson.error?.message || errorJson.message || errorText}`;
        } catch (e) {
            errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
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
        setAiResponse(prev => prev + "\n\n");
      } else {
        console.error('Streaming error:', error);
        setAiResponse(prev => prev + `\n\n--- Error: ${error.message} ---`);
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
          <DialogTitle>AI Suggestion for {fieldLabel || 'Text'}</DialogTitle>

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
              Memory Usage Details
              {isMemoryDetailOpen ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1 text-muted-foreground">
                {estimatedTotalTokens > 0 && currentProfile ? (
                  <>
                    <p>System Prompt: {(tokenBreakdown.system / estimatedTotalTokens * 100).toFixed(1)}% ({tokenBreakdown.system} tokens)</p>
                    <p>Your Query: {(tokenBreakdown.query / estimatedTotalTokens * 100).toFixed(1)}% ({tokenBreakdown.query} tokens)</p>
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
                          Novel Data Context (Lvl {novelDataLevel === -1 ? 'ERR' : novelDataLevel}): 
                        </span>
                        <span className="ml-1">
                          {(tokenBreakdown.novelData / estimatedTotalTokens * 100).toFixed(1)}% ({tokenBreakdown.novelData} tokens)
                        </span>
                      </p>
                    )}
                     {novelDataLevel && novelDataLevel > 1 && novelDataLevel !== -1 && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 pl-4">
                        (Context automatically reduced to fit model limits. Level 1 is most detailed.)
                      </p>
                    )}
                    {novelDataLevel === -1 && (
                       <p className="text-xs text-destructive pl-4">
                        (Failed to generate context, likely too large even after trimming.)
                      </p>
                    )}
                    {(promptMode === 'continue' || promptMode === 'modify') && tokenBreakdown.currentText > 0 && (
                      <p>Current Text: {(tokenBreakdown.currentText / estimatedTotalTokens * 100).toFixed(1)}% ({tokenBreakdown.currentText} tokens)</p>
                    )}
                    <p className="pt-1 border-t mt-1 font-semibold">Total Estimated Input: {estimatedTotalTokens} tokens</p>
                    <p className="text-slate-500 dark:text-slate-400">Max Output Tokens (Model Setting): {currentProfile.maxOutputTokens || 'N/A'} tokens</p>
                    <p className="text-slate-500 dark:text-slate-400">Safety Buffer: {50} tokens</p>
                    <p>Available for Input Prompt: {maxContextTokensForPrompt} tokens</p>
                    <p className="text-slate-500 dark:text-slate-400">Total Model Context Length: {currentProfile.contextLength || 'N/A'} tokens</p>
                  </>
            ) : (
              <p>No token details available yet. Ensure AI profile is configured.</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col pb-1 pt-2"> {/* Removed flex-grow, overflow-hidden, px-6 */}
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="query" disabled={isLoading}>Query</TabsTrigger>
            <TabsTrigger value="suggestion">Suggestion</TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="flex-grow space-y-3 py-1 pr-1"> {/* Removed overflow-y-auto */}
            <div className="pb-3">
              <Button onClick={handleGetSuggestion} className="w-full" disabled={isLoading}>
                Get Suggestion
              </Button>
            </div>
            <Collapsible open={isSystemPromptOpen} onOpenChange={setIsSystemPromptOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between w-full px-1 py-1.5 text-sm font-medium text-left">
                  System Prompt
                  {isSystemPromptOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  value={editableSystemPrompt}
                  onChange={(e) => setEditableSystemPrompt(e.target.value)}
                  rows={3}
                  className="w-full resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
                  placeholder="Enter system prompt here..."
                />
              </CollapsibleContent>
            </Collapsible>

            {/* NovelData is now always potentially present due to editableNovelData state */}
            <Collapsible open={isNovelDataOpen} onOpenChange={setIsNovelDataOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                {/* The trigger text can still refer to the original novelData's properties like level */}
                <Button variant="ghost" className="flex items-center justify-between w-full px-1 py-1.5 text-sm font-medium text-left">
                    <span>
                      Novel Data Context 
                      {/*novelDataLevel !== undefined && novelDataLevel > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">(Detail Lvl: {novelDataLevel})</span>
                      )*/}
                       {novelDataLevel === -1 && (
                        <span className="text-xs text-destructive ml-2">(Context Too Large)</span>
                      )}
                    </span>
                    {isNovelDataOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    value={editableNovelData} 
                    onChange={(e) => setEditableNovelData(e.target.value)}
                    rows={5}
                    className="w-full resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
                    placeholder="Enter novel data context here. (This will be used for the AI prompt)"
                  />
                </CollapsibleContent>
              </Collapsible>
            {/* )} */} {/* Closing bracket for the original conditional rendering, now removed */}
            
            <div className="py-2 space-y-2">
              <Label className="text-sm font-medium">AI Prompt Mode:</Label>
              <RadioGroup
                value={promptMode}
                onValueChange={setPromptMode}
                className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0"
                disabled={!currentText || currentText.trim() === ''} // Disable group if no current text for continue/modify
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scratch" id="r-scratch" />
                  <Label htmlFor="r-scratch" className="font-normal">Write from scratch</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="continue" id="r-continue" disabled={!currentText || currentText.trim() === ''} />
                  <Label htmlFor="r-continue" className={`font-normal ${(!currentText || currentText.trim() === '') ? 'text-muted-foreground' : ''}`}>Continue from previous</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="modify" id="r-modify" disabled={!currentText || currentText.trim() === ''} />
                  <Label htmlFor="r-modify" className={`font-normal ${(!currentText || currentText.trim() === '') ? 'text-muted-foreground' : ''}`}>Modify previous</Label>
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
                  Current {fieldLabel || 'Text'}
                  {((promptMode === 'continue' || promptMode === 'modify') && isCurrentTextOpen) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  id="currentTextDisplay"
                  value={currentText || `No current ${fieldLabel?.toLowerCase() || 'text'} available or relevant mode selected.`}
                  readOnly
                  rows={3}
                  className="w-full resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-1 pt-2">
              <Label htmlFor="aiQueryInput">Your Query:</Label>
              <Textarea
                id="aiQueryInput"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Make this more concise, expand on this idea, write a short dialogue..."
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
                    Stop Generating
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
                    Continue Generating
                  </Button>
                )}
              </div>
            )}

            {/* Response Area: Takes up available space and scrolls */}
            <div className="flex-grow overflow-y-auto p-2"> {/* Added p-2 for consistency */}
              {isLoading && !aiResponse && (
                <div className="w-full text-muted-foreground min-h-[100px]">Streaming suggestion...</div>
              )}
              {isLoading && aiResponse && (
                 <div className="w-full whitespace-pre-wrap break-words min-h-[100px]">
                  {aiResponse}
                  <span className="text-muted-foreground"> (streaming...)</span>
                </div>
              )}
              {!isLoading && !aiResponse && (
                <div className="flex items-center justify-center h-full text-slate-500 min-h-[100px]">
                  <p>No suggestion generated. Use the Query tab or check configuration.</p>
                </div>
              )}
              {!isLoading && aiResponse && (
                isEditingSuggestion ? (
                  <Textarea
                    ref={suggestionTextareaRef} // Assign ref
                    value={aiResponse}
                    onChange={(e) => setAiResponse(e.target.value)}
                    onBlur={() => setIsEditingSuggestion(false)}
                    autoFocus
                    className="w-full min-h-[100px] resize-none overflow-hidden text-base leading-relaxed focus-visible:ring-1 border border-input bg-background rounded-md p-3" // Added overflow-hidden
                  />
                ) : (
                  <div
                    onClick={() => {
                      if (!isLoading) setIsEditingSuggestion(true);
                    }}
                    className="w-full p-2 whitespace-pre-wrap break-words min-h-[100px]" // Removed interactive styling classes
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (!isLoading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setIsEditingSuggestion(true); }}}
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
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={!aiResponse || isLoading || activeTab !== 'suggestion' || isEditingSuggestion}>
            Accept Suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
