import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // Label might still be used for other parts
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Select might still be used
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, PlusCircle, Edit, Palette, Cloud, FileText } from 'lucide-react'; // Removed AArrowUp, AArrowDown as they are in FontSettingsControl
import { useSettings } from '@/context/SettingsContext';
import EndpointProfileFormModal from './EndpointProfileFormModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ThemeEditor } from './ThemeEditor';
import FontSettingsControl from './FontSettingsControl'; // Import the new component

const SettingsView = () => {
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
    if (!key) return "Unknown Task";
    const words = key.replace(/([A-Z])/g, ' $1').split(' ');
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (!isLoaded || !taskSettings) { // Check taskSettings too
    return <div>Loading settings...</div>; // Or a spinner component
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] p-6">
      <div className="space-y-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="appearance" className="w-full"> {/* Changed default value */}
          <TabsList className="grid w-full grid-cols-3"> {/* Updated grid-cols */}
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="aiEndpoints" className="flex items-center gap-2"> {/* Renamed for clarity */}
              <Cloud className="h-4 w-4" />
              AI Endpoints
            </TabsTrigger>
            <TabsTrigger value="taskPrompts" className="flex items-center gap-2"> {/* New Tab */}
              <FileText className="h-4 w-4" />
              Task Prompts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="mt-6">
            <div className="space-y-6">
              <ThemeEditor />
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle>Font Settings</CardTitle>
                  <CardDescription>Customize the application's font family and base size.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FontSettingsControl />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="aiEndpoints" className="mt-6"> {/* Renamed for clarity */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Endpoint Configuration</CardTitle>
                  <CardDescription>Manage connection profiles for AI services.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Selection Dropdown */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="profileSelect" className="whitespace-nowrap">Active Profile:</Label>
                    <Select value={activeProfileId || ''} onValueChange={selectProfile}>
                      <SelectTrigger id="profileSelect" className="flex-grow">
                        <SelectValue placeholder="Select a profile..." />
                      </SelectTrigger>
                      <SelectContent>
                        {endpointProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={addProfile} title="Add New Profile">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                    {activeProfile && (
                      <>
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(activeProfile)} title="Edit Selected Profile">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClick(activeProfile)}
                          title="Delete Selected Profile"
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
                      <h4 className="font-semibold text-md mb-2">Profile: {activeProfile.name}</h4>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <span className="font-medium col-span-1">Use Custom:</span>
                        <span className="col-span-2">{activeProfile.useCustomEndpoint ? 'Yes' : 'No'}</span>

                        <span className="font-medium col-span-1">Endpoint URL:</span>
                        <span className="col-span-2 break-all">{activeProfile.endpointUrl}</span>

                        <span className="font-medium col-span-1">API Token:</span>
                        <span className="col-span-2">{activeProfile.apiToken ? '********' : '(Not set)'}</span>

                        <span className="font-medium col-span-1">Model Name:</span>
                        <span className="col-span-2 break-all">{activeProfile.modelName}</span>

                        <span className="font-medium col-span-1">Context Tokens:</span>
                        <span className="col-span-2">{activeProfile.contextLength}</span>

                        <span className="font-medium col-span-1">Max Output Tokens:</span>
                        <span className="col-span-2">{activeProfile.maxOutputTokens}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center">No profile selected or available. Please add one.</p>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* AI Feature Placeholders (Remain Non-Functional) */}
              <div>
                <h3 className="text-lg font-medium">AI Feature Placeholders (Non-Functional)</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>AI Chat for Brainstorming: (Coming Soon)</li>
                  <li>AI Scene Generation (Scene Beats): (Coming Soon)</li>
                  <li>AI Scene Summarization: (Coming Soon)</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* New Tab Content for Task Prompts */}
          <TabsContent value="taskPrompts" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>AI Prompts</CardTitle>
                    <CardDescription>Configure the AI profile and prompt for each automated task.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setIsConfirmResetPromptsOpen(true)}>Reset All AI Prompts</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* System Prompt Textarea */}
                  <Card className="p-4">
                    <CardTitle className="text-lg mb-3">Global System Prompt</CardTitle>
                    <CardDescription className="mb-3">
                      This prompt is sent to the AI before any task-specific prompt. Use it to set overall tone, persona, or provide global instructions.
                    </CardDescription>
                    <div>
                      <Label htmlFor="system-prompt" className="mb-1 block">System Prompt</Label>
                      <Textarea
                        id="system-prompt"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={8}
                        className="resize-y"
                        placeholder="e.g., You are a helpful assistant for a novelist. Be creative and encouraging."
                      />
                    </div>
                  </Card>

                  <Separator /> 
                  
                  <h3 className="text-xl font-semibold mt-6 mb-2">Task-Specific Prompts</h3>
                  {Object.values(TASK_KEYS).map((taskKey) => {
                    const taskSetting = taskSettings[taskKey];
                    if (!taskSetting) {
                      // This should ideally not happen if context initializes correctly
                      return <p key={taskKey}>Configuration for {formatTaskKey(taskKey)} is missing.</p>;
                    }
                    return (
                      <Card key={taskKey} className="p-4">
                        <CardTitle className="text-lg mb-3">{formatTaskKey(taskKey)}</CardTitle>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`${taskKey}-profile`} className="mb-1 block">AI Endpoint Profile</Label>
                            <Select
                              value={taskSetting.profileId || ''}
                              onValueChange={(newProfileId) => updateTaskSetting(taskKey, 'profileId', newProfileId)}
                            >
                              <SelectTrigger id={`${taskKey}-profile`}>
                                <SelectValue placeholder="Select a profile..." />
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
                            <Label htmlFor={`${taskKey}-prompt`} className="mb-1 block">AI Prompt</Label>
                            <Textarea
                              id={`${taskKey}-prompt`}
                              value={taskSetting.prompt}
                              onChange={(e) => updateTaskSetting(taskKey, 'prompt', e.target.value)}
                              rows={6}
                              className="resize-y"
                              placeholder={`Enter prompt for ${formatTaskKey(taskKey)}...`}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
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
        title="Confirm Deletion"
        description={`Are you sure you want to delete the profile "${profileToDelete?.name}"? This action cannot be undone.`}
      />

      {/* Confirmation Modal for Resetting All Prompts */}
      <ConfirmModal
        open={isConfirmResetPromptsOpen}
        onOpenChange={setIsConfirmResetPromptsOpen}
        title="Confirm Reset Prompts"
        description="Are you sure you want to reset all AI task prompts to their default values? This action cannot be undone."
        onConfirm={resetAllTaskPrompts}
        confirmText="Reset Prompts"
      />
    </ScrollArea>
  );
};

export default SettingsView;
