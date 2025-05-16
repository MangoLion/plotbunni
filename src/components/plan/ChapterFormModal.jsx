import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from '@/context/DataContext';

const ChapterFormModal = ({ open, onOpenChange, chapterToEdit, actId }) => {
  const { addChapterToAct, updateChapter } = useData();
  const [name, setName] = useState('');
  const isEditing = Boolean(chapterToEdit);

  useEffect(() => {
    if (open) {
      if (isEditing && chapterToEdit) {
        setName(chapterToEdit.name || '');
      } else {
        setName('');
      }
    }
  }, [chapterToEdit, isEditing, open]);

  const resetForm = () => setName('');

  const handleSubmit = () => {
    if (!isEditing && !actId) {
      console.error("Act ID is required to create a new chapter.");
      return;
    }

    if (isEditing && chapterToEdit) {
      updateChapter(chapterToEdit.id, { name }); // Pass ID and data separately
    } else if (actId) {
      addChapterToAct(actId, { name });
    }
    resetForm();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Chapter' : 'Create New Chapter'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the name for this chapter.' : `Add a new chapter to ${actId ? 'the act' : 'the plan'}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="chapter-name" className="text-right">Name*</Label>
            <Input id="chapter-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Chapter 1: The Discovery" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
            {isEditing ? 'Save Changes' : 'Create Chapter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChapterFormModal;
