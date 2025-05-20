import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const FullscreenTextareaEditModal = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
  title,
  textareaId,
}) => {
  const { t } = useTranslation();
  const [currentValue, setCurrentValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setCurrentValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    onSave(currentValue);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="w-[95vw] h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title || t('fullscreen_textarea_edit_modal_default_title', 'Edit Text')}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow flex flex-col py-2">
          {textareaId && <Label htmlFor={textareaId} className="sr-only">{title}</Label>}
          <Textarea
            id={textareaId}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="flex-grow resize-none w-full h-full text-base"
            placeholder={t('fullscreen_textarea_edit_modal_placeholder', 'Enter your text here...')}
            autoFocus
          />
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleCancel}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
