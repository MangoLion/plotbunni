import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings } from '@/context/SettingsContext'; // To access updateProfile and defaults

const EndpointProfileFormModal = ({ profile, isOpen, onClose }) => {
  const { updateProfile, DEFAULT_ENDPOINT_VALUES } = useSettings();
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      // Initialize form with a copy of the profile data when it changes or modal opens
      setFormData({ ...profile });
      setIsEditing(true);
    } else {
      // Reset form if no profile is provided (e.g., modal closed then reopened without a profile)
      setFormData({});
      setIsEditing(false);
    }
  }, [profile, isOpen]); // Re-initialize form based on profile and isOpen state

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    // Handle type conversion for numbers
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleCheckboxChange = (checked) => {
      const name = 'useCustomEndpoint';
      const newFormData = {
          ...formData,
          [name]: checked,
      };
       // If 'Use Custom Endpoint' is unchecked, immediately reset relevant fields to default
      if (!checked) {
          newFormData.endpointUrl = DEFAULT_ENDPOINT_VALUES.endpointUrl;
          newFormData.apiToken = DEFAULT_ENDPOINT_VALUES.apiToken;
          newFormData.modelName = DEFAULT_ENDPOINT_VALUES.modelName;
          newFormData.contextLength = DEFAULT_ENDPOINT_VALUES.contextLength;
          newFormData.maxOutputTokens = DEFAULT_ENDPOINT_VALUES.maxOutputTokens;
      }
      setFormData(newFormData);
  }

  const handleSave = () => {
    if (isEditing && profile) {
      // Ensure numeric fields are numbers, default to 0 if empty string or invalid
      const finalData = {
        ...formData,
        contextLength: Number(formData.contextLength) || 0,
        maxOutputTokens: Number(formData.maxOutputTokens) || 0,
      };
      updateProfile(profile.id, finalData);
    }
    onClose(); // Close modal after save
  };

  const handleReset = () => {
      // Reset form state to defaults, keeping id and name
      setFormData(prev => ({
          ...prev, // Keep existing id and name
          ...DEFAULT_ENDPOINT_VALUES,
          useCustomEndpoint: false,
      }));
  }

  // Don't render the modal content if it's not open or no profile is provided
  if (!isOpen || !profile) return null;

  const isCustom = formData.useCustomEndpoint;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Endpoint Profile</DialogTitle>
          <DialogDescription>
            Modify the details for the "{profile.name}" profile. Uncheck "Use Custom Endpoint" to reset to defaults.
          </DialogDescription>
        </DialogHeader>
        {/* Use grid gap-y-4 for vertical spacing between rows */}
        <div className="grid gap-y-4 py-4"> 
          {/* Profile Name - Row */}
          <div className="grid grid-cols-4 items-center gap-x-4"> {/* Use gap-x-4 for horizontal spacing */}
            <Label htmlFor="name" className="text-right col-span-1">Name</Label> {/* Explicit col-span */}
            <Input
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>

          {/* Use Custom Endpoint Checkbox - Row (Aligned Right) */}
          {/* Removed col-span-4, using flex justify-end on its own row */}
          <div className="flex items-center justify-end space-x-2 pr-4"> 
             <Checkbox
                id="useCustomEndpoint"
                name="useCustomEndpoint"
                checked={formData.useCustomEndpoint || false}
                onCheckedChange={handleCheckboxChange} // Use onCheckedChange for Shadcn Checkbox
            />
            <Label htmlFor="useCustomEndpoint" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Use Custom Endpoint
            </Label>
          </div>


          {/* Endpoint URL - Row */}
          <div className="grid grid-cols-4 items-center gap-x-4">
            <Label htmlFor="endpointUrl" className="text-right col-span-1">Endpoint URL</Label>
            <Input
              id="endpointUrl"
              name="endpointUrl"
              value={formData.endpointUrl || ''}
              onChange={handleChange}
              className="col-span-3"
              disabled={!isCustom}
            />
          </div>

          {/* API Token - Row */}
          <div className="grid grid-cols-4 items-center gap-x-4">
            <Label htmlFor="apiToken" className="text-right col-span-1">API Token</Label>
            <Input
              id="apiToken"
              name="apiToken"
              type="password"
              value={formData.apiToken || ''}
              onChange={handleChange}
              className="col-span-3"
              placeholder="Optional - Stored locally"
              disabled={!isCustom}
            />
          </div>

          {/* Model Name - Row */}
          <div className="grid grid-cols-4 items-center gap-x-4">
            <Label htmlFor="modelName" className="text-right col-span-1">Model Name</Label>
            <Input
              id="modelName"
              name="modelName"
              value={formData.modelName || ''}
              onChange={handleChange}
              className="col-span-3"
              disabled={!isCustom}
            />
          </div>

          {/* Context Length - Row */}
          <div className="grid grid-cols-4 items-center gap-x-4">
            <Label htmlFor="contextLength" className="text-right col-span-1">Context Tokens</Label>
            <Input
              id="contextLength"
              name="contextLength"
              type="number"
              value={formData.contextLength === undefined ? '' : formData.contextLength}
              onChange={handleChange}
              className="col-span-3"
              min="0" // Add min attribute for better UX
              disabled={!isCustom}
            />
          </div>

          {/* Max Output Tokens - Row */}
          <div className="grid grid-cols-4 items-center gap-x-4">
            <Label htmlFor="maxOutputTokens" className="text-right col-span-1">Max Output Tokens</Label>
            <Input
              id="maxOutputTokens"
              name="maxOutputTokens"
              type="number"
              value={formData.maxOutputTokens === undefined ? '' : formData.maxOutputTokens}
              onChange={handleChange}
              className="col-span-3"
              min="0" // Add min attribute
              disabled={!isCustom}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
           {/* Conditionally render Reset button only if custom is checked */}
           {isCustom ? (
             <Button type="button" variant="outline" onClick={handleReset}>
               Reset Custom Fields
             </Button>
           ) : (
             <div /> // Placeholder to keep layout consistent
           )}
           <div>
             <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
             </DialogClose>
             <Button type="button" onClick={handleSave}>Save Changes</Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EndpointProfileFormModal;
