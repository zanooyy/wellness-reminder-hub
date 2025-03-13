
import React from "react";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { notificationSounds } from "../hooks/useReminderSounds";

interface NotificationSettingsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedSound: string;
  soundEnabled: boolean;
  onSelectSound: (soundId: string) => void;
  onToggleSound: (enabled: boolean) => void;
  onTestSound: () => void;
}

export function NotificationSettingsDialog({
  open,
  setOpen,
  selectedSound,
  soundEnabled,
  onSelectSound,
  onToggleSound,
  onTestSound
}: NotificationSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <Settings className="h-4 w-4" />
          <span>Sound Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Notification Sound Settings</DialogTitle>
          <DialogDescription>
            Choose a sound for your medicine reminders
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup 
            value={selectedSound} 
            onValueChange={onSelectSound}
            className="space-y-3"
          >
            {notificationSounds.map((sound) => (
              <div key={sound.id} className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={sound.id} id={sound.id} />
                  <Label htmlFor={sound.id} className="font-medium cursor-pointer">
                    {sound.name}
                  </Label>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    const audio = new Audio(sound.url);
                    audio.play().catch(err => console.error("Error playing sound:", err));
                  }}
                >
                  Test
                </Button>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <Switch 
              checked={soundEnabled}
              onCheckedChange={onToggleSound}
              id="sound-enabled"
            />
            <Label htmlFor="sound-enabled">Enable sounds</Label>
          </div>
          
          <Button 
            onClick={() => {
              // Save sound preferences
              localStorage.setItem('reminderSound', selectedSound);
              localStorage.setItem('soundEnabled', soundEnabled.toString());
              setOpen(false);
              toast.success("Sound settings saved");
            }}
          >
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
