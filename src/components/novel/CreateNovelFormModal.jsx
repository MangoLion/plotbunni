import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  const { taskSettings, TASK_KEYS, showAiFeatures } = useSettings();

  const defaultNovelDescriptionPrompt = t('create_novel_form_default_synopsis_prompt');

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
        toast({ title: t('create_novel_form_toast_image_selected_title'), description: t('create_novel_form_toast_image_selected_desc') });
      };
      reader.readAsDataURL(file);
    }
  };

  const processDroppedFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
        toast({ title: t('create_novel_form_toast_image_dropped_title'), description: t('create_novel_form_toast_image_selected_desc') });
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: t('create_novel_form_toast_invalid_file_title'),
        description: t('create_novel_form_toast_invalid_file_desc'),
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
    toast({ title: t('create_novel_form_toast_image_cleared_title'), description: t('create_novel_form_toast_image_cleared_desc') });
  };

  const handleSubmit = () => {
    if (!novelName.trim()) {
      toast({
        title: t('novel_name_required_title'),
        description: t('novel_name_required_desc'),
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
            <DialogTitle>{t('create_novel_form_dialog_title')}</DialogTitle>
            <DialogDescription>
              {t('create_novel_form_dialog_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newNovelName">{t('create_novel_form_label_novel_name_required')}</Label>
              <Input
                id="newNovelName"
                value={novelName}
                onChange={(e) => setNovelName(e.target.value)}
                placeholder={t('create_novel_form_placeholder_novel_name')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newAuthorName">{t('create_novel_form_label_author_name')}</Label>
              <Input
                id="newAuthorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={t('create_novel_form_placeholder_author_name')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newSynopsis">{t('create_novel_form_label_synopsis')}</Label>
              <div className="relative">
                <Textarea
                  id="newSynopsis"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder={t('create_novel_form_placeholder_synopsis')}
                  rows={4}
                  className={showAiFeatures ? "pr-10" : ""}
                />
                {showAiFeatures && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700"
                    onClick={() => setIsAISuggestionModalOpen(true)}
                    aria-label={t('create_novel_form_aria_label_ai_synopsis')}
                  >
                    <WandSparkles className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent text-sm">
                  {isDetailsOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  {t('create_novel_form_collapsible_details_label')}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="newPointOfView">{t('create_novel_form_label_pov')}</Label>
                  <Input
                    id="newPointOfView"
                    value={pointOfView}
                    onChange={(e) => setPointOfView(e.target.value)}
                    placeholder={t('create_novel_form_placeholder_pov')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newGenre">{t('create_novel_form_label_genre')}</Label>
                  <Input
                    id="newGenre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder={t('create_novel_form_placeholder_genre')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTimePeriod">{t('create_novel_form_label_time_period')}</Label>
                  <Input
                    id="newTimePeriod"
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    placeholder={t('create_novel_form_placeholder_time_period')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTargetAudience">{t('create_novel_form_label_target_audience')}</Label>
                  <Input
                    id="newTargetAudience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder={t('create_novel_form_placeholder_target_audience')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newThemes">{t('create_novel_form_label_themes')}</Label>
                  <Textarea
                    id="newThemes"
                    value={themes}
                    onChange={(e) => setThemes(e.target.value)}
                    placeholder={t('create_novel_form_placeholder_themes')}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTone">{t('create_novel_form_label_tone')}</Label>
                  <Textarea
                    id="newTone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder={t('create_novel_form_placeholder_tone')}
                    rows={3}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-2">
              <Label htmlFor="newCoverImageInputFile">{t('create_novel_form_label_cover_image')}</Label>
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
                  title={t('create_novel_form_title_change_cover')}
                >
                  <img
                    src={coverImage}
                    alt={t('create_novel_form_alt_cover_preview')}
                    className="max-h-full max-w-full object-contain rounded"
                  />
                  {isDraggingOver && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-md">
                      <span className="text-primary font-medium">{t('create_novel_form_text_drop_to_replace')}</span>
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearImage();
                    }}
                    title={t('create_novel_form_title_remove_cover')}
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
                  title={t('create_novel_form_title_upload_cover')}
                >
                  <UploadCloud className={`h-8 w-8 mb-1 ${isDraggingOver ? 'text-primary' : 'text-gray-400'}`} />
                  <span>{isDraggingOver ? t('create_novel_form_text_drop_image_here') : t('create_novel_form_text_click_or_drag_upload')}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit}>
              {t('create_novel_form_button_create_novel')}
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
            toast({ title: t('create_novel_form_toast_synopsis_updated_title'), description: t('create_novel_form_toast_synopsis_updated_desc') });
          }}
          fieldLabel={t('create_novel_form_ai_modal_field_label_synopsis')}
          taskKeyForProfile={TASK_KEYS.NOVEL_DESC}
        />
      )}
    </>
  );
};

export default CreateNovelFormModal;
