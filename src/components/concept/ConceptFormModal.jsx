import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { UserRoundPen, CircleX, Settings, WandSparkles } from 'lucide-react'; // Added icons, Settings, WandSparkles

import { useData } from '@/context/DataContext';
import { useSettings } from '@/context/SettingsContext'; // For AI settings
import { AISuggestionModal } from '@/components/ai/AISuggestionModal'; // For AI suggestions
import { useToast } from '@/hooks/use-toast'; // For notifications
import { getAllNovelMetadata, getNovelData } from '@/lib/indexedDb'; // For fetching novel name and full novel data
import { tokenCount } from '@/lib/utils'; // For estimating token count
// import { createConcept } from '@/data/models'; // createConcept is not used here
// import { defaultConceptTemplates } from '@/data/conceptTemplates'; // Will use conceptTemplates from DataContext
import ManageTemplatesModal from './ManageTemplatesModal'; // Import ManageTemplatesModal

const NO_TEMPLATE_VALUE = "__no_template__"; // Constant for "None" option
const defaultConceptDescriptionPrompt = 'concept description:'; // TODO: Consider t('concept_form_modal_default_description_prompt')

const ConceptFormModal = ({ children, open, onOpenChange, conceptToEdit }) => {
  const { t } = useTranslation();
  const { addConcept, updateConcept, conceptTemplates, currentNovelId, synopsis: synopsisFromContext, concepts: conceptsFromContext } = useData();
  const { taskSettings, TASK_KEYS, showAiFeatures } = useSettings();
  const { toast } = useToast();

  // State for self-fetched novel data for AI context
  const [localNovelData, setLocalNovelData] = useState(null);
  const [localNovelName, setLocalNovelName] = useState('');
  const [isLoadingNovelContext, setIsLoadingNovelContext] = useState(false);

  const [name, setName] = useState('');
  const [aliases, setAliases] = useState(''); // Comma-separated
  const [tags, setTags] = useState(''); // Comma-separated
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState(0);
  const [image, setImage] = useState(''); // Base64 string or URL
  const [selectedTemplateId, setSelectedTemplateId] = useState(NO_TEMPLATE_VALUE); // Initialize with NO_TEMPLATE_VALUE
  const [showAliases, setShowAliases] = useState(false); // State to toggle alias field visibility
  const [useImageUrl, setUseImageUrl] = useState(false); // State to toggle image input type, default to false (file upload)
  const [isManageTemplatesModalOpen, setIsManageTemplatesModalOpen] = useState(false);
  const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false); // State for AI modal
  const [contextForAI, setContextForAI] = useState('');
  const [contextTokensForAI, setContextTokensForAI] = useState(0);

  const isEditing = Boolean(conceptToEdit);

  useEffect(() => {
    if (open && currentNovelId) {
      const loadNovelContextData = async () => {
        setIsLoadingNovelContext(true);
        try {
          const [novelDataResult, allMetaResult] = await Promise.all([
            getNovelData(currentNovelId),
            getAllNovelMetadata()
          ]);
          
          setLocalNovelData(novelDataResult);

          const currentNovelMeta = allMetaResult.find(meta => meta.id === currentNovelId);
          setLocalNovelName(currentNovelMeta ? currentNovelMeta.name : '');

        } catch (error) {
          console.error("Error fetching novel context data in ConceptFormModal:", error);
          setLocalNovelData(null);
          setLocalNovelName('');
        }
        setIsLoadingNovelContext(false);
      };
      loadNovelContextData();
    } else if (open) { // Modal is open but no currentNovelId
      setLocalNovelData(null);
      setLocalNovelName('');
      setIsLoadingNovelContext(false);
    }
  }, [open, currentNovelId]);

  const prepareAIContextAndOpenModal = () => { 
    if (isLoadingNovelContext) {
      toast({ title: t('toast_context_loading_title'), description: t('toast_context_loading_desc_concept'), variant: "destructive" });
      return; 
    }
    if (!currentNovelId) {
      toast({ title: t('toast_no_active_novel_title'), description: t('toast_no_active_novel_desc_ai'), variant: "destructive" });
      return;
    }

    let contextString = "";

    if (localNovelName) {
      contextString += `Novel Name: ${localNovelName}\n`;
    } else {
      contextString += `Novel ID: ${currentNovelId} (Name not available)\n`;
    }

    const synopsisToUse = localNovelData?.synopsis ?? synopsisFromContext;
    if (synopsisToUse) {
      contextString += `Novel Synopsis: ${synopsisToUse}\n\n`;
    } else {
      contextString += `Novel Synopsis: (Not available or empty)\n\n`;
    }
  
    const conceptsToUse = localNovelData?.concepts ?? conceptsFromContext;
    if (conceptsToUse && conceptsToUse.length > 0) {
      contextString += "Other Existing Concepts in this Novel:\n";
      conceptsToUse.slice(0, 10).forEach(concept => { 
        contextString += `- ${concept.name}: ${concept.description?.substring(0, 75) || 'No description.'} (Tags: ${concept.tags?.join(', ') || 'none'})\n`;
      });
      if (conceptsToUse.length > 10) {
        contextString += `... and ${conceptsToUse.length - 10} more concepts.\n`;
      }
      contextString += "\n";
    }
  
    contextString += "Current Concept Details (for which to generate a description):\n";
    contextString += `Name: ${name || "(Not yet named)"}\n`;
    if (aliases) contextString += `Aliases: ${aliases}\n`;
    if (tags) contextString += `Tags: ${tags}\n`;
    if (description) contextString += `Current Description Draft: ${description}\n`;
    
    setContextForAI(contextString);
    setContextTokensForAI(tokenCount(contextString));
    setIsAISuggestionModalOpen(true);
  };

  const applyTemplate = (templateId) => {
    setSelectedTemplateId(templateId); // Set the selected ID first
    if (templateId === NO_TEMPLATE_VALUE) {
      // If "None" is selected when EDITTING, user might be trying to clear template effects.
      // However, we should NOT clear existing user-entered data.
      // This function will primarily apply template data if a template IS selected.
      // If "None" is chosen, no fields are changed by this function.
      return;
    }

    const template = conceptTemplates.find(t => t.id === templateId);
    if (template && template.templateData) {
      const td = template.templateData;
      // When editing, only pre-fill fields if they are currently empty,
      // or if you want to offer a "merge" or "overwrite" option (more complex).
      // For simplicity, let's pre-fill if the field is empty.
      setName(currentName => currentName ? currentName : (td.name || ''));
      setAliases(currentAliases => currentAliases ? currentAliases : ((td.aliases || []).join(', ')));
      setTags(currentTags => currentTags ? currentTags : ((td.tags || []).join(', ')));
      setDescription(currentDesc => currentDesc ? currentDesc : (td.description || ''));
      setNotes(currentNotes => currentNotes ? currentNotes : (td.notes || ''));
      setPriority(currentPri => currentPri ? currentPri : (td.priority || 0)); // Assuming 0 is a valid default
      setImage(currentImg => currentImg ? currentImg : (td.image || ''));
      
      // Show aliases if template has them or if concept already had them
      setShowAliases(!!(td.aliases && td.aliases.length > 0) || !!aliases);
    }
  };
  
  const resetFormFields = () => {
    // When resetting for an edit form, re-populate with conceptToEdit data
    if (isEditing && conceptToEdit) {
      setName(conceptToEdit.name || '');
      setAliases((conceptToEdit.aliases || []).join(', '));
      setTags((conceptToEdit.tags || []).join(', '));
      setDescription(conceptToEdit.description || '');
      setNotes(conceptToEdit.notes || '');
      setPriority(conceptToEdit.priority || 0);
      setImage(conceptToEdit.image || '');
      setShowAliases(!!(conceptToEdit.aliases && conceptToEdit.aliases.length > 0));
    } else { // Resetting for a new concept (though CreateConceptModal is primary for this)
      setName('');
      setAliases('');
      setTags('');
      setDescription('');
      setNotes('');
      setPriority(0);
      setImage('');
      setShowAliases(false);
    }
    setSelectedTemplateId(NO_TEMPLATE_VALUE); // Always reset template selection to "None"
    setUseImageUrl(false);
  };

  useEffect(() => {
    if (open) {
      resetFormFields(); // This will correctly populate or clear based on isEditing
      // Reset AI context related state if modal is re-opened for a different concept or new
      setContextForAI('');
      setContextTokensForAI(0);
      // Fetch novel context if modal is opened
      if (open && currentNovelId) {
        // The useEffect for [open, currentNovelId] will handle fetching
      } else if (open) {
        setLocalNovelData(null);
        setLocalNovelName('');
        setIsLoadingNovelContext(false);
      }
    }
  }, [conceptToEdit, isEditing, open, currentNovelId]); // Added currentNovelId dependency


  const handleSubmit = () => {
    const conceptData = {
      name,
      aliases: aliases.split(',').map(s => s.trim()).filter(s => s),
      tags: tags.split(',').map(s => s.trim()).filter(s => s),
      description,
      notes,
      priority: parseInt(String(priority), 10) || 0, // Ensure priority is a number
      image: image || null,
    };

    if (isEditing && conceptToEdit) {
      updateConcept({ ...conceptToEdit, ...conceptData });
    } else {
      // This modal is primarily for editing. For creation, CreateConceptModal is used.
      // However, if it were used for creation, addConcept would be called.
      addConcept(conceptData); 
    }
    // resetFormFields(); // Resetting is now handled by the useEffect on `open`
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetFormFields(); // Reset form on close
      }}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent 
          className="sm:max-w-[525px] overflow-y-auto"
          onPointerDownOutside={(event) => {
            // event.preventDefault(); // Allow closing by clicking outside
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? t('concept_form_modal_title_edit') : t('concept_cache_tooltip_create_new')}</DialogTitle>
            <DialogDescription>
              {isEditing ? t('concept_form_modal_description_edit') : t('concept_form_modal_description_create')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Template Selector - Only show if not editing */}
            {!isEditing && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="concept-form-template" className="text-right">{t('concept_form_modal_label_template')}</Label>
              <div className="col-span-2">
                <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('concept_form_modal_placeholder_template')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE_VALUE}>{t('concept_form_modal_template_none')}</SelectItem>
                    {conceptTemplates && conceptTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.isDefault ? '' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsManageTemplatesModalOpen(true)} className="col-span-1">
                <Settings className="h-4 w-4 mr-1 sm:mr-2" /> {t('concept_form_modal_button_manage_templates')}
              </Button>
            </div>
            )}
            
            {/* Name Field */}
            <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t('concept_form_modal_label_name_required')}</Label>
            <div className="flex items-center gap-2">
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="flex-grow" placeholder={t('concept_form_modal_placeholder_name')} />
              <Button variant="ghost" size="icon" onClick={() => setShowAliases(!showAliases)} title={t('concept_form_modal_tooltip_toggle_aliases')}>
                <UserRoundPen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Aliases Field (conditionally rendered) */}
          {showAliases && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="aliases">{t('concept_form_modal_label_aliases')}</Label>
              <Input id="aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder={t('concept_form_modal_placeholder_aliases')} />
            </div>
          )}

          {/* Tags Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">{t('concept_form_modal_label_tags')}</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('concept_form_modal_placeholder_tags')} />
          </div>

          {/* Description and Notes Tabs */}
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="description">{t('concept_form_modal_tab_description')}</TabsTrigger>
              <TabsTrigger value="notes">{t('concept_form_modal_tab_notes')}</TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <div className="flex flex-col gap-2 relative"> {/* Added relative positioning */}
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('concept_form_modal_placeholder_description')}
                  rows={4}
                  className={showAiFeatures ? "pr-10" : ""} // Add padding for the button
                />
                {showAiFeatures && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 h-7 w-7 text-slate-500 hover:text-slate-700"
                    onClick={prepareAIContextAndOpenModal}
                    aria-label={t('create_concept_modal_ai_description_label')} // Re-use translation or create new
                    disabled={isLoadingNovelContext || !currentNovelId} 
                  >
                    <WandSparkles className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TabsContent>
            <TabsContent value="notes">
              <div className="flex flex-col gap-2">
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('concept_form_modal_placeholder_notes')} rows={3}/>
              </div>
            </TabsContent>
          </Tabs>

          {/* Image Upload/URL Section */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="image">{t('concept_form_modal_label_image')}</Label>
            <div className="flex items-center gap-2"> {/* Added flex container */}
              {useImageUrl ? (
                <Input
                  id="image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder={t('concept_form_modal_placeholder_image_url')}
                  className="flex-grow"
                />
              ) : (
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImage(reader.result); // result is base64 string
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setImage('');
                    }
                  }}
                  className="flex-grow"
                />
              )}
              {/* Clear Image Button */}
              {image && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setImage('')}
                  title={t('concept_form_modal_tooltip_clear_image')}
                >
                  <CircleX className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* Toggle between URL and File Upload */}
            <div className="flex items-center justify-between">
              <Label htmlFor="image-type-switch">{useImageUrl ? t('concept_form_modal_label_image_type_url') : t('concept_form_modal_label_image_type_upload')}</Label>
              <Switch
                id="image-type-switch"
                checked={useImageUrl}
                onCheckedChange={setUseImageUrl}
              />
            </div>
          </div>

          {/* Display Image if exists */}
          {image && (
            <div className="flex justify-center mt-2">
              <img src={image} alt={t('concept_form_modal_alt_text_concept_image')} className="max-w-full max-h-48 object-contain" />
            </div>
          )}

          {/* Priority field moved to bottom */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="priority">{t('concept_form_modal_label_priority')}</Label>
            <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
          </div>

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
            {isEditing ? t('save_changes_button') : t('concept_form_modal_button_save_concept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ManageTemplatesModal
      open={isManageTemplatesModalOpen}
      onOpenChange={setIsManageTemplatesModalOpen}
    />

    {isAISuggestionModalOpen && (
      <AISuggestionModal
        isOpen={isAISuggestionModalOpen}
        onClose={() => setIsAISuggestionModalOpen(false)}
        currentText={description}
        initialQuery={taskSettings[TASK_KEYS.CONCEPT_DESC]?.prompt || defaultConceptDescriptionPrompt}
        novelData={contextForAI}
        novelDataTokens={contextTokensForAI}
        onAccept={(suggestion) => {
          setDescription(suggestion);
          setIsAISuggestionModalOpen(false);
          toast({ title: t('toast_concept_description_updated_title'), description: t('toast_concept_description_updated_desc') });
        }}
        fieldLabel={t('create_concept_modal_ai_modal_field_label_description')} // Re-use or create new
        taskKeyForProfile={TASK_KEYS.CONCEPT_DESC}
      />
    )}
  </>
  );
};

export default ConceptFormModal;
