import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // Label might still be used for other parts
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Select might still be used
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch"; // Added Switch
import { Brain, EyeOff, Trash2, PlusCircle, Edit, Palette, Cloud, FileText } from 'lucide-react'; // Added Brain, EyeOff
import { useSettings } from '@/context/SettingsContext';
import EndpointProfileFormModal from './EndpointProfileFormModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ThemeEditor } from './ThemeEditor';
import FontSettingsControl from './FontSettingsControl'; // Import the new component

const SettingsView = () => {
  const { t } = useTranslation();
  const {
    endpointProfiles,
    activeProfileId,
    selectProfile,
    addProfile,
    removeProfile,
    getActiveProfile,
    isLoaded,
    // Font settings are now handled by FontSettingsControl, but useSettings still provides them
    // Task settings
    TASK_KEYS,
    taskSettings,
    updateTaskSetting,
    resetAllTaskPrompts, // Added
    // System Prompt
    systemPrompt,
    setSystemPrompt,
    // AI Features Toggle
    showAiFeatures,
    toggleAiFeatures,
  } = useSettings();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);
  const [isConfirmResetPromptsOpen, setIsConfirmResetPromptsOpen] = useState(false); // New state for reset prompts confirmation

  const handleEditClick = (profile) => {
    setProfileToEdit(profile);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (profile) => {
    setProfileToDelete(profile);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (profileToDelete) {
      removeProfile(profileToDelete.id);
    }
    setIsConfirmDeleteOpen(false);
    setProfileToDelete(null);
  };

  const activeProfile = getActiveProfile(); // Get the currently selected profile details

  // Helper to format task keys into readable names
  const formatTaskKey = (key) => {
    if (!key) return t('settings_unknown_task');
    const words = key.replace(/([A-Z])/g, ' $1').split(' ');
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (!isLoaded || !taskSettings) { // Check taskSettings too
    return <div>{t('settings_loading_message')}</div>; // Or a spinner component
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] p-6">
      <div className="space-y-8">
        <h1 className="text-3xl font-bold mb-6">{t('settings_page_title')}</h1>

        <Tabs defaultValue="appearance" className="w-full"> {/* Changed default value */}
          <TabsList className="grid w-full grid-cols-3"> {/* Updated grid-cols */}
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('settings_tab_appearance')}
            </TabsTrigger>
            {showAiFeatures && (
              <>
                <TabsTrigger value="aiEndpoints" className="flex items-center gap-2"> {/* Renamed for clarity */}
                  <Cloud className="h-4 w-4" />
                  {t('settings_tab_ai_endpoints')}
                </TabsTrigger>
                <TabsTrigger value="taskPrompts" className="flex items-center gap-2"> {/* New Tab */}
                  <FileText className="h-4 w-4" />
                  {t('settings_tab_task_prompts')}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="appearance" className="mt-6">
            <div className="space-y-6">
              <ThemeEditor />
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings_font_settings_title')}</CardTitle>
                  <CardDescription>{t('settings_font_settings_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <FontSettingsControl />
                </CardContent>
              </Card>
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings_ai_features_title')}</CardTitle>
                  <CardDescription>{t('settings_ai_features_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="ai-features-toggle" className="flex flex-col space-y-1">
                      <span>{t('settings_ai_features_toggle_label')}</span>
                      <span className="font-normal leading-snug text-muted-foreground">
                        {t('settings_ai_features_toggle_description')}
                      </span>
                    </Label>
                    <Switch
                      id="ai-features-toggle"
                      checked={showAiFeatures}
                      onCheckedChange={toggleAiFeatures}
                      aria-label={t('settings_ai_features_toggle_aria_label')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="aiEndpoints" className="mt-6"> {/* Renamed for clarity */}
            {showAiFeatures ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings_ai_endpoint_config_title')}</CardTitle>
                  <CardDescription>{t('settings_ai_endpoint_config_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Selection Dropdown */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="profileSelect" className="whitespace-nowrap">{t('settings_active_profile_label')}</Label>
                    <Select value={activeProfileId || ''} onValueChange={selectProfile}>
                      <SelectTrigger id="profileSelect" className="flex-grow">
                        <SelectValue placeholder={t('settings_select_profile_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {endpointProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={addProfile} title={t('settings_add_new_profile_tooltip')}>
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                    {activeProfile && (
                      <>
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(activeProfile)} title={t('settings_edit_profile_tooltip')}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClick(activeProfile)}
                          title={t('settings_delete_profile_tooltip')}
                          disabled={endpointProfiles.length <= 1} // Disable delete if only one profile left
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Display Selected Profile Details (Read-only view) */}
                  {activeProfile ? (
                    <div className="border p-4 rounded-md space-y-3 bg-muted/40">
                      <h4 className="font-semibold text-md mb-2">{t('settings_profile_details_title_prefix')}{activeProfile.name}</h4>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <span className="font-medium col-span-1">{t('settings_profile_use_custom_label')}</span>
                        <span className="col-span-2">{activeProfile.useCustomEndpoint ? t('common_yes') : t('common_no')}</span>

                        <span className="font-medium col-span-1">{t('settings_profile_endpoint_url_label')}</span>
                        <span className="col-span-2 break-all">{activeProfile.endpointUrl}</span>

                        <span className="font-medium col-span-1">{t('settings_profile_api_token_label')}</span>
                        <span className="col-span-2">{activeProfile.apiToken ? '********' : t('settings_profile_api_token_not_set')}</span>

                        <span className="font-medium col-span-1">{t('settings_profile_model_name_label')}</span>
                        <span className="col-span-2 break-all">{activeProfile.modelName}</span>

                        <span className="font-medium col-span-1">{t('settings_profile_context_tokens_label')}</span>
                        <span className="col-span-2">{activeProfile.contextLength}</span>

                        <span className="font-medium col-span-1">{t('settings_profile_max_output_tokens_label')}</span>
                        <span className="col-span-2">{activeProfile.maxOutputTokens}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center">{t('settings_no_profile_selected_message')}</p>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* AI Feature Placeholders (Remain Non-Functional) */}
              <div>
                <h3 className="text-lg font-medium">{t('settings_ai_feature_placeholders_title')}</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>{t('settings_ai_feature_placeholder_chat')}</li>
                  <li>{t('settings_ai_feature_placeholder_scene_gen')}</li>
                  <li>{t('settings_ai_feature_placeholder_scene_summary')}</li>
                </ul>
              </div>
            </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center space-y-3 text-center">
                    <EyeOff className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {t('settings_ai_features_hidden_message')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* New Tab Content for Task Prompts */}
          <TabsContent value="taskPrompts" className="mt-6">
            {showAiFeatures ? (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t('settings_ai_prompts_title')}</CardTitle>
                    <CardDescription>{t('settings_ai_prompts_description')}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setIsConfirmResetPromptsOpen(true)}>{t('settings_reset_all_ai_prompts_button')}</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* System Prompt Textarea */}
                  <Card className="p-4">
                    <CardTitle className="text-lg mb-3">{t('settings_global_system_prompt_title')}</CardTitle>
                    <CardDescription className="mb-3">
                      {t('settings_global_system_prompt_description')}
                    </CardDescription>
                    <div>
                      <Label htmlFor="system-prompt" className="mb-1 block">{t('settings_system_prompt_label')}</Label>
                      <Textarea
                        id="system-prompt"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={8}
                        className="resize-y"
                        placeholder={t('settings_system_prompt_placeholder')}
                      />
                    </div>
                  </Card>

                  <Separator /> 
                  
                  <h3 className="text-xl font-semibold mt-6 mb-2">{t('settings_task_specific_prompts_title')}</h3>
                  {Object.values(TASK_KEYS).map((taskKey) => {
                    const taskSetting = taskSettings[taskKey];
                    if (!taskSetting) {
                      // This should ideally not happen if context initializes correctly
                      return <p key={taskKey}>{t('settings_task_config_missing_message', { taskName: formatTaskKey(taskKey) })}</p>;
                    }
                    return (
                      <Card key={taskKey} className="p-4">
                        <CardTitle className="text-lg mb-3">{formatTaskKey(taskKey)}</CardTitle>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`${taskKey}-profile`} className="mb-1 block">{t('settings_task_ai_endpoint_profile_label')}</Label>
                            <Select
                              value={taskSetting.profileId || ''}
                              onValueChange={(newProfileId) => updateTaskSetting(taskKey, 'profileId', newProfileId)}
                            >
                              <SelectTrigger id={`${taskKey}-profile`}>
                                <SelectValue placeholder={t('settings_select_profile_placeholder')} />
                              </SelectTrigger>
                              <SelectContent>
                                {endpointProfiles.map((profile) => (
                                  <SelectItem key={profile.id} value={profile.id}>
                                    {profile.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`${taskKey}-prompt`} className="mb-1 block">{t('settings_task_ai_prompt_label')}</Label>
                            <Textarea
                              id={`${taskKey}-prompt`}
                              value={taskSetting.prompt}
                              onChange={(e) => updateTaskSetting(taskKey, 'prompt', e.target.value)}
                              rows={6}
                              className="resize-y"
                              placeholder={t('settings_task_ai_prompt_placeholder', { taskName: formatTaskKey(taskKey)})}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center space-y-3 text-center">
                    <EyeOff className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {t('settings_ai_features_hidden_message')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals remain outside the Tabs structure */}
      <EndpointProfileFormModal
        profile={profileToEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setProfileToEdit(null); // Clear profile when closing
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={confirmDelete}
        title={t('settings_confirm_delete_profile_title')}
        description={t('settings_confirm_delete_profile_description', { profileName: profileToDelete?.name })}
      />

      {/* Confirmation Modal for Resetting All Prompts */}
      <ConfirmModal
        open={isConfirmResetPromptsOpen}
        onOpenChange={setIsConfirmResetPromptsOpen}
        title={t('settings_confirm_reset_prompts_title')}
        description={t('settings_confirm_reset_prompts_description')}
        onConfirm={resetAllTaskPrompts}
        confirmText={t('settings_confirm_reset_prompts_button')}
      />
    </ScrollArea>
  );
};

export default SettingsView;
