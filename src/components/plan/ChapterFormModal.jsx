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

const ChapterFormModal = ({ open, onOpenChange, chapterToEdit, actId }) => {
  const { t } = useTranslation();
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
      console.error(t('chapter_form_modal_error_act_id_required'));
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
          <DialogTitle>{isEditing ? t('chapter_form_modal_title_edit') : t('chapter_form_modal_title_create')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('chapter_form_modal_desc_edit') : (actId ? t('chapter_form_modal_desc_create_to_act') : t('chapter_form_modal_desc_create_to_plan'))}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="chapter-name" className="text-right">{t('chapter_form_modal_label_name')}</Label>
            <Input id="chapter-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder={t('chapter_form_modal_placeholder_name')} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
            {isEditing ? t('save_changes_button') : t('chapter_form_modal_button_create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChapterFormModal;
