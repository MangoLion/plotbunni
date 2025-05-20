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
import ConfirmModal from '@/components/ui/ConfirmModal'; // Import ConfirmModal
import { Trash2 } from 'lucide-react'; // Import Trash2 icon

const ActFormModal = ({ open, onOpenChange, actToEdit }) => {
  const { t } = useTranslation();
  const { addAct, updateAct, deleteAct } = useData(); // Add deleteAct
  const [name, setName] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false); // State for confirm modal
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
      updateAct(actToEdit.id, { name });
    } else {
      addAct({ name });
    }
    resetForm();
    onOpenChange(false);
  };

  const handleDeleteAct = () => {
    if (actToEdit) {
      deleteAct(actToEdit.id);
      resetForm();
      onOpenChange(false); // Close main modal
      setIsConfirmDeleteOpen(false); // Close confirm modal
    }
  };

  useEffect(() => {
    if (!open) {
      resetForm();
      setIsConfirmDeleteOpen(false); // Ensure confirm modal is closed when main modal closes
    }
  }, [open]);

  return (
    <>
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
          <DialogFooter className="flex justify-between w-full">
            <div className="flex items-center gap-2">
              {isEditing && (
                <Button type="button" variant="destructive" size="icon" onClick={() => setIsConfirmDeleteOpen(true)} title={t('tooltip_delete_act')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-grow"></div>
              <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
              <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
                {isEditing ? t('save_changes_button') : t('act_form_modal_button_create')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {actToEdit && (
        <ConfirmModal
          open={isConfirmDeleteOpen}
          onOpenChange={setIsConfirmDeleteOpen}
          title={t('act_form_modal_confirm_delete_title')}
          description={t('act_form_modal_confirm_delete_description', { actName: actToEdit.name })}
          onConfirm={handleDeleteAct}
        />
      )}
    </>
  );
};

export default ActFormModal;
