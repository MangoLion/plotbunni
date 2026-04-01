import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Trash2, ArrowDownToLine, BookMarked, Pencil, Check, X, Search, Save, List, PlusCircle } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

// ---------------------------------------------------------------------------
// Trigger button with popover menu (Save Current Prompt / View Saved Prompts)
// ---------------------------------------------------------------------------

export const PromptManagerTrigger = ({ currentPromptText, onViewSaved }) => {
  const { t } = useTranslation();
  const { savedPrompts, addSavedPrompt, updateSavedPrompt } = useSettings();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('menu'); // 'menu' | 'save'
  const [saveName, setSaveName] = useState('');
  // pendingOverride: set when a duplicate name is found; holds the existing prompt's id
  const [pendingOverride, setPendingOverride] = useState(null); // null | { existingId: string }

  const handleOpenChange = (v) => {
    setOpen(v);
    if (!v) {
      setMode('menu');
      setSaveName('');
    }
  };

  const handleSave = () => {
    if (!saveName.trim() || !currentPromptText?.trim()) return;
    const existing = savedPrompts.find(
      (p) => p.name.toLowerCase() === saveName.trim().toLowerCase()
    );
    if (existing) {
      setPendingOverride({ existingId: existing.id, name: saveName.trim() });
    } else {
      addSavedPrompt(saveName, currentPromptText);
      setOpen(false);
      setMode('menu');
      setSaveName('');
    }
  };

  const confirmOverride = () => {
    if (!pendingOverride) return;
    updateSavedPrompt(pendingOverride.existingId, { text: currentPromptText });
    setPendingOverride(null);
    setOpen(false);
    setMode('menu');
    setSaveName('');
  };

  const cancelOverride = () => {
    setPendingOverride(null);
    // Stay in 'save' mode so the user can rename
  };

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="absolute bottom-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
            title={t('prompt_manager_open_tooltip', 'Manage saved prompts')}
          >
            <BookMarked className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="end">
          {mode === 'menu' ? (
            <div className="flex flex-col">
              <button
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                onClick={() => setMode('save')}
                disabled={!currentPromptText?.trim()}
              >
                <Save className="h-4 w-4 shrink-0" />
                {t('prompt_manager_menu_save', 'Save Current Prompt')}
              </button>
              <button
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                onClick={() => { setOpen(false); onViewSaved(); }}
              >
                <List className="h-4 w-4 shrink-0" />
                {t('prompt_manager_menu_view', 'View Saved Prompts')}
              </button>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              <p className="text-xs text-muted-foreground">
                {t('prompt_manager_save_section_label', 'Save current prompt')}
              </p>
              <Input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t('prompt_manager_name_placeholder', 'Prompt name...')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setMode('menu');
                }}
                className="h-8 text-sm"
              />
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title={t('common_cancel', 'Cancel')}
                  onClick={() => setMode('menu')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  className="h-7 w-7"
                  title={t('common_save', 'Save')}
                  disabled={!saveName.trim()}
                  onClick={handleSave}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <ConfirmModal
        open={!!pendingOverride}
        onOpenChange={(v) => { if (!v) cancelOverride(); }}
        title={t('prompt_manager_override_title', 'Overwrite prompt?')}
        description={t('prompt_manager_override_description', `A prompt named "${pendingOverride?.name}" already exists. Replace its text with the current prompt?`)}
        onConfirm={confirmOverride}
        confirmText={t('prompt_manager_override_confirm', 'Overwrite')}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Main modal — browse, use, edit, delete saved prompts
// ---------------------------------------------------------------------------

const PromptManagerModal = ({ isOpen, onClose, onUsePrompt }) => {
  const { t } = useTranslation();
  const { savedPrompts, addSavedPrompt, deleteSavedPrompt, updateSavedPrompt } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editText, setEditText] = useState('');
  const [pendingNew, setPendingNew] = useState(null); // null | { name: string }
  // pendingOverride: set when commitNew finds a duplicate name
  const [pendingOverride, setPendingOverride] = useState(null); // null | { existingId: string }

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setEditingId(null);
      setPendingNew(null);
      setPendingOverride(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (pendingNew) {
      setEditName(pendingNew.name);
      setEditText('');
    }
  }, [pendingNew]);

  if (!isOpen) return null;

  const handleUse = (text) => {
    onUsePrompt(text);
    onClose();
  };

  const startEditing = (prompt) => {
    setEditingId(prompt.id);
    setEditName(prompt.name);
    setEditText(prompt.text);
  };

  const cancelEditing = () => setEditingId(null);

  const commitEdit = (id) => {
    if (!editName.trim() || !editText.trim()) return;
    updateSavedPrompt(id, { name: editName.trim(), text: editText.trim() });
    setEditingId(null);
  };

  const startNew = () => {
    setEditingId(null);
    setPendingNew({ name: searchQuery.trim() });
    setSearchQuery('');
  };

  const commitNew = () => {
    if (!editName.trim() || !editText.trim()) return;
    const existing = savedPrompts.find(
      (p) => p.name.toLowerCase() === editName.trim().toLowerCase()
    );
    if (existing) {
      setPendingOverride({ existingId: existing.id });
    } else {
      addSavedPrompt(editName, editText);
      setPendingNew(null);
    }
  };

  const confirmOverride = () => {
    if (!pendingOverride) return;
    updateSavedPrompt(pendingOverride.existingId, { text: editText.trim() });
    setPendingOverride(null);
    setPendingNew(null);
  };

  const cancelNew = () => setPendingNew(null);

  const filteredPrompts = savedPrompts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.text.toLowerCase().includes(q);
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[560px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5" />
              {t('prompt_manager_title', 'Prompt Manager')}
            </DialogTitle>
            <DialogDescription>
              {t('prompt_manager_description', 'Save and reuse prompts across tasks.')}
            </DialogDescription>
          </DialogHeader>

          {/* Search bar + new prompt button */}
          <div className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('prompt_manager_search_placeholder', 'Search prompts...')}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              type="button"
              title={t('prompt_manager_new_prompt_tooltip', 'New prompt')}
              onClick={startNew}
              disabled={!!pendingNew}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Saved prompts list */}
          <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
            {/* Pending new prompt row */}
            {pendingNew && (
              <div className="border rounded-md p-3 border-primary/50 bg-primary/5">
                <div className="space-y-2">
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t('prompt_manager_name_placeholder', 'Prompt name...')}
                  />
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="resize-y text-sm"
                    placeholder={t('prompt_manager_text_placeholder', 'Prompt text...')}
                  />
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={t('common_cancel', 'Cancel')}
                      onClick={cancelNew}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      title={t('common_save', 'Save')}
                      disabled={!editName.trim() || !editText.trim()}
                      onClick={commitNew}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {savedPrompts.length === 0 && !pendingNew ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('prompt_manager_empty_state', 'No saved prompts yet.')}
              </p>
            ) : !pendingNew && filteredPrompts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('prompt_manager_no_results', 'No prompts match your search.')}
              </p>
            ) : (
              filteredPrompts.map((prompt) => (
                <div key={prompt.id} className="border rounded-md p-3">
                  {editingId === prompt.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={t('prompt_manager_name_placeholder', 'Prompt name...')}
                      />
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        className="resize-y text-sm"
                      />
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={t('common_cancel', 'Cancel')}
                          onClick={cancelEditing}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          title={t('common_save', 'Save')}
                          disabled={!editName.trim() || !editText.trim()}
                          onClick={() => commitEdit(prompt.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{prompt.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {prompt.text}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          title={t('prompt_manager_use_button_tooltip', 'Use this prompt')}
                          onClick={() => handleUse(prompt.text)}
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={t('prompt_manager_edit_button_tooltip', 'Edit')}
                          onClick={() => startEditing(prompt)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title={t('prompt_manager_delete_button_tooltip', 'Delete')}
                          onClick={() => deleteSavedPrompt(prompt.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!pendingOverride}
        onOpenChange={(v) => { if (!v) setPendingOverride(null); }}
        title={t('prompt_manager_override_title', 'Overwrite prompt?')}
        description={t('prompt_manager_override_description', `A prompt named "${editName}" already exists. Replace its text?`)}
        onConfirm={confirmOverride}
        confirmText={t('prompt_manager_override_confirm', 'Overwrite')}
      />
    </>
  );
};

export default PromptManagerModal;
