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

const ActFormModal = ({ open, onOpenChange, actToEdit }) => {
  const { addAct, updateAct } = useData();
  const [name, setName] = useState('');
  const isEditing = Boolean(actToEdit);

  useEffect(() => {
    if (open) {
      if (isEditing && actToEdit) {
        setName(actToEdit.name || '');
      } else {
        setName('');
      }
    }
  }, [actToEdit, isEditing, open]);

  const resetForm = () => setName('');

  const handleSubmit = () => {
    if (isEditing && actToEdit) {
      updateAct(actToEdit.id, { name }); // Pass ID and data separately
    } else {
      addAct({ name });
    }
    resetForm();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Act' : 'Create New Act'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the name for this act.' : 'Enter the name for the new act.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="act-name" className="text-right">Name*</Label>
            <Input id="act-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Act I: The Inciting Incident" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
            {isEditing ? 'Save Changes' : 'Create Act'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActFormModal;
