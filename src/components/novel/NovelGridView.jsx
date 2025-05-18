import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NovelCard from './NovelCard';
import AddNewNovelCard from './AddNewNovelCard';
import CreateNovelFormModal from './CreateNovelFormModal';
import SettingsView from '@/components/settings/SettingsView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Rabbit, Sun, Moon, UploadCloud, Settings } from 'lucide-react';
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as idb from '@/lib/indexedDb';
import { getDefaultConceptTemplates } from '@/data/models';

const NovelGridView = () => {
  const [novels, setNovels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCreateFormModalOpen, setIsCreateFormModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNovel, setEditingNovel] = useState(null); // { id, name }
  const [editNovelName, setEditNovelName] = useState('');

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [novelToDelete, setNovelToDelete] = useState(null); // novelId

  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Get theme settings from context
  const { themeMode, activeOsTheme, setThemeMode } = useSettings();

  // Determine the effective theme for the toggle button display
  const effectiveTheme = themeMode === 'system' ? activeOsTheme : themeMode;

  // Toggle between explicit light and dark modes
  const handleThemeToggle = () => {
    const nextTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme); // Use the context function to set the mode
  };

  const fetchNovels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const novelMetadatas = await idb.getAllNovelMetadata();
      
      // Fetch full data for each novel to get coverImage and synopsis
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

      // Sort by lastModified date, newest first
      enrichedNovels.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      setNovels(enrichedNovels);
    } catch (err) {
      console.error("Error fetching novels:", err);
      setError("Failed to load novels. Please try refreshing the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNovels();
  }, [fetchNovels]);

  const handleOpenNovel = (novelId) => {
    navigate(`/novel/${novelId}`);
  };

  const handleCreateNovelWithDetails = async (novelDetails) => {
    if (!novelDetails.novelName || !novelDetails.novelName.trim()) {
      toast({
        title: "Novel Name Required",
        description: "Please provide a name for your novel.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const newNovelMeta = await idb.createNovel(novelDetails.novelName.trim());
      
      const fullNovelData = {
        id: newNovelMeta.id, // Ensure ID is part of the saved data structure if models.js expects it
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
        title: "Novel Created!",
        description: `"${novelDetails.novelName.trim()}" has been successfully created.`,
      });
      await fetchNovels(); // Refresh the list to show the new novel
      navigate(`/novel/${newNovelMeta.id}`); // Navigate to the new novel
    } catch (err) {
      console.error("Error creating novel with details:", err);
      toast({
        title: "Creation Failed",
        description: `Could not create novel. ${err.message}`,
        variant: "destructive",
      });
      setError("Failed to create novel.");
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
      fetchNovels(); // Refresh the list
    } catch (err) {
      console.error("Error deleting novel:", err);
      setError("Failed to delete novel.");
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
      alert("Novel name cannot be empty.");
      return;
    }
    try {
      await idb.updateNovelMetadata(editingNovel.id, { name: editNovelName.trim() });
      setIsEditModalOpen(false);
      setEditingNovel(null);
      fetchNovels();
    } catch (err) {
      console.error("Error updating novel name:", err);
      setError("Failed to update novel name.");
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
          title: "Invalid File Type",
          description: "Please upload a valid JSON file.",
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
          title: "Import Error",
          description: "Failed to read or parse the JSON file. Ensure it's valid.",
          variant: "destructive",
        });
      } finally {
        // Reset file input to allow uploading the same file again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleImportNovel = async (importedData) => {
    if (!importedData || typeof importedData.novelName !== 'string') {
      toast({
        title: "Invalid JSON Format",
        description: "The JSON file is missing 'novelName' or is improperly formatted.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Create novel metadata
      const newNovelMeta = await idb.createNovel(importedData.novelName);
      
      // 2. Prepare the full novel data object for saving
      // The structure exported by NovelOverviewTab is:
      // { novelName, authorName, synopsis, coverImage, concepts, acts, chapters, scenes, actOrder }
      // The structure expected by saveNovelData is:
      // { authorName, synopsis, coverImage, concepts, acts, chapters, scenes, actOrder }
      // novelName is handled by createNovel.
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

      // 3. Save the full novel data
      await idb.saveNovelData(newNovelMeta.id, novelDataToSave);

      toast({
        title: "Import Successful",
        description: `Novel "${importedData.novelName}" has been imported.`,
      });
      fetchNovels(); // Refresh the list
    } catch (err) {
      console.error("Error importing novel:", err);
      toast({
        title: "Import Error",
        description: `Failed to import novel. ${err.message}`,
        variant: "destructive",
      });
    }
  };

  const filteredNovels = novels.filter(novel =>
    novel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-4 text-center">Loading novels...</div>;
  }

  return (
    <div className="flex flex-col max-h-screen bg-muted/40 overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b bg-background shadow-sm">
        <div className="flex items-center">
          <Rabbit className="h-7 w-7 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Plot Bunni <span className="hidden sm:inline">- My Novels</span></h1>
        </div>
        <div className="flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <Button variant="ghost" size="icon" onClick={triggerFileUpload} className="ml-2" title="Upload Novel JSON">
            <UploadCloud className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsModalOpen(true)} className="ml-2" title="Open Settings">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleThemeToggle} className="ml-2" title={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}>
            {effectiveTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6">
        <ScrollArea className="h-[calc(100vh-4rem)] p-4">
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search novels by name..."
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

        {novels.length === 0 && !isLoading && ( // Show if no novels exist at all
          <div className="text-center py-10 mt-[-2rem]"> {/* Adjust margin if grid has AddNewNovelCard already */}
            <p className="text-xl text-muted-foreground">
              No novels yet. Click the '+' card to create your first one!
            </p>
          </div>
        )}

        {novels.length > 0 && filteredNovels.length === 0 && searchTerm && ( // Show if novels exist but none match search
           <div className="text-center py-10">
            <p className="text-xl text-muted-foreground">
              No novels match your search for "{searchTerm}".
            </p>
          </div>
        )}
        </ScrollArea>
      </main>

      {/* Create Novel Form Modal (New) */}
      <CreateNovelFormModal
        isOpen={isCreateFormModalOpen}
        onClose={() => setIsCreateFormModalOpen(false)}
        onCreateNovel={handleCreateNovelWithDetails}
      />

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0"> {/* Adjusted for better SettingsView display */}
          {/* DialogHeader can be minimal or removed if SettingsView has its own title */}
          <DialogHeader className="p-6 pb-0 sr-only"> {/* Keep for accessibility, hide visually if redundant */}
            <DialogTitle>Application Settings</DialogTitle>
            <DialogDescription>Configure application settings.</DialogDescription>
          </DialogHeader>
          {/* SettingsView will provide its own scrollability and padding */}
          <div className="flex-grow overflow-hidden"> {/* This div ensures SettingsView's ScrollArea works correctly */}
            <SettingsView />
          </div>
          {/* No explicit DialogFooter needed if SettingsView handles its own actions or if it's just for display */}
        </DialogContent>
      </Dialog>
      
      {/* Edit Novel Name Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Novel</DialogTitle>
            <DialogDescription>Enter a new name for your novel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="edit-novel-name">Novel Name</Label>
            <Input
              id="edit-novel-name"
              value={editNovelName}
              onChange={(e) => setEditNovelName(e.target.value)}
              placeholder="e.g., The Great Adventure"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingNovel(null); }}>Cancel</Button>
            <Button onClick={handleEditNovel}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the novel
              "{novels.find(n => n.id === novelToDelete)?.name}" and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNovelToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNovel} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NovelGridView;
