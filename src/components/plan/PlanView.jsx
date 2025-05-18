import React, { useState, useEffect  } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"; // Added DropdownMenu components
import { PlusCircle, Edit2, PenTool, NotebookPen, Trash2, MessageSquare, ChevronDown } from 'lucide-react'; // Added UploadCloud, Trash2, MessageSquare, ChevronDown
import SceneFormModal from './SceneFormModal';
import ActFormModal from './ActFormModal';
import ChapterFormModal from './ChapterFormModal';
import ImportOutlineModal from './ImportOutlineModal'; // Import the new modal
import ConfirmModal from '@/components/ui/ConfirmModal'; // Import ConfirmModal
import { AIChatModal } from '@/components/ai/AIChatModal'; // Import AIChatModal
import { useSettings } from '@/context/SettingsContext'; // Import useSettings


const SceneCard = ({ scene, conceptsMap, chapterId, onDeleteScene }) => {
  const { t } = useTranslation();
  // conceptsMap is a map of conceptId -> conceptObject for easy name lookup
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleDelete = () => {
    // Open the confirm modal instead of window.confirm
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
            <CardTitle className="text-sm font-medium">{scene.name}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="iconSm" onClick={() => setIsSceneModalOpen(true)}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="iconSm" onClick={handleDelete} className="text-primary hover:text-primary-foreground hover:bg-destructive/90">
                <Trash2 className="h-3 w-3" />
              </Button>
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
        chapterId={chapterId} // Pass chapterId for context, even when editing
      />
    </>
  );
};

// Accept onSwitchToWriteTab prop
const ChapterCard = ({ chapter, scenes, conceptsMap, actId, onDeleteChapter, onDeleteScene, onSwitchToWriteTab }) => {
  const { t } = useTranslation();
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
      {/* Responsive width: 1 column on small, 2 on sm, 3 on lg */}
      <Card className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)] shadow-md flex flex-col"> {/* Flex column for scroll */}
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex-grow text-center">{chapter.name}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="iconSm" onClick={() => setIsChapterModalOpen(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              {/* Scene button removed from here */}
              <Button variant="ghost" size="iconSm" onClick={handleDelete} className="text-primary hover:text-primary-foreground hover:bg-destructive/90">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <ScrollArea className="flex-grow p-3" style={{ maxHeight: '300px' }}> {/* Max height for scroll */}
          {chapterScenes.length > 0 ? (
            chapterScenes.map(scene => <SceneCard key={scene.id} scene={scene} conceptsMap={conceptsMap} chapterId={chapter.id} onDeleteScene={onDeleteScene} />)
          ) : (
            <p className="text-xs text-slate-500 p-2">{t('plan_view_chapter_card_no_scenes')}</p>
          )}
        </ScrollArea>
        {/* Container for buttons */}
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

// Accept onSwitchToWriteTab prop
const ActSection = ({ act, chapters, scenes, conceptsMap, onDeleteAct, onDeleteChapter, onDeleteScene, onSwitchToWriteTab }) => {
  const { t } = useTranslation();
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
        <div className="p-2">
          <h2 className="text-xl font-semibold hover:text-primary cursor-pointer mb-2" onClick={() => setIsActModalOpen(true)}>
            {act.name}
          </h2>
          <div className="flex items-center gap-2"> {/* Added flex container for buttons */}
            <Button onClick={() => setIsChapterModalOpen(true)} size="sm" variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" /> {t('plan_view_act_section_button_add_chapter')}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-primary hover:text-primary-foreground hover:bg-destructive/90">
              <Trash2 className="h-5 w-5" />
            </Button>
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
                // Pass the handler down to ChapterCard
                onSwitchToWriteTab={onSwitchToWriteTab}
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

// Accept onSwitchToWriteTab and novelId props from App.jsx
const PlanView = ({ onSwitchToWriteTab, novelId }) => {
  const { t } = useTranslation();
  const {
    acts, chapters, scenes, concepts, actOrder,
    addAct: addActToContext,
    addChapterToAct,
    addSceneToChapter,
    deleteAct, // Destructure deleteAct
    deleteChapter, // Destructure deleteChapter
    deleteScene, // Destructure deleteScene
  } = useData();
  const { showAiFeatures } = useSettings(); // Get showAiFeatures
  const [isActModalOpen, setIsActModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); // State for import modal

  // State for AI Chat Modal
  const [isAIChatModalOpen, setIsAIChatModalOpen] = useState(false);

  // State for AI Chat Modal with localStorage persistence
  const getChatStorageKey = (type, id) => `plotbunni_chat_${type}_${id}`;
  const getOldChatStorageKey = (type, id) => `plothare_chat_${type}_${id}`;

  const [chatMessages, setChatMessages] = useState(() => {
    if (!novelId) return [];
    let savedMessages = localStorage.getItem(getChatStorageKey('messages', novelId));
    if (!savedMessages) {
      const oldMessages = localStorage.getItem(getOldChatStorageKey('messages', novelId));
      if (oldMessages) {
        savedMessages = oldMessages;
        // Migrate: Save under new key and remove old key
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
        // Migrate: Save under new key and remove old key
        localStorage.setItem(getChatStorageKey('input', novelId), oldInput);
        localStorage.removeItem(getOldChatStorageKey('input', novelId));
      }
    }
    return savedInput || '';
  });

  // Effect to save chat messages to localStorage
  useEffect(() => {
    if (novelId) {
      localStorage.setItem(getChatStorageKey('messages', novelId), JSON.stringify(chatMessages));
    }
  }, [chatMessages, novelId]);

  // Effect to save user input to localStorage
  useEffect(() => {
    if (novelId) {
      localStorage.setItem(getChatStorageKey('input', novelId), userInputInChatModal);
    }
  }, [userInputInChatModal, novelId]);
  
  // Effect to load data from localStorage when novelId changes (e.g., switching novels)
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
      // Clear state if novelId becomes null (e.g., navigating away from a novel)
      setChatMessages([]);
      setUserInputInChatModal('');
    }
  }, [novelId]);


  // Create a map of concepts for quick lookup by SceneCard
  const conceptsMap = concepts.reduce((acc, concept) => {
    acc[concept.id] = concept;
    return acc;
  }, {});

  const orderedActs = actOrder.map(id => acts[id]).filter(Boolean);

  const handleImportConfirm = (importedActs, replaceExisting) => { // Added replaceExisting
    if (replaceExisting) {
      // Create a copy of actOrder before iterating, as deleteAct might modify it
      const currentActIds = [...actOrder]; 
      currentActIds.forEach(actId => {
        deleteAct(actId); // Assuming deleteAct handles cascades (removes chapters/scenes)
      });
    }

    // This function will add the imported acts, chapters, and scenes to the context
    importedActs.forEach(importedActData => {
      // Create the act object without the temporary 'chapters' array
      const actPayload = { name: importedActData.name };
      const newAct = addActToContext(actPayload); // addActToContext should return the created act with its ID

      if (newAct && newAct.id && importedActData.chapters) {
        importedActData.chapters.forEach(importedChapterData => {
          // Create the chapter object without the temporary 'scenes' array
          const chapterPayload = { name: importedChapterData.name };
          const hasImportedScenes = importedChapterData.scenes && importedChapterData.scenes.length > 0;
          // addChapterToAct should handle adding to the act's chapterOrder and return the new chapter with ID.
          // It is assumed that addChapterToAct (from DataContext.jsx) has been modified to accept an
          // options object as a third argument, e.g., { skipDefaultScene: boolean }.
          // If skipDefaultScene is true, addChapterToAct should not create a default blank scene.
          const newChapter = addChapterToAct(newAct.id, chapterPayload, { skipDefaultScene: hasImportedScenes }); 

          // If scenes were imported for this chapter, add them.
          // If not, addChapterToAct (with skipDefaultScene: false) would have added the default blank scene.
          if (newChapter && newChapter.id && hasImportedScenes) {
            importedChapterData.scenes.forEach(importedSceneData => {
              // Create the scene object
              const scenePayload = { 
                name: importedSceneData.name, 
                synopsis: importedSceneData.synopsis || '' 
              };
              // addSceneToChapter should handle adding to chapter's sceneOrder and return new scene with ID
              // We are assuming addSceneToChapter exists and works like addChapterToAct
              if (addSceneToChapter) {
                addSceneToChapter(newChapter.id, scenePayload);
              } else {
                // Fallback or error if addSceneToChapter doesn't exist
                // This would require manual update of chapter's sceneOrder and adding scene to global scenes
                console.warn("addSceneToChapter function not found in DataContext. Scenes will not be fully added.");
                // Example of manual addition (if DataContext structure allows direct manipulation, which is less ideal):
                // const tempScene = createScene(scenePayload); // from models.js
                // addScene(tempScene); // hypothetical generic addScene
                // const chapterToUpdate = chapters[newChapter.id];
                // if (chapterToUpdate) {
                //   chapterToUpdate.sceneOrder.push(tempScene.id);
                //   updateChapter(chapterToUpdate);
                // }
              }
            });
          }
        });
      }
    });
    console.log("Imported data processed. Replaced existing: ", replaceExisting, "Data:", importedActs);
  };


  return (
    <ScrollArea className="h-[calc(100vh-4rem)] p-4"> {/* Fixed height calculation: viewport height minus header */}
      <div className="flex items-center gap-4 mb-6"> {/* Use flex, align items center, add gap, keep bottom margin */}
        <h1 className="text-2xl font-bold">{t('plan_view_title')}</h1>
        <Button 
          onClick={() => setIsImportModalOpen(true)} 
          variant={orderedActs.length === 0 ? "default" : "outline"} 
          size={orderedActs.length === 0 ? "default" : "sm"}
        >
          <NotebookPen  className="h-4 w-4 mr-2" /> {t('plan_view_button_import_outline')}
        </Button>
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
            // Pass the handler down to ActSection
            onSwitchToWriteTab={onSwitchToWriteTab}
          />
        ))
      ) : (
        <div className="text-center py-10">
          <p className="text-slate-500 mb-4">{t('plan_view_empty_message')}</p>
          {/* Add New Act button will be below if no acts, or after all acts if they exist */}
        </div>
      )}

      {/* "Add New Act" button, left-aligned, under all acts or under the empty message */}
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

      {/* Floating Action Button for AI Chat */}
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
