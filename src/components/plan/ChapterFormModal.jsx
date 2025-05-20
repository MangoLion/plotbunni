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

const ChapterFormModal = ({ open, onOpenChange, chapterToEdit, actId }) => {
  const { t } = useTranslation();
  const { addChapterToAct, updateChapter, deleteChapter } = useData(); // Add deleteChapter
  const [name, setName] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false); // State for confirm modal
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
      updateChapter(chapterToEdit.id, { name });
    } else if (actId) {
      addChapterToAct(actId, { name });
    }
    resetForm();
    onOpenChange(false);
  };

  const handleDeleteChapter = () => {
    if (chapterToEdit && actId) { // Ensure actId is available for deletion context
      deleteChapter(chapterToEdit.id, actId);
      resetForm();
      onOpenChange(false); // Close main modal
      setIsConfirmDeleteOpen(false); // Close confirm modal
    } else if (chapterToEdit) {
        // Fallback if actId is somehow not passed during edit (should not happen with current PlanView structure)
        console.warn("Attempting to delete chapter without parent actId. This might lead to orphaned data if not handled by deleteChapter globally.");
        deleteChapter(chapterToEdit.id, null); // Or handle as an error
        resetForm();
        onOpenChange(false);
        setIsConfirmDeleteOpen(false);
    }
  };

  useEffect(() => {
    if (!open) {
      resetForm();
      setIsConfirmDeleteOpen(false);
    }
  }, [open]);

  return (
    <>
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
          <DialogFooter className="flex justify-between w-full">
            <div>
              {isEditing && chapterToEdit && actId && ( // Ensure chapterToEdit and actId exist for delete button
                <Button type="button" variant="destructive" size="icon" onClick={() => setIsConfirmDeleteOpen(true)} className="mr-auto" title={t('tooltip_delete_chapter')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild><Button type="button" variant="outline">{t('cancel')}</Button></DialogClose>
              <Button type="submit" onClick={handleSubmit} disabled={!name.trim()}>
                {isEditing ? t('save_changes_button') : t('chapter_form_modal_button_create')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {chapterToEdit && (
        <ConfirmModal
          open={isConfirmDeleteOpen}
          onOpenChange={setIsConfirmDeleteOpen}
          title={t('chapter_form_modal_confirm_delete_title')}
          description={t('chapter_form_modal_confirm_delete_description', { chapterName: chapterToEdit.name })}
          onConfirm={handleDeleteChapter}
        />
      )}
    </>
  );
};

export default ChapterFormModal;
