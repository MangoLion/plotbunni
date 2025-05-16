import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Markdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  // DialogHeader, // Not used
  // DialogTitle, // Not used
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronDown, ChevronRight, Send, Bot, User, TriangleAlert, Database, RefreshCcw, StopCircle, Edit2, Check, XCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { tokenCount, cn } from '../../lib/utils';
import { generateContextWithRetry } from '../../lib/aiContextUtils';

const findLastSceneDetails = (actOrder, acts, chapters, scenes) => {
  if (!actOrder || actOrder.length === 0) return null;
  for (let i = actOrder.length - 1; i >= 0; i--) {
    const act = acts[actOrder[i]];
    if (act && act.chapterOrder && act.chapterOrder.length > 0) {
      for (let j = act.chapterOrder.length - 1; j >= 0; j--) {
        const chapter = chapters[act.chapterOrder[j]];
        if (chapter && chapter.sceneOrder && chapter.sceneOrder.length > 0) {
          for (let k = chapter.sceneOrder.length - 1; k >= 0; k--) {
            const sceneId = chapter.sceneOrder[k];
            if (scenes[sceneId]) {
              return { targetSceneId: sceneId, targetChapterId: chapter.id };
            }
          }
        }
      }
    }
  }
  return null;
};

export const AIChatModal = ({
  isOpen,
  onClose,
  chatMessages,
  setChatMessages,
  userInput,
  setUserInput,
  onResetChat,
}) => {
  const { systemPrompt, endpointProfiles, activeProfileId: globalActiveProfileId, taskSettings, TASK_KEYS, getActiveProfile } = useSettings();
  const { actOrder, acts, chapters, scenes, concepts, novelSynopsis } = useData();

  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);
  const [initialNovelContext, setInitialNovelContext] = useState({ contextString: "", estimatedTokens: 0, level: 0, error: null });
  const [currentProfile, setCurrentProfile] = useState(null);
  const [estimatedTotalTokensForDisplay, setEstimatedTotalTokensForDisplay] = useState(0); // For UI, uses full novel context & history
  const [actuallySentNovelContextTokens, setActuallySentNovelContextTokens] = useState(0); // For UI breakdown, actual sent novel context
  const [maxContextTokensForPrompt, setMaxContextTokensForPrompt] = useState(4096);
  const [tokenBreakdown, setTokenBreakdown] = useState({ system: 0, novelData: 0, chatHistory: 0, userInput: 0 });
  const [isMemoryDetailOpen, setIsMemoryDetailOpen] = useState(false);
  const chatAreaRef = useRef(null);
  const [isConfirmResetModalOpen, setIsConfirmResetModalOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    const profileIdToUse = taskSettings[TASK_KEYS.CHATTING]?.profileId || globalActiveProfileId;
    const activeProf = endpointProfiles?.find(p => p.id === profileIdToUse);
    setCurrentProfile(activeProf);
  }, [isOpen, endpointProfiles, globalActiveProfileId, taskSettings, TASK_KEYS.CHATTING]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (!initialNovelContext.contextString || chatMessages.length === 0) {
        generateInitialContext();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && (chatMessages.length === 0 || !initialNovelContext.contextString)) {
        generateInitialContext();
    }
  }, [actOrder, acts, chapters, scenes, concepts, novelSynopsis, isOpen, chatMessages.length]);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!isOpen || !currentProfile) {
      setEstimatedTotalTokensForDisplay(0);
      return;
    }
    const { contextLength, maxOutputTokens } = currentProfile;
    const safetyBuffer = 100;
    const calculatedMaxPromptTokens = (contextLength || 4096) - (maxOutputTokens || 1024) - safetyBuffer;
    setMaxContextTokensForPrompt(calculatedMaxPromptTokens > 0 ? calculatedMaxPromptTokens : 200);

    const systemPromptTokens = tokenCount(systemPrompt);
    const idealNovelContextTokens = initialNovelContext.estimatedTokens || 0; // Size of full pre-truncated novel context
    const fullChatHistoryTokens = tokenCount(chatMessages.map(msg => msg.content).join('\n'));
    const userInputTokensVal = tokenCount(userInput);

    setTokenBreakdown({
      system: systemPromptTokens,
      novelData: actuallySentNovelContextTokens, // Display actual sent novel context tokens
      chatHistory: fullChatHistoryTokens, // Display full history tokens
      userInput: userInputTokensVal,
    });
    
    // For UI progress bar, show estimate with ideal novel context and full history
    setEstimatedTotalTokensForDisplay(systemPromptTokens + idealNovelContextTokens + fullChatHistoryTokens + userInputTokensVal);

  }, [isOpen, currentProfile, systemPrompt, initialNovelContext, chatMessages, userInput, actuallySentNovelContextTokens]);

  const generateInitialContext = async () => {
    if (!currentProfile || !actOrder || !acts || !chapters || !scenes || !concepts) {
      setInitialNovelContext({ contextString: "", estimatedTokens: 0, level: 0, error: "AI Profile or core novel data not ready." });
      setActuallySentNovelContextTokens(0);
      return;
    }
    const contextResult = await generateContextWithRetry({
      strategy: findLastSceneDetails(actOrder, acts, chapters, scenes) ? 'sceneText' : 'novelOutline',
      baseData: { actOrder, acts, chapters, scenes, concepts, novelSynopsis },
      targetData: findLastSceneDetails(actOrder, acts, chapters, scenes) || {},
      aiProfile: currentProfile,
      systemPromptText: systemPrompt,
      userQueryText: taskSettings[TASK_KEYS.CHATTING]?.prompt || "Chat about the novel.",
    });
    setInitialNovelContext(contextResult);
    setActuallySentNovelContextTokens(contextResult.estimatedTokens); // Initially, assume full novel context is sent
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    abortControllerRef.current = new AbortController();
    
    const currentInputContent = userInput.trim();
    const currentChatHistory = [...chatMessages];

    const endpointConfig = getActiveProfile(taskSettings[TASK_KEYS.CHATTING]?.profileId || globalActiveProfileId);

    if (!endpointConfig || !endpointConfig.endpointUrl) {
      setChatMessages(prev => [...prev, { id: Date.now(), role: 'ai', content: "AI endpoint not configured." }]);
      setIsLoading(false);
      return;
    }

    const baseSystemPrompt = systemPrompt || "You are a helpful assistant.";
    const baseSystemPromptTokens = tokenCount(baseSystemPrompt);
    const currentUserInputTokens = tokenCount(currentInputContent);
    const fullChatHistoryTokens = tokenCount(currentChatHistory.map(msg => msg.content).join('\n'));

    let availableTokensForNovelContext = maxContextTokensForPrompt - (baseSystemPromptTokens + fullChatHistoryTokens + currentUserInputTokens);
    if (availableTokensForNovelContext < 0) availableTokensForNovelContext = 0;

    let novelContextToSend = "";
    let novelContextTokensSentThisTurn = 0;

    if (initialNovelContext.contextString && availableTokensForNovelContext > 0) {
      if (initialNovelContext.estimatedTokens <= availableTokensForNovelContext) {
        novelContextToSend = initialNovelContext.contextString;
        novelContextTokensSentThisTurn = initialNovelContext.estimatedTokens;
      } else {
        // Truncate novel context from the end to fit (preserve beginning)
        let tempNovelContext = initialNovelContext.contextString;
        let tempTokens = initialNovelContext.estimatedTokens;
        const minLengthToKeep = 100; // Keep at least some characters if possible

        while (tempTokens > availableTokensForNovelContext && tempNovelContext.length > minLengthToKeep) {
            const trimChars = Math.max(1, Math.floor(tempNovelContext.length * 0.1)); // Trim 10%
            tempNovelContext = tempNovelContext.substring(0, tempNovelContext.length - trimChars);
            tempTokens = tokenCount(tempNovelContext);
        }
         // Final check if even the minLengthToKeep is too much
        if (tempTokens > availableTokensForNovelContext) {
            tempNovelContext = tempNovelContext.substring(0, Math.floor(tempNovelContext.length * (availableTokensForNovelContext / tempTokens)));
            tempTokens = tokenCount(tempNovelContext);
        }

        novelContextToSend = tempTokens <= availableTokensForNovelContext ? tempNovelContext : ""; // Ensure it fits
        novelContextTokensSentThisTurn = tokenCount(novelContextToSend);
      }
    }
    setActuallySentNovelContextTokens(novelContextTokensSentThisTurn); // Update UI display

    let effectiveSystemPrompt = baseSystemPrompt;
    if (novelContextToSend) {
      effectiveSystemPrompt += `\n\n--- Novel Context Start ---\n${novelContextToSend}\n--- Novel Context End ---`;
    }
    
    const finalSystemPromptTokens = tokenCount(effectiveSystemPrompt);
    const finalPayloadTokenEstimate = finalSystemPromptTokens + fullChatHistoryTokens + currentUserInputTokens;

    if (finalPayloadTokenEstimate > maxContextTokensForPrompt) {
        setChatMessages(prev => [...prev, {
            id: Date.now(),
            role: 'ai',
            content: `Prompt too large (${finalPayloadTokenEstimate} / ${maxContextTokensForPrompt}). Try shortening input or resetting chat history if it's very long.`
        }]);
        setIsLoading(false);
        return;
    }
    
    const newUserMessage = { id: Date.now(), role: 'user', content: currentInputContent };
    setChatMessages(prev => [...prev, newUserMessage]);
    setUserInput(''); 
    
    const aiMessageId = Date.now() + 1;
    setChatMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: '...' }]);

    try {
      const messagesPayload = [];
      messagesPayload.push({ role: 'system', content: effectiveSystemPrompt });
      currentChatHistory.forEach(msg => messagesPayload.push({ role: msg.role, content: msg.content }));
      messagesPayload.push({ role: newUserMessage.role, content: newUserMessage.content });
      
      let lastRole = 'system';
      for (let i = 1; i < messagesPayload.length; i++) {
        if (messagesPayload[i].role === lastRole) {
          console.error("Invalid role sequence:", messagesPayload);
        }
        lastRole = messagesPayload[i].role;
      }

      const payload = {
        model: endpointConfig.modelName,
        messages: messagesPayload,
        stream: true,
        max_tokens: endpointConfig.maxOutputTokens,
      };

      const response = await fetch(endpointConfig.endpointUrl, { /* ... fetch options ... */
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${endpointConfig.apiToken}` },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) { /* ... error handling ... */
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedResponse = "";

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
                if (jsonData === '[DONE]') break;
                try {
                    const parsed = JSON.parse(jsonData);
                    if (parsed.choices && parsed.choices[0]?.delta?.content) {
                        accumulatedResponse += parsed.choices[0].delta.content;
                        setChatMessages(prev => prev.map(msg => 
                            msg.id === aiMessageId ? { ...msg, content: accumulatedResponse } : msg
                        ));
                    }
                } catch (e) { console.error('Error parsing stream JSON chunk:', e, jsonData); }
            }
            boundary = buffer.indexOf('\n\n');
        }
        // The line below was causing the ReferenceError and is redundant with the inner [DONE] check and outer `if (done) break;`
        // if (eventString.startsWith('data: ') && jsonData === '[DONE]') break; 
      }
       if (buffer.startsWith('data: ')) { // Process any remaining data in the buffer after the main loop (e.g., if no \n\n at the very end)
            const jsonData = buffer.substring('data: '.length).trim();
            if (jsonData !== '[DONE]') {
                 try {
                    const parsed = JSON.parse(jsonData);
                    if (parsed.choices && parsed.choices[0]?.delta?.content) {
                        accumulatedResponse += parsed.choices[0].delta.content;
                         setChatMessages(prev => prev.map(msg => 
                            msg.id === aiMessageId ? { ...msg, content: accumulatedResponse } : msg
                        ));
                    }
                } catch (e) { console.error('Error parsing final stream JSON chunk:', e, jsonData); }
            }
        }
    } catch (error) {
      const errorMessage = error.name === 'AbortError' ? "Chat stopped." : `Error: ${error.message}`;
      setChatMessages(prev => prev.map(msg => {
        if (msg.id === aiMessageId) {
            return { ...msg, content: (msg.content === '...' ? '' : msg.content) + `\n\n--- ${errorMessage} ---` };
        }
        return msg;
      }));
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
         abortControllerRef.current = null;
      }
    }
  };

  const handleModalClose = () => {
    if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[90vw] h-[90vh] flex flex-col p-0">
        <div className="flex-grow overflow-hidden flex flex-col pt-6">
          <div className="px-4 pt-3 pb-1 border-b">
            <div className="flex items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2 flex-grow">
                <Database className="h-5 w-5 text-muted-foreground" />
                <Progress
                  value={maxContextTokensForPrompt > 0 ? (estimatedTotalTokensForDisplay / maxContextTokensForPrompt) * 100 : 0}
                  className={`w-full [&>div]:transition-all [&>div]:duration-500 ${
                    maxContextTokensForPrompt > 0 && estimatedTotalTokensForDisplay / maxContextTokensForPrompt >= 1 ? ' [&>div]:bg-destructive' :
                    maxContextTokensForPrompt > 0 && estimatedTotalTokensForDisplay / maxContextTokensForPrompt >= 0.8 ? ' [&>div]:bg-yellow-500' : ''
                  }`}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsConfirmResetModalOpen(true)} title="Reset Chat History" className="ml-2 flex-shrink-0">
                <RefreshCcw className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
            <Collapsible open={isMemoryDetailOpen} onOpenChange={setIsMemoryDetailOpen} className="text-xs">
              <CollapsibleTrigger asChild>
                <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground flex items-center">
                  Memory Usage Details {isMemoryDetailOpen ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 space-y-0.5 text-muted-foreground">
                {currentProfile ? (
                  <>
                    <p>System Prompt: {tokenBreakdown.system} tokens</p>
                    <p className="flex items-center">
                      {initialNovelContext.level === -1 && <TriangleAlert className="h-3 w-3 mr-1 text-destructive" />}
                      {initialNovelContext.level > 1 && initialNovelContext.level !== -1 && tokenBreakdown.novelData < initialNovelContext.estimatedTokens && <TriangleAlert className="h-3 w-3 mr-1 text-yellow-500" />}
                      <span className={cn(initialNovelContext.level === -1 && 'text-destructive', initialNovelContext.level > 1 && tokenBreakdown.novelData < initialNovelContext.estimatedTokens && 'text-yellow-600 dark:text-yellow-400')}>
                        Novel Context (Lvl {initialNovelContext.level === -1 ? 'ERR' : initialNovelContext.level}{tokenBreakdown.novelData < initialNovelContext.estimatedTokens && initialNovelContext.estimatedTokens > 0 ? '*' : ''}):
                      </span>
                      <span className="ml-1">{tokenBreakdown.novelData} tokens (Original: {initialNovelContext.estimatedTokens})</span>
                    </p>
                    <p>Chat History: {tokenBreakdown.chatHistory} tokens</p>
                    <p>Current Input: {tokenBreakdown.userInput} tokens</p>
                    <p className="pt-1 border-t mt-1 font-semibold">Est. Total (UI): {estimatedTotalTokensForDisplay} tokens / {maxContextTokensForPrompt} available</p>
                    {tokenBreakdown.novelData < initialNovelContext.estimatedTokens && initialNovelContext.estimatedTokens > 0 && <p className="text-xs text-yellow-600 dark:text-yellow-400">(*Novel context truncated to fit chat history)</p>}
                  </>
                ) : <p>AI Profile not loaded.</p>}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <ScrollArea ref={chatAreaRef} className="flex-grow p-4 space-y-4 bg-muted/20">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={cn("max-w-[75%] p-3 rounded-lg shadow", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border', msg.content === '...' && 'italic text-muted-foreground')}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      {msg.role === 'ai' && <Bot className="h-4 w-4 mr-2 text-muted-foreground" />}
                      {msg.role === 'user' && <User className="h-4 w-4 mr-2 text-muted-background" />}
                      <span className="text-xs font-medium">{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
                    </div>
                    {editingMessageId !== msg.id && !isLoading && (
                      <Button variant="ghost" size="iconSm" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => { setEditingMessageId(msg.id); setEditText(msg.content);}} title="Edit message">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {editingMessageId === msg.id ? (
                    <div className="mt-1">
                      <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={Math.max(3, editText.split('\n').length)} className="text-sm mb-2" />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingMessageId(null); setEditText(""); }}>
                          <XCircle className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={() => { setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: editText } : m)); setEditingMessageId(null); setEditText(""); }}>
                          <Check className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "text-sm break-words",
                      msg.role === 'ai' && "prose prose-sm dark:prose-invert max-w-none"
                    )}>
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && chatMessages.length > 0 && chatMessages[chatMessages.length -1]?.content === '...' && ( /* Show thinking only if placeholder is last */
                 <div className="flex justify-start"> <div className="max-w-[75%] p-3 rounded-lg shadow bg-background border italic text-muted-foreground"> <Bot className="h-4 w-4 mr-2 inline-block" /> Thinking...</div></div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex items-start space-x-2">
              <Textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Ask a question or type your message..." className="flex-grow resize-none" rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} disabled={isLoading || editingMessageId !== null} />
              {isLoading ? (
                <Button onClick={() => abortControllerRef.current?.abort()} variant="destructive" className="h-full" title="Stop Generating">
                  <StopCircle className="h-4 w-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Stop</span>
                </Button>
              ) : (
                <Button onClick={handleSendMessage} disabled={!userInput.trim() || editingMessageId !== null} className="h-full">
                  <Send className="h-4 w-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Send</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        <ConfirmModal open={isConfirmResetModalOpen} onOpenChange={setIsConfirmResetModalOpen} title="Confirm Chat Reset" description="Are you sure you want to clear the entire chat history for this novel? This action cannot be undone." onConfirm={onResetChat} confirmText="Yes, Reset Chat" />
      </DialogContent>
    </Dialog>
  );
};
