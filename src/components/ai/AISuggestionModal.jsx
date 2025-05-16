import React, { useState, useEffect, useRef } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, TriangleAlert, Database } from 'lucide-react'; // Or ChevronsUpDown
import { Progress } from "@/components/ui/progress"; // Added Progress
import { useSettings } from '../../context/SettingsContext';
import { tokenCount } from '../../lib/utils'; // Added tokenCount

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
    getActiveProfile, // Assuming getActiveProfile is available to get the full profile object
  } = useSettings();

  const [query, setQuery] = useState(initialQuery || '');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('query');
  const abortControllerRef = useRef(null);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [isNovelDataOpen, setIsNovelDataOpen] = useState(false);
  const [isCurrentTextOpen, setIsCurrentTextOpen] = useState(false);
  const [includeCurrentTextInPrompt, setIncludeCurrentTextInPrompt] = useState(false);

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
      setIncludeCurrentTextInPrompt(false);
      setIsSystemPromptOpen(false);
      setIsNovelDataOpen(false);
      setIsCurrentTextOpen(false);
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
  }, [isOpen, initialQuery]);

  // Effect to pre-fill aiResponse when "Continue from" is checked
  useEffect(() => {
    if (isOpen && includeCurrentTextInPrompt) {
      setAiResponse(currentText || '');
    }
    // If the user unchecks it, aiResponse is not automatically cleared.
  }, [isOpen, includeCurrentTextInPrompt, currentText]);

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

    const systemPromptTokens = tokenCount(systemPrompt);
    const queryTokens = tokenCount(query);
    const novelContextTokensValue = novelDataTokens !== undefined ? novelDataTokens : tokenCount(novelData);
    const currentTextTokensValue = includeCurrentTextInPrompt ? tokenCount(currentText) : 0;
    
    setTokenBreakdown({
      system: systemPromptTokens,
      query: queryTokens,
      novelData: novelContextTokensValue,
      currentText: currentTextTokensValue,
    });
    setEstimatedTotalTokens(systemPromptTokens + queryTokens + novelContextTokensValue + currentTextTokensValue);

  }, [isOpen, currentProfile, systemPrompt, query, novelData, novelDataTokens, currentText, includeCurrentTextInPrompt]);


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

  const handleGetSuggestion = async () => {
    const endpointConfig = getActiveEndpointConfig();

    if (!endpointConfig) {
      setAiResponse("AI endpoint not configured. Please check settings.");
      setActiveTab('suggestion');
      setIsLoading(false);
      return;
    }
    
    if (estimatedTotalTokens > maxContextTokensForPrompt) {
      setAiResponse(`Estimated prompt tokens (${estimatedTotalTokens}) exceed the maximum allowed for this model's configuration (${maxContextTokensForPrompt}). Please shorten your query or context.`);
      setActiveTab('suggestion');
      setIsLoading(false);
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    if (!includeCurrentTextInPrompt) {
      setAiResponse(''); // Only clear if not continuing
    }
    // If includeCurrentTextInPrompt is true, aiResponse already holds currentText
    // and the AI's new content will be appended to it.
    setActiveTab('suggestion');

    try {
      let userContent = "";
      if (novelData && novelData.trim() !== '') {
        userContent += `Novel Data Context:\n${novelData}\n\n---\n`;
      }
      // User Query first
      userContent += `User Query:\n${query}`;

      // Then the text to continue, if applicable
      if (includeCurrentTextInPrompt && currentText && currentText.trim() !== '') {
        userContent += `\n\n---${currentText} (CONTINUE FROM HERE!)`;
      }

      const payload = {
        model: endpointConfig.model,
        messages: [
          { role: 'system', content: systemPrompt || "You are a helpful assistant." },
          { role: 'user', content: userContent },
        ],
        stream: true,
        max_tokens: endpointConfig.maxOutputTokens, // Add max_tokens
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
      abortControllerRef.current = null; 
    }
    setIsLoading(false);
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
                    {includeCurrentTextInPrompt && tokenBreakdown.currentText > 0 && (
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
            <Collapsible open={isSystemPromptOpen} onOpenChange={setIsSystemPromptOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between w-full px-1 py-1.5 text-sm font-medium text-left">
                  System Prompt
                  {isSystemPromptOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  value={systemPrompt}
                  readOnly
                  rows={3}
                  className="w-full resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
                  placeholder="No system prompt configured."
                />
              </CollapsibleContent>
            </Collapsible>

            {novelData && novelData.trim() !== '' && (
              <Collapsible open={isNovelDataOpen} onOpenChange={setIsNovelDataOpen} className="space-y-1">
                <CollapsibleTrigger asChild>
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
                    value={novelData} // novelData is already a string or null/undefined
                    readOnly
                    rows={5}
                    className="w-full resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs"
                    placeholder="Novel data context will appear here."
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="includeCurrentTextCheckbox"
                checked={includeCurrentTextInPrompt}
                onCheckedChange={setIncludeCurrentTextInPrompt}
                disabled={!currentText || currentText.trim() === ''}
              />
              <Label
                htmlFor="includeCurrentTextCheckbox"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Continue from existing text
              </Label>
            </div>
            
            <Collapsible 
              open={includeCurrentTextInPrompt && isCurrentTextOpen} 
              onOpenChange={setIsCurrentTextOpen} 
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-between w-full px-1 py-1.5 text-sm font-medium text-left"
                  disabled={!includeCurrentTextInPrompt || (!currentText || currentText.trim() === '')}
                >
                  Current {fieldLabel || 'Text'}
                  {(includeCurrentTextInPrompt && isCurrentTextOpen) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  id="currentTextDisplay"
                  value={currentText || `No current ${fieldLabel?.toLowerCase() || 'text'} provided or checkbox unchecked.`}
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
            <div className="pt-3">
              <Button onClick={handleGetSuggestion} className="w-full sm:w-auto" disabled={isLoading}>
                Get Suggestion
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="suggestion" className="flex flex-col flex-grow py-1 pr-1"> {/* Removed overflow-y-auto */}
            <div className="flex-grow overflow-y-auto">
              {isLoading && !aiResponse && (
                <div className="w-full p-2 text-muted-foreground min-h-[100px]">Streaming suggestion...</div>
              )}
              {!isLoading && !aiResponse && (
                <div className="flex items-center justify-center h-full text-slate-500 min-h-[100px]">
                  <p>No suggestion generated. Use the Query tab or check configuration.</p>
                </div>
              )}
              {aiResponse && (
                 <div 
                  id="aiResponseText"
                  className="w-full p-2 whitespace-pre-wrap break-words min-h-[100px]"
                 >
                  {aiResponse}
                </div>
              )}
            </div>
            {isLoading && (
              <div className="pt-2 mt-auto"> {/* Ensures button is at the bottom of the tab content area */}
                <Button onClick={handleStopGeneration} variant="destructive" className="w-full">
                  Stop Generating
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div> {/* End of scrollable content area */}

        <DialogFooter className="p-6 pt-4 border-t"> {/* Removed mt-auto */}
          <Button variant="outline" onClick={handleModalClose} disabled={isLoading && !abortControllerRef.current?.signal.aborted}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={!aiResponse || isLoading || activeTab !== 'suggestion'}>
            Accept Suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
