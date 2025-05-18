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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from '@/context/DataContext';

const ActFormModal = ({ open, onOpenChange, actToEdit }) => {
  const { t } = useTranslation();
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
          <DialogTitle>{isEditing ? t('act_form_modal_title_edit') : t('act_form_modal_title_create')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('act_form_modal_desc_edit') : t('act_form_modal_desc_create')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="act-name" className="text-right">{t('act_form_modal_label_name')}</Label>
            <Input id="act-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder={t('act_form_modal_placeholder_name')} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
            {isEditing ? t('save_changes_button') : t('act_form_modal_button_create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActFormModal;
