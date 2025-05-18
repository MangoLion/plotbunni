import React, { useState, useEffect  } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select
import { Switch } from "@/components/ui/switch"; // Added Switch
import { Settings, CircleX } from 'lucide-react'; // For Manage Templates button icon and Clear Image button

import { useData } from '@/context/DataContext';
import { createConcept } from '@/data/models';
import ManageTemplatesModal from './ManageTemplatesModal'; // Import ManageTemplatesModal

const NO_TEMPLATE_VALUE = "__no_template__"; // Constant for "None" option

const CreateConceptModal = ({ children, open, onOpenChange }) => {
  const { t } = useTranslation();
  const { addConcept, conceptTemplates } = useData(); // Get conceptTemplates
  const [name, setName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(NO_TEMPLATE_VALUE); // Default to NO_TEMPLATE_VALUE
  const [isManageTemplatesModalOpen, setIsManageTemplatesModalOpen] = useState(false);
  const [aliases, setAliases] = useState(''); // Comma-separated
  const [tags, setTags] = useState(''); // Comma-separated
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState(0);
  const [image, setImage] = useState(''); // Base64 string or URL
  const [useImageUrl, setUseImageUrl] = useState(false); // State to toggle image input type

  // Function to apply a template
  const applyTemplate = (templateId) => {
    setSelectedTemplateId(templateId); // Set the selected ID first
    if (templateId === NO_TEMPLATE_VALUE) {
      // If "None" is selected, clear relevant fields or reset to initial state for a new concept
      // For a "create" modal, this usually means clearing them.
      setName('');
      setAliases('');
      setTags('');
      setDescription('');
      setNotes('');
      setPriority(0);
      setImage('');
      return;
    }

    const template = conceptTemplates.find(t => t.id === templateId);
    if (template && template.templateData) {
      const td = template.templateData;
      // For create modal, generally overwrite fields with template data
      setName(td.name || ''); // Use template name or empty if not provided
      setAliases((td.aliases || []).join(', '));
      setTags((td.tags || []).join(', '));
      setDescription(td.description || '');
      setNotes(td.notes || '');
      setPriority(td.priority || 0);
      setImage(td.image || '');
    }
  };
  
  const resetFormFields = () => {
    setName('');
    setAliases('');
    setTags('');
    setDescription('');
    setNotes('');
    setPriority(0);
    setImage('');
    setSelectedTemplateId(NO_TEMPLATE_VALUE); // Reset to "None"
    setUseImageUrl(false); // Reset image input type
  };

  const handleSubmit = () => {
    const newConceptData = {
      name: name.trim(), // Ensure name is trimmed
      aliases: aliases.split(',').map(s => s.trim()).filter(s => s),
      tags: tags.split(',').map(s => s.trim()).filter(s => s),
      description: description.trim(),
      notes: notes.trim(),
      priority: parseInt(priority, 10) || 0,
      image: image.trim() || null,
    };
    addConcept(newConceptData);
    resetFormFields(); // Reset form
    onOpenChange(false); // Close modal
  };
  
  // When the main modal opens/closes, reset the form
  useEffect(() => {
    if (open) {
      resetFormFields();
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetFormFields(); // Reset form on close
      }}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{t('concept_cache_tooltip_create_new')}</DialogTitle>
            <DialogDescription>
              {t('create_concept_modal_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template" className="text-right">{t('concept_form_modal_label_template')}</Label>
              <div className="col-span-2">
                <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('create_concept_modal_placeholder_template')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE_VALUE}>{t('concept_form_modal_template_none')}</SelectItem>
                    {conceptTemplates && conceptTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsManageTemplatesModalOpen(true)} className="col-span-1">
                <Settings className="h-4 w-4 mr-1 sm:mr-2" /> {t('concept_form_modal_button_manage_templates')}
              </Button>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">{t('concept_form_modal_label_name_required')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder={t('concept_form_modal_placeholder_name')} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="aliases" className="text-right">{t('concept_form_modal_label_aliases')}</Label>
            <Input id="aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} className="col-span-3" placeholder={t('concept_form_modal_placeholder_aliases')} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">{t('concept_form_modal_label_tags')}</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="col-span-3" placeholder={t('concept_form_modal_placeholder_tags')} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">{t('concept_form_modal_label_priority')}</Label>
            <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="description">{t('concept_form_modal_tab_description')}</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('concept_form_modal_placeholder_description')} rows={4}/>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="notes">{t('concept_form_modal_tab_notes')}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('concept_form_modal_placeholder_notes')} rows={3}/>
          </div>

          {/* Image Upload/URL Section */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="image">{t('concept_form_modal_label_image')}</Label>
            <div className="flex items-center gap-2">
              {useImageUrl ? (
                <Input
                  id="image-url"
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
              <img src={image} alt={t('create_concept_modal_alt_text_concept_preview')} className="max-w-full max-h-48 object-contain" />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>{t('concept_form_modal_button_save_concept')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ManageTemplatesModal
      open={isManageTemplatesModalOpen}
      onOpenChange={setIsManageTemplatesModalOpen}
    />
  </>
  );
};

export default CreateConceptModal;
