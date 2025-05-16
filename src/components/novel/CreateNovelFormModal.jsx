import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Trash2, UploadCloud, WandSparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AISuggestionModal } from '@/components/ai/AISuggestionModal';
import { useSettings } from '@/context/SettingsContext'; // To get TASK_KEYS and taskSettings

const CreateNovelFormModal = ({ isOpen, onClose, onCreateNovel }) => {
  const [novelName, setNovelName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [coverImage, setCoverImage] = useState(null); // Base64 string
  const [pointOfView, setPointOfView] = useState('');
  const [genre, setGenre] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [themes, setThemes] = useState('');
  const [tone, setTone] = useState('');

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false);

  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const { taskSettings, TASK_KEYS } = useSettings();

  const defaultNovelDescriptionPrompt = "Write a captivating synopsis for a new novel.";

  useEffect(() => {
    // Reset form when modal is opened/closed or props change
    if (isOpen) {
      setNovelName('');
      setAuthorName('');
      setSynopsis('');
      setCoverImage(null);
      setPointOfView('');
      setGenre('');
      setTimePeriod('');
      setTargetAudience('');
      setThemes('');
      setTone('');
      setIsDetailsOpen(false);
    }
  }, [isOpen]);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
        toast({ title: "Image Selected", description: "Cover image preview updated." });
      };
      reader.readAsDataURL(file);
    }
  };

  const processDroppedFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
        toast({ title: "Image Dropped", description: "Cover image preview updated." });
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please drop an image file.",
        variant: "destructive",
      });
    }
  };

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
      processDroppedFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearImage = () => {
    setCoverImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
    toast({ title: "Image Cleared", description: "Cover image preview removed." });
  };

  const handleSubmit = () => {
    if (!novelName.trim()) {
      toast({
        title: "Novel Name Required",
        description: "Please enter a name for your novel.",
        variant: "destructive",
      });
      return;
    }

    const novelDetails = {
      novelName: novelName.trim(),
      authorName: authorName.trim(),
      synopsis: synopsis.trim(),
      coverImage, // Already base64 or null
      pointOfView: pointOfView.trim(),
      genre: genre.trim(),
      timePeriod: timePeriod.trim(),
      targetAudience: targetAudience.trim(),
      themes: themes.trim(),
      tone: tone.trim(),
    };
    onCreateNovel(novelDetails);
    // onClose(); // Parent will close after successful creation
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Novel</DialogTitle>
            <DialogDescription>
              Fill in the details for your new novel. You can always change these later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newNovelName">Novel Name *</Label>
              <Input
                id="newNovelName"
                value={novelName}
                onChange={(e) => setNovelName(e.target.value)}
                placeholder="Your amazing novel title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newAuthorName">Author Name</Label>
              <Input
                id="newAuthorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Pen name or your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newSynopsis">Synopsis</Label>
              <div className="relative">
                <Textarea
                  id="newSynopsis"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="A short, captivating summary..."
                  rows={4}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700"
                  onClick={() => setIsAISuggestionModalOpen(true)}
                  aria-label="Get AI Suggestion for Synopsis"
                >
                  <WandSparkles className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent text-sm">
                  {isDetailsOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  Additional Novel Details (Optional)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="newPointOfView">Point of View</Label>
                  <Input
                    id="newPointOfView"
                    value={pointOfView}
                    onChange={(e) => setPointOfView(e.target.value)}
                    placeholder="e.g., First Person, Third Person Limited"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newGenre">Genre & Subgenre</Label>
                  <Input
                    id="newGenre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g., Fantasy - Urban Fantasy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTimePeriod">Time Period</Label>
                  <Input
                    id="newTimePeriod"
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    placeholder="e.g., Contemporary, Historical"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTargetAudience">Target Audience</Label>
                  <Input
                    id="newTargetAudience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Young Adult, Adult"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newThemes">Themes</Label>
                  <Textarea
                    id="newThemes"
                    value={themes}
                    onChange={(e) => setThemes(e.target.value)}
                    placeholder="e.g., Love, betrayal, redemption"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTone">Tone</Label>
                  <Textarea
                    id="newTone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g., Dark, humorous, suspenseful"
                    rows={3}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-2">
              <Label htmlFor="newCoverImageInputFile">Cover Image</Label>
              <Input
                id="newCoverImageInputFile"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                ref={fileInputRef}
              />
              {coverImage ? (
                <div
                  className={`relative group mt-1 border rounded-md p-2 flex justify-center items-center cursor-pointer transition-colors ${
                    isDraggingOver ? 'bg-primary/10 border-primary' : 'bg-muted/40 hover:bg-muted/50'
                  }`}
                  style={{ height: '150px', width: '100%' }}
                  onClick={triggerFileUpload}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  title="Click or drag image to change cover"
                >
                  <img
                    src={coverImage}
                    alt="Cover Preview"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                  {isDraggingOver && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-md">
                      <span className="text-primary font-medium">Drop to replace image</span>
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearImage();
                    }}
                    title="Remove Cover Image"
                    className="absolute bottom-1 right-1 h-7 w-7 transition-opacity shadow-md rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`mt-1 border-2 border-dashed rounded-md p-6 flex flex-col justify-center items-center text-xs cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:border-muted-foreground/50'
                  }`}
                  style={{ height: '150px', width: '100%' }}
                  onClick={triggerFileUpload}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  title="Click or drag image to upload"
                >
                  <UploadCloud className={`h-8 w-8 mb-1 ${isDraggingOver ? 'text-primary' : 'text-gray-400'}`} />
                  <span>{isDraggingOver ? 'Drop image here' : 'Click or drag image to upload'}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit}>
              Create Novel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAISuggestionModalOpen && (
        <AISuggestionModal
          isOpen={isAISuggestionModalOpen}
          onClose={() => setIsAISuggestionModalOpen(false)}
          currentText={synopsis}
          initialQuery={taskSettings[TASK_KEYS.NOVEL_DESC]?.prompt || defaultNovelDescriptionPrompt}
          novelData={null} // No existing novel data for context when creating
          onAccept={(suggestion) => {
            setSynopsis(suggestion);
            setIsAISuggestionModalOpen(false);
            toast({ title: "Synopsis Updated", description: "AI suggestion applied." });
          }}
          fieldLabel="Novel Synopsis"
          taskKeyForProfile={TASK_KEYS.NOVEL_DESC}
        />
      )}
    </>
  );
};

export default CreateNovelFormModal;
