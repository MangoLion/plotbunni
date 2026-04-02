import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, Database, Rocket } from "lucide-react";

/**
 * ChangeLogModal Component
 * Shows what's new in the current version of the application.
 * Features a 'Don't show this again' checkbox.
 */
const ChangeLogModal = ({ isOpen, onOpenChange, version, onDontShowAgain }) => {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  const handleOpenChange = (open) => {
    if (!open && dontShowAgain) {
      onDontShowAgain(version);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] sm:max-h-[85vh] flex flex-col border-none shadow-2xl bg-gradient-to-br from-background to-muted/30 p-4 sm:p-6">
        <DialogHeader className="space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <Rocket className="h-6 w-6 animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-wider opacity-70">New Update</span>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            What's New in v{version}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            We've been busy adding new features to help you write better stories!
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 flex-grow overflow-y-auto space-y-3 pr-2 -mr-2">
          <div className="group flex gap-3 p-3 rounded-xl transition-colors hover:bg-primary/5">
            <div className="flex-shrink-0 mt-1">
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">AI Horde Integration</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Select from 50+ free LLM models via the volunteer network! 
                <span className="block mt-1 font-medium text-primary/80 italic">Enable in AI Endpoint settings to start.</span>
              </p>
            </div>
          </div>

          <div className="group flex gap-3 p-3 rounded-xl transition-colors hover:bg-primary/5">
            <div className="flex-shrink-0 mt-1">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                <Save className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Prompt Manager</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Save and load your favorite task prompts. Never lose a great prompt again!
              </p>
            </div>
          </div>

          <div className="group flex gap-3 p-3 rounded-xl transition-colors hover:bg-primary/5">
            <div className="flex-shrink-0 mt-1">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                <Database className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Optimized Storage</h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Faster novel data loading and saving. Your writing experience is now smoother than ever.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 sm:gap-0 mt-2 border-t pt-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dont-show-again" 
              checked={dontShowAgain}
              onCheckedChange={setDontShowAgain}
            />
            <Label 
              htmlFor="dont-show-again"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Don't show this again for this version
            </Label>
          </div>
          <Button onClick={() => handleOpenChange(false)} className="px-8 font-bold shadow-lg hover:shadow-primary/20 transition-all">
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeLogModal;
