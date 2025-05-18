import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'; // Assuming this is the correct path
import { useTranslation } from 'react-i18next';

const ConfirmModal = ({ open, onOpenChange, title, description, onConfirm, confirmText, cancelText }) => {
  const { t } = useTranslation();
  if (!open) return null;

  const finalConfirmText = confirmText || t('confirm');
  const finalCancelText = cancelText || t('cancel');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>{finalCancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}>
            {finalConfirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmModal;
