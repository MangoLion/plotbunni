import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { NotebookText, PlusCircle, ChevronsUpDown } from 'lucide-react';

const NovelOutlinePopover = ({
  onSceneSelect,
  onAddChapter,
  onAddScene,
  isOpen,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const { 
    acts, chapters, scenes, actOrder, 
    moveAct, moveChapter, moveScene,
    canMoveActUp, canMoveActDown,
    canMoveChapterUp, canMoveChapterDown,
    canMoveSceneUp, canMoveSceneDown 
  } = useData();
  
  const [showAddButtonsInOutline, setShowAddButtonsInOutline] = useState(() => {
    const storedValue = localStorage.getItem('plotbunni_writeview_showAddButtons');
    return storedValue ? JSON.parse(storedValue) : false;
  });
  const [showReorderControls, setShowReorderControls] = useState(false);

  useEffect(() => {
    localStorage.setItem('plotbunni_writeview_showAddButtons', JSON.stringify(showAddButtonsInOutline));
  }, [showAddButtonsInOutline]);

  // Placeholder functions, assuming they will be provided by DataContext
  const safeCanMoveActUp = actId => canMoveActUp ? canMoveActUp(actId) : true;
  const safeCanMoveActDown = actId => canMoveActDown ? canMoveActDown(actId) : true;
  const safeCanMoveChapterUp = (chapterId, actId) => canMoveChapterUp ? canMoveChapterUp(chapterId, actId) : true;
  const safeCanMoveChapterDown = (chapterId, actId) => canMoveChapterDown ? canMoveChapterDown(chapterId, actId) : true;
  const safeCanMoveSceneUp = (sceneId, chapterId, actId) => canMoveSceneUp ? canMoveSceneUp(sceneId, chapterId, actId) : true;
  const safeCanMoveSceneDown = (sceneId, chapterId, actId) => canMoveSceneDown ? canMoveSceneDown(sceneId, chapterId, actId) : true;

  const handleMoveAct = (actId, direction) => moveAct && moveAct(actId, direction);
  const handleMoveChapter = (chapterId, actId, direction) => moveChapter && moveChapter(chapterId, actId, direction);
  const handleMoveScene = (sceneId, chapterId, actId, direction) => moveScene && moveScene(sceneId, chapterId, actId, direction);


  if (!acts || !chapters || !scenes || !actOrder) {
    return null; 
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg hover:bg-primary/10"
          title={t('write_view_outline_popover_tooltip')}
        >
          <NotebookText className="h-5 w-5 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" side="right" align="start">
        <div className="flex justify-between items-center p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowReorderControls(!showReorderControls)}
            title={t('write_view_outline_popover_toggle_reorder_tooltip')}
            className="h-7 w-7"
          >
            <ChevronsUpDown className={`h-5 w-5 ${showReorderControls ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
          </Button>
          <div className="text-center flex-grow text-lg font-semibold">{t('write_view_outline_popover_title')}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddButtonsInOutline(!showAddButtonsInOutline)}
            title={t('write_view_outline_popover_toggle_add_buttons_tooltip')}
            className="h-7 w-7"
          >
            <PlusCircle className={`h-5 w-5 ${showAddButtonsInOutline ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
          </Button>
        </div>
        <ScrollArea className="h-[calc(500px-3.5rem)] max-h-[calc(80vh-3.5rem)] p-4">
          {actOrder.map((actId, actIndex) => {
            const act = acts[actId];
            if (!act) return null;
            return (
              <div key={actId} className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center flex-grow mr-2 min-w-0">
                    {showReorderControls && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 mr-1 flex-shrink-0">
                            <ChevronsUpDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onSelect={() => handleMoveAct(act.id, 'up')} 
                            disabled={!safeCanMoveActUp(act.id)}
                          >
                            {t('write_view_outline_popover_move_up')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onSelect={() => handleMoveAct(act.id, 'down')}
                            disabled={!safeCanMoveActDown(act.id)}
                          >
                            {t('write_view_outline_popover_move_down')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <h3 className="font-semibold text-sm text-foreground flex-grow truncate" title={act.name || t('ai_novel_writer_unnamed_act')}>{act.name || t('ai_novel_writer_unnamed_act')}</h3>
                  </div>
                  {showAddButtonsInOutline && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => onAddChapter(act.id)} title={t('write_view_outline_popover_add_chapter_tooltip')}>
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {act.chapterOrder?.map((chapterId, chapterIndex) => {
                  const chapter = chapters[chapterId];
                  if (!chapter) return null;
                  return (
                    <div key={chapterId} className="ml-3 mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center flex-grow mr-2 min-w-0">
                          {showReorderControls && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 p-0 mr-1 flex-shrink-0">
                                  <ChevronsUpDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem 
                                  onSelect={() => handleMoveChapter(chapter.id, act.id, 'up')}
                                  disabled={!safeCanMoveChapterUp(chapter.id, act.id)}
                                >
                                  {t('write_view_outline_popover_move_up')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onSelect={() => handleMoveChapter(chapter.id, act.id, 'down')}
                                  disabled={!safeCanMoveChapterDown(chapter.id, act.id)}
                                >
                                  {t('write_view_outline_popover_move_down')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <h4 className="font-medium text-xs text-muted-foreground flex-grow truncate" title={chapter.name || t('ai_novel_writer_unnamed_chapter')}>{chapter.name || t('ai_novel_writer_unnamed_chapter')}</h4>
                        </div>
                        {showAddButtonsInOutline && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => onAddScene(chapter.id)} title={t('write_view_outline_popover_add_scene_tooltip')}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {chapter.sceneOrder?.map((sceneId, sceneIndex) => {
                        const scene = scenes[sceneId];
                        if (!scene) return null;
                        return (
                          <div key={sceneId} className="ml-2">
                            <div className="flex items-center w-full">
                              {showReorderControls && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 mr-1 flex-shrink-0">
                                      <ChevronsUpDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem 
                                      onSelect={() => handleMoveScene(scene.id, chapter.id, act.id, 'up')}
                                      disabled={!safeCanMoveSceneUp(scene.id, chapter.id, act.id)}
                                    >
                                      {t('write_view_outline_popover_move_up')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onSelect={() => handleMoveScene(scene.id, chapter.id, act.id, 'down')}
                                      disabled={!safeCanMoveSceneDown(scene.id, chapter.id, act.id)}
                                    >
                                      {t('write_view_outline_popover_move_down')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <Button
                                variant="ghost"
                                className="flex-grow justify-start h-auto py-1 px-2 text-xs font-normal text-left truncate min-w-0"
                                onClick={() => onSceneSelect(sceneId)}
                                title={scene.name || t('ai_novel_writer_unnamed_scene')}
                              >
                                {scene.name || t('ai_novel_writer_unnamed_scene')}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {(!chapter.sceneOrder || chapter.sceneOrder.length === 0) && (
                        <p className="ml-2 text-xs text-muted-foreground italic">{t('write_view_outline_popover_no_scenes')}</p>
                      )}
                    </div>
                  );
                })}
                {(!act.chapterOrder || act.chapterOrder.length === 0) && (
                  <p className="ml-3 text-xs text-muted-foreground italic">{t('write_view_outline_popover_no_chapters')}</p>
                )}
              </div>
            );
          })}
          {actOrder.length === 0 && (
            <p className="text-sm text-muted-foreground italic">{t('write_view_outline_popover_empty_message')}</p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NovelOutlinePopover;
