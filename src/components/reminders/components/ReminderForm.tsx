
import React, { useState, useEffect } from "react";
import { Reminder } from "@/utils/supabase";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client"; // Use the correct client import
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlarmPlus, ImagePlus, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
    image_url: currentReminder?.image_url || "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes or current reminder changes
  useEffect(() => {
    if (currentReminder) {
      setFormData({
        medicine_name: currentReminder.medicine_name,
        dosage: currentReminder.dosage || "",
        frequency: currentReminder.frequency,
        time: currentReminder.time,
        notes: currentReminder.notes || "",
        image_url: currentReminder.image_url || "",
      });
      setImagePreview(currentReminder.image_url || null);
    } else {
      setFormData({
        medicine_name: "",
        dosage: "",
        frequency: "daily",
        time: "",
        notes: "",
        image_url: "",
      });
      setImagePreview(null);
    }
    setImageFile(null);
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

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Remove image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: "" }));
  };

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user!.id}/${fileName}`;
      
      // Create medicine-images bucket if it doesn't exist
      try {
        const { data: bucketData, error: bucketError } = await supabase.storage
          .getBucket('medicine-images');
        
        if (bucketError && bucketError.message.includes('not found')) {
          await supabase.storage.createBucket('medicine-images', {
            public: true,
          });
        }
      } catch (error) {
        console.log("Bucket already exists or created previously");
      }
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('medicine-images')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage
        .from('medicine-images')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      throw new Error(error.message || "Error uploading image");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to save reminders");
      return;
    }
    
    if (!formData.medicine_name || !formData.time) {
      toast.error("Medicine name and time are required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let imageUrl = formData.image_url;
      
      // Upload image if provided
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
        } catch (error: any) {
          toast.error(error.message || "Failed to upload image");
          setIsSubmitting(false);
          return;
        }
      }
      
      if (currentReminder) {
        // Update existing reminder
        const { error } = await supabase
          .from("reminders")
          .update({
            ...formData,
            image_url: imageUrl,
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
            image_url: imageUrl,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
        
        toast.success("Reminder added successfully");
        
        // Schedule this immediately if needed
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const [hours, minutes] = formData.time.split(':').map(Number);
          const reminderTime = new Date();
          reminderTime.setHours(hours, minutes, 0, 0);
          
          if (reminderTime > new Date()) {
            try {
              navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_NOTIFICATION',
                payload: {
                  id: Math.random().toString(36).substring(2, 15),
                  title: `Medicine Reminder: ${formData.medicine_name}`,
                  body: formData.dosage ? `Dosage: ${formData.dosage}` : "Time to take your medicine",
                  time: reminderTime.getTime() - Date.now(),
                  medicine: formData.medicine_name,
                  dosage: formData.dosage,
                  frequency: formData.frequency
                }
              });
            } catch (e) {
              console.error("Failed to schedule notification:", e);
            }
          }
        }
      }
      
      // Close dialog and refresh reminders
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving reminder:", error);
      toast.error(currentReminder 
        ? "Failed to update reminder. Please try again." 
        : "Failed to add reminder. Please try again.");
    } finally {
      setIsSubmitting(false);
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
            <Label className="form-label">Medicine Image</Label>
            <div className="mt-1 flex items-center">
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                  <img
                    src={imagePreview}
                    alt="Medicine preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-md border-gray-300 cursor-pointer hover:border-primary transition-colors">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="mt-1 text-xs text-muted-foreground">Add Image</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
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
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {(isUploading || isSubmitting) 
                ? (isUploading ? "Uploading..." : "Saving...") 
                : (currentReminder ? "Update Reminder" : "Add Reminder")}
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
