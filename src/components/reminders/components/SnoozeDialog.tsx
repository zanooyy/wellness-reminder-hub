
import React, { useState } from "react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { AlarmClock, Clock } from "lucide-react";

interface SnoozeDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  reminderName: string;
  onSnooze: (minutes: number) => void;
}

export function SnoozeDialog({ 
  open, 
  setOpen, 
  reminderName, 
  onSnooze 
}: SnoozeDialogProps) {
  const [snoozeTime, setSnoozeTime] = useState<number>(5);
  const [customTime, setCustomTime] = useState<number>(15);
  const [selectedOption, setSelectedOption] = useState<"preset" | "custom">("preset");

  const handleSnooze = () => {
    const minutes = selectedOption === "preset" ? snoozeTime : customTime;
    onSnooze(minutes);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-primary" />
            Snooze Reminder
          </DialogTitle>
          <DialogDescription>
            Snooze the reminder for {reminderName} until later
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <RadioGroup 
            value={selectedOption} 
            onValueChange={(value) => setSelectedOption(value as "preset" | "custom")}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <Radio value="preset" id="preset" />
              <Label htmlFor="preset" className="cursor-pointer">Common snooze times</Label>
            </div>
            
            {selectedOption === "preset" && (
              <div className="grid grid-cols-3 gap-2 ml-6 mt-2">
                {[5, 10, 15, 30, 60, 120].map((minutes) => (
                  <Button
                    key={minutes}
                    type="button"
                    variant={snoozeTime === minutes ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSnoozeTime(minutes)}
                    className="flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {minutes} min
                  </Button>
                ))}
              </div>
            )}
            
            <Separator className="my-2" />
            
            <div className="flex items-center space-x-2">
              <Radio value="custom" id="custom" />
              <Label htmlFor="custom" className="cursor-pointer">Custom time</Label>
            </div>
            
            {selectedOption === "custom" && (
              <div className="flex items-center gap-2 ml-6 mt-2">
                <Input
                  type="number"
                  min="1"
                  max="1440"
                  value={customTime}
                  onChange={(e) => setCustomTime(parseInt(e.target.value) || 15)}
                  className="w-24"
                />
                <Label>minutes</Label>
              </div>
            )}
          </RadioGroup>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSnooze}
          >
            Snooze Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
