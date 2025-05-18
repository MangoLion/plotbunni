import React, { useState } from 'react';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { PlusCircle, Edit2, Trash2, ShieldCheck, FileText } from 'lucide-react';
import { useData } from '@/context/DataContext';
import TemplateFormModal from './TemplateFormModal';
import ConfirmModal from '@/components/ui/ConfirmModal'; // For delete confirmation

const ManageTemplatesModal = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { conceptTemplates, addConceptTemplate, updateConceptTemplate, deleteConceptTemplate } = useData();
  const [isTemplateFormModalOpen, setIsTemplateFormModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);

  const handleAddNewTemplate = () => {
    setTemplateToEdit(null);
    setIsTemplateFormModalOpen(true);
  };

  const handleEditTemplate = (template) => {
    setTemplateToEdit(template);
    setIsTemplateFormModalOpen(true);
  };

  const handleDeleteTemplate = (template) => {
    // if (template.isDefault) {
    //   // Optionally, prevent deletion of default templates or show a different message
    //   alert("Default templates cannot be deleted directly. You can create a new one based on it if needed.");
    //   return;
    // }
    setTemplateToDelete(template);
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      deleteConceptTemplate(templateToDelete.id);
    }
    setIsConfirmDeleteModalOpen(false);
    setTemplateToDelete(null);
  };

  const handleSaveTemplate = (templateData) => {
    if (templateToEdit) {
      updateConceptTemplate({ ...templateToEdit, ...templateData });
    } else {
      addConceptTemplate(templateData);
    }
    setIsTemplateFormModalOpen(false);
    setTemplateToEdit(null);
  };
  
  const getTemplateFieldsSummary = (templateData) => {
    const fields = [];
    if (templateData.name) fields.push(t('manage_concept_templates_field_summary_name', { name: templateData.name }));
    if (templateData.aliases && templateData.aliases.length > 0) fields.push(t('manage_concept_templates_field_summary_aliases', { aliases: templateData.aliases.join(', ') }));
    if (templateData.tags && templateData.tags.length > 0) fields.push(t('manage_concept_templates_field_summary_tags', { tags: templateData.tags.join(', ') }));
    if (templateData.description) fields.push(t('manage_concept_templates_field_summary_description', { description: templateData.description.substring(0, 30) }));
    if (templateData.notes) fields.push(t('manage_concept_templates_field_summary_notes', { notes: templateData.notes.substring(0, 20) }));
    if (templateData.priority) fields.push(t('manage_concept_templates_field_summary_priority', { priority: templateData.priority }));
    if (templateData.image) fields.push(t('manage_concept_templates_field_summary_image_yes'));
    return fields.length > 0 ? fields.join('; ') : t('manage_concept_templates_field_summary_no_fields');
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('manage_concept_templates_title')}</DialogTitle>
            <DialogDescription>
              {t('manage_concept_templates_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Button onClick={handleAddNewTemplate} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" /> {t('manage_concept_templates_add_new_button')}
            </Button>
          </div>
          <ScrollArea className="h-[50vh] pr-3">
            {conceptTemplates && conceptTemplates.length > 0 ? (
              conceptTemplates.map(template => (
                <Card key={template.id} className="mb-3 shadow-sm">
                  <CardHeader className="p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        {template.isDefault ? (
                          <ShieldCheck className="h-4 w-4 mr-2 text-blue-500" titleAccess={t('manage_concept_templates_default_template_tooltip')} />
                        ) : (
                          <FileText className="h-4 w-4 mr-2 text-gray-500" titleAccess={t('manage_concept_templates_custom_template_tooltip')} />
                        )}
                        <CardTitle className="text-md font-medium">{template.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="iconSm" onClick={() => handleEditTemplate(template)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                          <Button variant="ghost" size="iconSm" onClick={() => handleDeleteTemplate(template)} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 text-xs">
                    <p className="text-slate-600 line-clamp-2">
                      {t('manage_concept_templates_fields_prefix')}{getTemplateFieldsSummary(template.templateData)}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-center text-slate-500 py-8">{t('manage_concept_templates_no_templates_message')}</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">{t('manage_concept_templates_close_button')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateFormModal
        open={isTemplateFormModalOpen}
        onOpenChange={setIsTemplateFormModalOpen}
        templateToEdit={templateToEdit}
        onSave={handleSaveTemplate}
      />

      <ConfirmModal
        open={isConfirmDeleteModalOpen}
        onOpenChange={setIsConfirmDeleteModalOpen}
        title={t('manage_concept_templates_delete_confirm_title')}
        description={t('manage_concept_templates_delete_confirm_description', { templateName: templateToDelete?.name })}
        onConfirm={confirmDeleteTemplate}
      />
    </>
  );
};

export default ManageTemplatesModal;
