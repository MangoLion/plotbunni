import React, { useState, useEffect  } from 'react';
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
            <DialogTitle>Create New Concept</DialogTitle>
            <DialogDescription>
              Fill in the details for your new concept, optionally starting from a template. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template" className="text-right">Template</Label>
              <div className="col-span-2">
                <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE_VALUE}>None</SelectItem>
                    {conceptTemplates && conceptTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsManageTemplatesModalOpen(true)} className="col-span-1">
                <Settings className="h-4 w-4 mr-1 sm:mr-2" /> Manage
              </Button>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name*</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="Concept Name (e.g., The Oracle)" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="aliases" className="text-right">Aliases</Label>
            <Input id="aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} className="col-span-3" placeholder="e.g., Seer, Prophet (comma-separated)" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="col-span-3" placeholder="e.g., character, prophecy, location (comma-separated)" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">Priority</Label>
            <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed explanation of the concept (AI visible)" rows={4}/>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Concept notes (not shown to AI)" rows={3}/>
          </div>

          {/* Image Upload/URL Section */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="image">Image</Label>
            <div className="flex items-center gap-2">
              {useImageUrl ? (
                <Input
                  id="image-url"
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
              <img src={image} alt="Concept Preview" className="max-w-full max-h-48 object-contain" />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>Save Concept</Button>
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
