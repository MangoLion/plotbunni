import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PlusCircle, Edit2, PenTool, NotebookPen, Trash2, MessageSquare, ChevronDown, ChevronsUpDown } from 'lucide-react'; // Added ChevronsUpDown
import SceneFormModal from './SceneFormModal';
import ActFormModal from './ActFormModal';
import ChapterFormModal from './ChapterFormModal';
import ImportOutlineModal from './ImportOutlineModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { AIChatModal } from '@/components/ai/AIChatModal';
import { useSettings } from '@/context/SettingsContext';


const SceneCard = ({ scene, conceptsMap, chapterId, actId, onDeleteScene, showReorderControls, showDeleteControls, onMoveScene }) => {
  const { t } = useTranslation();
  const { canMoveSceneUp, canMoveSceneDown } = useData();
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleDelete = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = () => {
    onDeleteScene(scene.id, chapterId);
  };

  return (
    <>
      <ConfirmModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        title={t('plan_view_scene_card_confirm_delete_title')}
        description={t('plan_view_scene_card_confirm_delete_description', { sceneName: scene.name })}
        onConfirm={confirmDelete}
      />
      <Card className="mb-2 shadow-sm">
        <CardHeader className="p-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center flex-grow min-w-0">
              {showReorderControls && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="iconSm" className="mr-1 flex-shrink-0">
                      <ChevronsUpDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onSelect={() => onMoveScene(scene.id, chapterId, actId, 'up')}
                      disabled={!canMoveSceneUp(scene.id, chapterId, actId)}
                    >
                      {t('plan_view_move_up')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => onMoveScene(scene.id, chapterId, actId, 'down')}
                      disabled={!canMoveSceneDown(scene.id, chapterId, actId)}
                    >
                      {t('plan_view_move_down')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <CardTitle className="text-sm font-medium cursor-pointer hover:text-primary" onClick={() => setIsSceneModalOpen(true)}>{scene.name}</CardTitle>
            </div>
            <div className="flex gap-1">
              {/* Edit button removed, title is now clickable */}
              {showDeleteControls && (
                <Button variant="ghost" size="iconSm" onClick={handleDelete} className="text-primary hover:text-primary-foreground hover:bg-destructive/90">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          {scene.tags && scene.tags.length > 0 && (
            <CardDescription className="text-xs pt-1">{t('plan_view_scene_card_tags_prefix')}{scene.tags.join(', ')}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-3 text-xs">
          <p className="line-clamp-3 mb-1">{scene.synopsis || t('plan_view_scene_card_no_synopsis')}</p>
          {scene.context && scene.context.length > 0 && (
            <p className="text-slate-600">
              {t('plan_view_scene_card_context_prefix')}{scene.context.map(id => conceptsMap[id]?.name || id).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>
      <SceneFormModal 
        open={isSceneModalOpen}
        onOpenChange={setIsSceneModalOpen}
        sceneToEdit={scene}
        chapterId={chapterId}
      />
    </>
  );
};

const ChapterCard = ({ chapter, scenes, conceptsMap, actId, onDeleteChapter, onDeleteScene, onSwitchToWriteTab, showReorderControls, showDeleteControls, onMoveChapter, onMoveScene }) => {
  const { t } = useTranslation();
  const { canMoveChapterUp, canMoveChapterDown } = useData();
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const chapterScenes = chapter.sceneOrder.map(sceneId => scenes[sceneId]).filter(Boolean);

  const handleDelete = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = () => {
    onDeleteChapter(chapter.id, actId);
  };

  return (
    <>
      <ConfirmModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        title={t('plan_view_chapter_card_confirm_delete_title')}
        description={t('plan_view_chapter_card_confirm_delete_description', { chapterName: chapter.name })}
        onConfirm={confirmDelete}
      />
      <Card className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)] shadow-md flex flex-col">
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center flex-grow min-w-0">
              {showReorderControls && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="iconSm" className="mr-1 flex-shrink-0">
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onSelect={() => onMoveChapter(chapter.id, actId, 'up')}
                      disabled={!canMoveChapterUp(chapter.id, actId)}
                    >
                      {t('plan_view_move_up')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => onMoveChapter(chapter.id, actId, 'down')}
                      disabled={!canMoveChapterDown(chapter.id, actId)}
                    >
                      {t('plan_view_move_down')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <CardTitle className="text-base flex-grow text-center cursor-pointer hover:text-primary" onClick={() => setIsChapterModalOpen(true)}>{chapter.name}</CardTitle>
            </div>
            <div className="flex gap-1">
              {/* Edit button removed, title is now clickable */}
              {showDeleteControls && (
                <Button variant="ghost" size="iconSm" onClick={handleDelete} className="text-primary hover:text-primary-foreground hover:bg-destructive/90">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <ScrollArea className="flex-grow p-3" style={{ maxHeight: '300px' }}>
          {chapterScenes.length > 0 ? (
            chapterScenes.map(scene => <SceneCard key={scene.id} scene={scene} conceptsMap={conceptsMap} chapterId={chapter.id} actId={actId} onDeleteScene={onDeleteScene} showReorderControls={showReorderControls} showDeleteControls={showDeleteControls} onMoveScene={onMoveScene} />)
          ) : (
            <p className="text-xs text-slate-500 p-2">{t('plan_view_chapter_card_no_scenes')}</p>
          )}
        </ScrollArea>
        <div className="flex items-center border-t mt-auto">
          <Button className="w-1/3 rounded-r-none" onClick={() => setIsSceneModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> {t('plan_view_chapter_card_button_add_scene')}
          </Button>
          {chapterScenes.length <= 1 ? (
            <Button 
              className="w-2/3 rounded-l-none border-primary" 
              variant="outline"
              onClick={() => onSwitchToWriteTab(chapter.id, chapterScenes.length === 1 ? chapterScenes[0].id : null)}
            >
              <PenTool className="h-4 w-4 mr-2" /> {t('plan_view_chapter_card_button_write')}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="w-2/3 rounded-l-none border-primary flex items-center justify-center" 
                  variant="outline"
                >
                  <PenTool className="h-4 w-4 mr-2" /> {t('plan_view_chapter_card_button_write')} <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]">
                {chapterScenes.map(scene => (
                  <DropdownMenuItem key={scene.id} onClick={() => onSwitchToWriteTab(chapter.id, scene.id)}>
                    {scene.name || t('ai_novel_writer_unnamed_scene')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>
      <SceneFormModal open={isSceneModalOpen} onOpenChange={setIsSceneModalOpen} chapterId={chapter.id} />
      <ChapterFormModal open={isChapterModalOpen} onOpenChange={setIsChapterModalOpen} chapterToEdit={chapter} actId={actId} />
    </>
  );
};

const ActSection = ({ act, chapters, scenes, conceptsMap, onDeleteAct, onDeleteChapter, onDeleteScene, onSwitchToWriteTab, showReorderControls, showDeleteControls, onMoveAct, onMoveChapter, onMoveScene }) => {
  const { t } = useTranslation();
  const { canMoveActUp, canMoveActDown } = useData();
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isActModalOpen, setIsActModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  const actChapters = act.chapterOrder.map(chapterId => chapters[chapterId]).filter(Boolean);

  const handleDelete = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = () => {
    onDeleteAct(act.id);
  };

  return (
    <>
      <ConfirmModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        title={t('plan_view_act_section_confirm_delete_title')}
        description={t('plan_view_act_section_confirm_delete_description', { actName: act.name })}
        onConfirm={confirmDelete}
      />
      <div className="mb-6 w-full" style={{ minHeight: '200px' }}>
        <div className="p-2 flex justify-between items-center">
          <div className="flex items-center flex-grow min-w-0 flex-wrap"> {/* Added flex-wrap here */}
            {showReorderControls && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2 flex-shrink-0">
                    <ChevronsUpDown className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onSelect={() => onMoveAct(act.id, 'up')}
                    disabled={!canMoveActUp(act.id)}
                  >
                    {t('plan_view_move_up')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={() => onMoveAct(act.id, 'down')}
                    disabled={!canMoveActDown(act.id)}
                  >
                    {t('plan_view_move_down')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <h2 className="text-xl font-semibold hover:text-primary cursor-pointer" onClick={() => setIsActModalOpen(true)}>
              {act.name}
            </h2>
            <Button onClick={() => setIsChapterModalOpen(true)} size="sm" variant="outline" className="ml-2">
              <PlusCircle className="h-4 w-4 mr-2" /> {t('plan_view_act_section_button_add_chapter')}
            </Button>
            {showDeleteControls && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="text-primary hover:text-primary-foreground hover:bg-destructive/90 ml-2">
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Delete button moved */}
          </div>
        </div>
        {actChapters.length > 0 ? (
          <div className="flex flex-wrap gap-4 mt-2 p-2">
            {actChapters.map(chapter => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                scenes={scenes}
                conceptsMap={conceptsMap}
                actId={act.id}
                onDeleteChapter={onDeleteChapter}
                onDeleteScene={onDeleteScene}
                onSwitchToWriteTab={onSwitchToWriteTab}
                showReorderControls={showReorderControls}
                showDeleteControls={showDeleteControls}
                onMoveChapter={onMoveChapter}
                onMoveScene={onMoveScene}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 p-2">{t('plan_view_act_section_no_chapters', { addChapterButtonText: t('plan_view_act_section_button_add_chapter') })}</p>
        )}
      </div>
      <ChapterFormModal open={isChapterModalOpen} onOpenChange={setIsChapterModalOpen} actId={act.id} />
      <ActFormModal open={isActModalOpen} onOpenChange={setIsActModalOpen} actToEdit={act} />
    </>
  );
};

const PlanView = ({ onSwitchToWriteTab, novelId }) => {
  const { t } = useTranslation();
  const {
    acts, chapters, scenes, concepts, actOrder,
    addAct: addActToContext,
    addChapterToAct,
    addSceneToChapter,
    deleteAct,
    deleteChapter,
    deleteScene,
    moveAct, moveChapter, moveScene,
  } = useData();
  const { showAiFeatures } = useSettings();
  const [isActModalOpen, setIsActModalOpen] = useState(false);
  const [showReorderControls, setShowReorderControls] = useState(false);
  const [showDeleteControls, setShowDeleteControls] = useState(false); // New state for delete controls
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIChatModalOpen, setIsAIChatModalOpen] = useState(false);

  const getChatStorageKey = (type, id) => `plotbunni_chat_${type}_${id}`;
  const getOldChatStorageKey = (type, id) => `plothare_chat_${type}_${id}`;

  const [chatMessages, setChatMessages] = useState(() => {
    if (!novelId) return [];
    let savedMessages = localStorage.getItem(getChatStorageKey('messages', novelId));
    if (!savedMessages) {
      const oldMessages = localStorage.getItem(getOldChatStorageKey('messages', novelId));
      if (oldMessages) {
        savedMessages = oldMessages;
        localStorage.setItem(getChatStorageKey('messages', novelId), oldMessages);
        localStorage.removeItem(getOldChatStorageKey('messages', novelId));
      }
    }
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const [userInputInChatModal, setUserInputInChatModal] = useState(() => {
    if (!novelId) return '';
    let savedInput = localStorage.getItem(getChatStorageKey('input', novelId));
    if (!savedInput) {
      const oldInput = localStorage.getItem(getOldChatStorageKey('input', novelId));
      if (oldInput) {
        savedInput = oldInput;
        localStorage.setItem(getChatStorageKey('input', novelId), oldInput);
        localStorage.removeItem(getOldChatStorageKey('input', novelId));
      }
    }
    return savedInput || '';
  });

  useEffect(() => {
    if (novelId) {
      localStorage.setItem(getChatStorageKey('messages', novelId), JSON.stringify(chatMessages));
    }
  }, [chatMessages, novelId]);

  useEffect(() => {
    if (novelId) {
      localStorage.setItem(getChatStorageKey('input', novelId), userInputInChatModal);
    }
  }, [userInputInChatModal, novelId]);
  
  useEffect(() => {
    if (novelId) {
      let savedMessages = localStorage.getItem(getChatStorageKey('messages', novelId));
      if (!savedMessages) {
        const oldMessages = localStorage.getItem(getOldChatStorageKey('messages', novelId));
        if (oldMessages) {
          savedMessages = oldMessages;
          localStorage.setItem(getChatStorageKey('messages', novelId), oldMessages);
          localStorage.removeItem(getOldChatStorageKey('messages', novelId));
        }
      }
      setChatMessages(savedMessages ? JSON.parse(savedMessages) : []);

      let savedInput = localStorage.getItem(getChatStorageKey('input', novelId));
      if (!savedInput) {
        const oldInput = localStorage.getItem(getOldChatStorageKey('input', novelId));
        if (oldInput) {
          savedInput = oldInput;
          localStorage.setItem(getChatStorageKey('input', novelId), oldInput);
          localStorage.removeItem(getOldChatStorageKey('input', novelId));
        }
      }
      setUserInputInChatModal(savedInput || '');
    } else {
      setChatMessages([]);
      setUserInputInChatModal('');
    }
  }, [novelId]);

  const conceptsMap = concepts.reduce((acc, concept) => {
    acc[concept.id] = concept;
    return acc;
  }, {});

  const orderedActs = actOrder.map(id => acts[id]).filter(Boolean);

  const handleImportConfirm = (importedActs, replaceExisting) => {
    if (replaceExisting) {
      const currentActIds = [...actOrder]; 
      currentActIds.forEach(actId => {
        deleteAct(actId);
      });
    }
    importedActs.forEach(importedActData => {
      const actPayload = { name: importedActData.name };
      const newAct = addActToContext(actPayload);
      if (newAct && newAct.id && importedActData.chapters) {
        importedActData.chapters.forEach(importedChapterData => {
          const chapterPayload = { name: importedChapterData.name };
          const hasImportedScenes = importedChapterData.scenes && importedChapterData.scenes.length > 0;
          const newChapter = addChapterToAct(newAct.id, chapterPayload, { skipDefaultScene: hasImportedScenes }); 
          if (newChapter && newChapter.id && hasImportedScenes) {
            importedChapterData.scenes.forEach(importedSceneData => {
              const scenePayload = { 
                name: importedSceneData.name, 
                synopsis: importedSceneData.synopsis || '' 
              };
              if (addSceneToChapter) {
                addSceneToChapter(newChapter.id, scenePayload);
              } else {
                console.warn("addSceneToChapter function not found in DataContext. Scenes will not be fully added.");
              }
            });
          }
        });
      }
    });
    console.log("Imported data processed. Replaced existing: ", replaceExisting, "Data:", importedActs);
  };

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] p-4">
      <div className="flex items-center justify-start gap-4 mb-6"> {/* Changed justify-between to justify-start */}
        {/* <h1 className="text-2xl font-bold mr-4">{t('plan_view_title')}</h1> */}
        <Button 
          onClick={() => setIsImportModalOpen(true)} 
          variant={orderedActs.length === 0 ? "default" : "outline"} 
          size="sm"
        >
          <NotebookPen  className="h-4 w-4 mr-2" /> {t('plan_view_button_import_outline')}
        </Button>
        {orderedActs.length > 0 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowReorderControls(!showReorderControls)}
              title={t('plan_view_toggle_reorder_tooltip')}
              className="h-8 w-8"
            >
              <ChevronsUpDown className={`h-5 w-5 ${showReorderControls ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDeleteControls(!showDeleteControls)}
              title={t('plan_view_toggle_delete_tooltip')}
              className="h-8 w-8"
            >
              <Trash2 className={`h-5 w-5 ${showDeleteControls ? 'text-destructive' : 'text-muted-foreground hover:text-destructive/80'}`} />
            </Button>
          </>
        )}
      </div>

      {orderedActs.length > 0 ? (
        orderedActs.map(act => (
          <ActSection 
            key={act.id}
            act={act}
            chapters={chapters}
            scenes={scenes}
            conceptsMap={conceptsMap}
            onDeleteAct={deleteAct}
            onDeleteChapter={deleteChapter}
            onDeleteScene={deleteScene}
            onSwitchToWriteTab={onSwitchToWriteTab}
            showReorderControls={showReorderControls}
            showDeleteControls={showDeleteControls} // Pass down delete toggle state
            onMoveAct={moveAct}
            onMoveChapter={moveChapter}
            onMoveScene={moveScene}
          />
        ))
      ) : (
        <div className="text-center py-10">
          <p className="text-slate-500 mb-4">{t('plan_view_empty_message')}</p>
        </div>
      )}

      <div className="mt-6 p-2">
        <Button onClick={() => setIsActModalOpen(true)} variant="outline">
          <PlusCircle className="h-4 w-4 mr-2" /> {t('plan_view_button_add_act')}
        </Button>
      </div>
      
      <ActFormModal open={isActModalOpen} onOpenChange={setIsActModalOpen} />
      <ImportOutlineModal 
        open={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen}
        onImportConfirm={handleImportConfirm}
      />

      {showAiFeatures && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="icon"
            className="rounded-full w-12 h-12 shadow-lg hover:scale-105 transition-transform"
            onClick={() => setIsAIChatModalOpen(true)}
            title={t('plan_view_fab_ai_chat_title')}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>
      )}

      {showAiFeatures && isAIChatModalOpen && ( // Also ensure modal only renders if features are shown
        <AIChatModal
          isOpen={isAIChatModalOpen}
        onClose={() => setIsAIChatModalOpen(false)}
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        userInput={userInputInChatModal}
        setUserInput={setUserInputInChatModal}
        onResetChat={() => {
          setChatMessages([]);
          setUserInputInChatModal('');
          // localStorage will be cleared by the useEffect hooks for chatMessages and userInputInChatModal
        }}
      />
      )} 
    </ScrollArea>
  );
};

export default PlanView;
