
import React, { useState } from "react";
import { Reminder } from "@/utils/supabase";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlarmPlus } from "lucide-react";

interface ReminderFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentReminder: Reminder | null;
  onSuccess: () => void;
}

export function ReminderForm({ open, setOpen, currentReminder, onSuccess }: ReminderFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    medicine_name: currentReminder?.medicine_name || "",
    dosage: currentReminder?.dosage || "",
    frequency: currentReminder?.frequency || "daily",
    time: currentReminder?.time || "",
    notes: currentReminder?.notes || "",
  });

  // Reset form when dialog opens/closes or current reminder changes
  React.useEffect(() => {
    if (currentReminder) {
      setFormData({
        medicine_name: currentReminder.medicine_name,
        dosage: currentReminder.dosage || "",
        frequency: currentReminder.frequency,
        time: currentReminder.time,
        notes: currentReminder.notes || "",
      });
    } else {
      setFormData({
        medicine_name: "",
        dosage: "",
        frequency: "daily",
        time: "",
        notes: "",
      });
    }
  }, [currentReminder, open]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle frequency selection
  const handleFrequencyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, frequency: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!formData.medicine_name || !formData.time) {
      toast.error("Medicine name and time are required");
      return;
    }
    
    try {
      if (currentReminder) {
        // Update existing reminder
        const { error } = await supabase
          .from("reminders")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentReminder.id);

        if (error) throw error;
        
        toast.success("Reminder updated successfully");
      } else {
        // Create new reminder
        const { error } = await supabase
          .from("reminders")
          .insert({
            user_id: user.id,
            ...formData,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
        
        toast.success("Reminder added successfully");
      }
      
      // Close dialog and refresh reminders
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving reminder:", error);
      toast.error(currentReminder ? "Failed to update reminder" : "Failed to add reminder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentReminder ? "Edit Reminder" : "Add Reminder"}</DialogTitle>
          <DialogDescription>
            {currentReminder
              ? "Update your medicine reminder details."
              : "Create a new medicine reminder."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-input-wrapper">
            <Label htmlFor="medicine_name" className="form-label">
              Medicine Name
            </Label>
            <Input
              id="medicine_name"
              name="medicine_name"
              placeholder="e.g., Aspirin"
              value={formData.medicine_name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-input-wrapper">
            <Label htmlFor="dosage" className="form-label">
              Dosage
            </Label>
            <Input
              id="dosage"
              name="dosage"
              placeholder="e.g., 500mg, 1 tablet"
              value={formData.dosage}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-input-wrapper">
            <Label htmlFor="frequency" className="form-label">
              Frequency
            </Label>
            <Select
              value={formData.frequency}
              onValueChange={handleFrequencyChange}
            >
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="as-needed">As Needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="form-input-wrapper">
            <Label htmlFor="time" className="form-label">
              Time
            </Label>
            <Input
              id="time"
              name="time"
              type="time"
              value={formData.time}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-input-wrapper">
            <Label htmlFor="notes" className="form-label">
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional instructions or notes..."
              value={formData.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {currentReminder ? "Update Reminder" : "Add Reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddReminderButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <AlarmPlus className="mr-2 h-4 w-4" />
      Add Reminder
    </Button>
  );
}
