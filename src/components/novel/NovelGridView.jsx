import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import NovelCard from './NovelCard';
import AddNewNovelCard from './AddNewNovelCard';
import CreateNovelFormModal from './CreateNovelFormModal';
import SettingsView from '@/components/settings/SettingsView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Rabbit, Sun, Moon, UploadCloud, Settings, Languages } from 'lucide-react'; // Add Languages icon
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Import DropdownMenu components
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as idb from '@/lib/indexedDb';
import { getDefaultConceptTemplates } from '@/data/models';

const NovelGridView = () => {
  const { t, i18n } = useTranslation(); // Initialize useTranslation
  const [novels, setNovels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCreateFormModalOpen, setIsCreateFormModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNovel, setEditingNovel] = useState(null);
  const [editNovelName, setEditNovelName] = useState('');

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [novelToDelete, setNovelToDelete] = useState(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Updated to use setLanguage from context
  const { themeMode, activeOsTheme, setThemeMode, language: currentLanguage, setLanguage } = useSettings();
  const effectiveTheme = themeMode === 'system' ? activeOsTheme : themeMode;

  const handleThemeToggle = () => {
    const nextTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
  };

  // changeLanguage function now uses setLanguage from context
  const changeLanguage = (lng) => {
    setLanguage(lng); // This will also call i18n.changeLanguage internally via context
  };

  const fetchNovels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const novelMetadatas = await idb.getAllNovelMetadata();
      const enrichedNovels = await Promise.all(
        novelMetadatas.map(async (meta) => {
          const novelData = await idb.getNovelData(meta.id);
          return {
            ...meta,
            coverImage: novelData?.coverImage || null,
            synopsis: novelData?.synopsis || "",
          };
        })
      );
      enrichedNovels.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      setNovels(enrichedNovels);
    } catch (err) {
      console.error("Error fetching novels:", err);
      setError(t('error_load_novels'));
    } finally {
      setIsLoading(false);
    }
  }, [t]); // Add t to dependencies

  useEffect(() => {
    fetchNovels();
  }, [fetchNovels]);

  const handleOpenNovel = (novelId) => {
    navigate(`/novel/${novelId}`);
  };

  const handleCreateNovelWithDetails = async (novelDetails) => {
    if (!novelDetails.novelName || !novelDetails.novelName.trim()) {
      toast({
        title: t('novel_name_required_title'),
        description: t('novel_name_required_desc'),
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const newNovelMeta = await idb.createNovel(novelDetails.novelName.trim());
      const fullNovelData = {
        id: newNovelMeta.id,
        authorName: novelDetails.authorName || '',
        synopsis: novelDetails.synopsis || '',
        coverImage: novelDetails.coverImage || null,
        pointOfView: novelDetails.pointOfView || '',
        genre: novelDetails.genre || '',
        timePeriod: novelDetails.timePeriod || '',
        targetAudience: novelDetails.targetAudience || '',
        themes: novelDetails.themes || '',
        tone: novelDetails.tone || '',
        concepts: [],
        acts: {},
        chapters: {},
        scenes: {},
        actOrder: [],
        conceptTemplates: getDefaultConceptTemplates(),
        creation_date: Date.now(),
        last_modified_date: Date.now(),
      };
      await idb.saveNovelData(newNovelMeta.id, fullNovelData);
      setIsCreateFormModalOpen(false);
      toast({
        title: t('novel_created_title'),
        description: t('novel_created_desc', { novelName: novelDetails.novelName.trim() }),
      });
      await fetchNovels();
      navigate(`/novel/${newNovelMeta.id}`);
    } catch (err) {
      console.error("Error creating novel with details:", err);
      toast({
        title: t('creation_failed_title'),
        description: t('creation_failed_desc', { errorMessage: err.message }),
        variant: "destructive",
      });
      setError(t('error_create_novel'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNovel = async () => {
    if (!novelToDelete) return;
    try {
      await idb.deleteNovel(novelToDelete);
      setNovelToDelete(null);
      setIsDeleteAlertOpen(false);
      fetchNovels();
    } catch (err) {
      console.error("Error deleting novel:", err);
      setError(t('error_delete_novel'));
    }
  };
  
  const openDeleteAlert = (novelId) => {
    setNovelToDelete(novelId);
    setIsDeleteAlertOpen(true);
  };

  const openEditModal = (novel) => {
    setEditingNovel(novel);
    setEditNovelName(novel.name);
    setIsEditModalOpen(true);
  };

  const handleEditNovel = async () => {
    if (!editingNovel || !editNovelName.trim()) {
      // Using alert for simplicity as in original, can be changed to toast
      alert(t('novel_name_required_desc')); 
      return;
    }
    try {
      await idb.updateNovelMetadata(editingNovel.id, { name: editNovelName.trim() });
      setIsEditModalOpen(false);
      setEditingNovel(null);
      fetchNovels();
    } catch (err) {
      console.error("Error updating novel name:", err);
      setError(t('error_update_novel'));
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast({
          title: t('invalid_file_type_title'),
          description: t('invalid_file_type_desc'),
          variant: "destructive",
        });
        return;
      }
      try {
        const fileContent = await file.text();
        const parsedData = JSON.parse(fileContent);
        await handleImportNovel(parsedData);
      } catch (err) {
        console.error("Error reading or parsing file:", err);
        toast({
          title: t('import_error_title'),
          description: t('import_error_parse_desc'),
          variant: "destructive",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleImportNovel = async (importedData) => {
    if (!importedData || typeof importedData.novelName !== 'string') {
      toast({
        title: t('invalid_json_format_title'),
        description: t('invalid_json_format_desc'),
        variant: "destructive",
      });
      return;
    }
    try {
      const newNovelMeta = await idb.createNovel(importedData.novelName);
      const novelDataToSave = {
        authorName: importedData.authorName || '',
        synopsis: importedData.synopsis || '',
        coverImage: importedData.coverImage || null,
        concepts: importedData.concepts || [],
        acts: importedData.acts || {},
        chapters: importedData.chapters || {},
        scenes: importedData.scenes || {},
        actOrder: importedData.actOrder || [],
      };
      await idb.saveNovelData(newNovelMeta.id, novelDataToSave);
      toast({
        title: t('import_successful_title'),
        description: t('import_successful_desc', { novelName: importedData.novelName }),
      });
      fetchNovels();
    } catch (err) {
      console.error("Error importing novel:", err);
      toast({
        title: t('import_error_title'),
        description: t('import_error_general_desc', { errorMessage: err.message }),
        variant: "destructive",
      });
    }
  };

  const filteredNovels = novels.filter(novel =>
    novel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-4 text-center">{t('loading_novels')}</div>;
  }

  return (
    <div className="flex flex-col max-h-screen bg-muted/40 overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b bg-background shadow-sm">
        <div className="flex items-center">
          <Rabbit className="h-7 w-7 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">{t('app_title')} <span className="hidden sm:inline">- {t('my_novels_header').split(' - ')[1]}</span></h1>
        </div>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2" title={t('language_switcher_tooltip')}>
                <Languages className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('en')} disabled={currentLanguage === 'en'}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('es')} disabled={currentLanguage === 'es'}>
                Espanol
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('cn')} disabled={currentLanguage === 'cn'}>
                中文
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('de')} disabled={currentLanguage === 'de'}>
                Deutsch
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('rus')} disabled={currentLanguage === 'rus'}>
                Pусский
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <Button variant="ghost" size="icon" onClick={triggerFileUpload} className="ml-2" title={t('upload_novel_tooltip')}>
            <UploadCloud className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsModalOpen(true)} className="ml-2" title={t('settings_tooltip')}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleThemeToggle} className="ml-2" title={effectiveTheme === 'light' ? t('theme_toggle_tooltip_light') : t('theme_toggle_tooltip_dark')}>
            {effectiveTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6">
        <ScrollArea className="h-[calc(100vh-4rem)] p-4"> {/* Adjusted height if header changes */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('search_novels_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredNovels.map(novel => (
            <NovelCard
              key={novel.id}
              novel={novel}
              onOpenNovel={() => handleOpenNovel(novel.id)}
              onDeleteNovel={() => openDeleteAlert(novel.id)}
              onEditNovel={() => openEditModal(novel)}
            />
          ))}
          <AddNewNovelCard onClick={() => setIsCreateFormModalOpen(true)} />
        </div>

        {novels.length === 0 && !isLoading && (
          <div className="text-center py-10 mt-[-2rem]">
            <p className="text-xl text-muted-foreground">
              {t('no_novels_yet')}
            </p>
          </div>
        )}

        {novels.length > 0 && filteredNovels.length === 0 && searchTerm && (
           <div className="text-center py-10">
            <p className="text-xl text-muted-foreground">
              {t('no_novels_match_search', { searchTerm: searchTerm })}
            </p>
          </div>
        )}
        </ScrollArea>
      </main>

      <CreateNovelFormModal
        isOpen={isCreateFormModalOpen}
        onClose={() => setIsCreateFormModalOpen(false)}
        onCreateNovel={handleCreateNovelWithDetails}
      />

      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0 sr-only">
            <DialogTitle>{t('settings_dialog_title')}</DialogTitle>
            <DialogDescription>{t('settings_dialog_desc')}</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-hidden">
            <SettingsView />
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rename_novel_dialog_title')}</DialogTitle>
            <DialogDescription>{t('rename_novel_dialog_desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="edit-novel-name">{t('novel_name_label')}</Label>
            <Input
              id="edit-novel-name"
              value={editNovelName}
              onChange={(e) => setEditNovelName(e.target.value)}
              placeholder={t('novel_name_placeholder')}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingNovel(null); }}>{t('cancel')}</Button>
            <Button onClick={handleEditNovel}>{t('save_changes_button')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_delete_desc', { novelName: novels.find(n => n.id === novelToDelete)?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNovelToDelete(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNovel} className="bg-destructive hover:bg-destructive/90">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NovelGridView;
