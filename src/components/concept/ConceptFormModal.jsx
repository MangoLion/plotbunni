import React, { useState, useEffect } from 'react';
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
import { UserRoundPen, CircleX, Settings } from 'lucide-react'; // Added icons, Settings

import { useData } from '@/context/DataContext';
// import { createConcept } from '@/data/models'; // createConcept is not used here
// import { defaultConceptTemplates } from '@/data/conceptTemplates'; // Will use conceptTemplates from DataContext
import ManageTemplatesModal from './ManageTemplatesModal'; // Import ManageTemplatesModal

const NO_TEMPLATE_VALUE = "__no_template__"; // Constant for "None" option

const ConceptFormModal = ({ children, open, onOpenChange, conceptToEdit }) => {
  const { addConcept, updateConcept, conceptTemplates } = useData(); // Get conceptTemplates from DataContext
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

  const isEditing = Boolean(conceptToEdit);

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
    }
  }, [conceptToEdit, isEditing, open]);


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
            <DialogTitle>{isEditing ? 'Edit Concept' : 'Create New Concept'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details for this concept.' : "Fill in the details for your new concept. Click save when you're done."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Template Selector - Show for both new (if this modal was used) and edit */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="concept-form-template" className="text-right">Template</Label>
              <div className="col-span-2">
                <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Apply a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE_VALUE}>None</SelectItem>
                    {conceptTemplates && conceptTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.isDefault ? '' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsManageTemplatesModalOpen(true)} className="col-span-1">
                <Settings className="h-4 w-4 mr-1 sm:mr-2" /> Manage
              </Button>
            </div>
            
            {/* Name Field */}
            <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name*</Label>
            <div className="flex items-center gap-2">
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="flex-grow" placeholder="Concept Name (e.g., The Oracle)" />
              <Button variant="ghost" size="icon" onClick={() => setShowAliases(!showAliases)} title="Toggle Aliases Field">
                <UserRoundPen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Aliases Field (conditionally rendered) */}
          {showAliases && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="aliases">Aliases</Label>
              <Input id="aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="e.g., Seer, Prophet (comma-separated)" />
            </div>
          )}

          {/* Tags Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., character, prophecy, location (comma-separated)" />
          </div>

          {/* Description and Notes Tabs */}
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <div className="flex flex-col gap-2">
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed explanation of the concept (AI visible)" rows={4}/>
              </div>
            </TabsContent>
            <TabsContent value="notes">
              <div className="flex flex-col gap-2">
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Concept notes (not shown to AI)" rows={3}/>
              </div>
            </TabsContent>
          </Tabs>

          {/* Image Upload/URL Section */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="image">Image</Label>
            <div className="flex items-center gap-2"> {/* Added flex container */}
              {useImageUrl ? (
                <Input
                  id="image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="Optional: URL for an image"
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
                  title="Clear Image"
                >
                  <CircleX className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* Toggle between URL and File Upload */}
            <div className="flex items-center justify-between">
              <Label htmlFor="image-type-switch">{useImageUrl ? 'Use Image URL' : 'Upload Image (Base64)'}</Label>
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
              <img src={image} alt="Concept Image" className="max-w-full max-h-48 object-contain" />
            </div>
          )}

          {/* Priority field moved to bottom */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
          </div>

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
            {isEditing ? 'Save Changes' : 'Save Concept'}
          </Button>
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

export default ConceptFormModal;
