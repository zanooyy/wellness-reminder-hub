
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Reminder } from "@/utils/supabase";
import { toast } from "sonner";
import { 
  AlarmClockCheck, AlarmPlus, Clock, Pill, Trash, Edit, AlertCircle, Calendar, MoveHorizontal
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export function MedicineReminder() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [formData, setFormData] = useState({
    medicine_name: "",
    dosage: "",
    frequency: "daily",
    time: "",
    notes: "",
  });

  // Fetch reminders on component mount
  useEffect(() => {
    if (!user) return;
    
    fetchReminders();
  }, [user]);

  // Fetch reminders from Supabase
  const fetchReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user?.id)
        .order("time", { ascending: true });

      if (error) throw error;
      
      setReminders(data || []);
    } catch (error: any) {
      console.error("Error fetching reminders:", error);
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

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

  // Reset form data
  const resetForm = () => {
    setFormData({
      medicine_name: "",
      dosage: "",
      frequency: "daily",
      time: "",
      notes: "",
    });
    setCurrentReminder(null);
  };

  // Open dialog to edit a reminder
  const openEditDialog = (reminder: Reminder) => {
    setCurrentReminder(reminder);
    setFormData({
      medicine_name: reminder.medicine_name,
      dosage: reminder.dosage || "",
      frequency: reminder.frequency,
      time: reminder.time,
      notes: reminder.notes || "",
    });
    setOpenDialog(true);
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
      setOpenDialog(false);
      resetForm();
      fetchReminders();
    } catch (error: any) {
      console.error("Error saving reminder:", error);
      toast.error(currentReminder ? "Failed to update reminder" : "Failed to add reminder");
    }
  };

  // Delete a reminder
  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setReminders(reminders.filter(reminder => reminder.id !== id));
      toast.success("Reminder deleted successfully");
    } catch (error: any) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder");
    }
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    try {
      // Assuming timeString is in HH:MM format
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch (error) {
      return timeString;
    }
  };

  // Render frequency badge
  const renderFrequencyBadge = (frequency: string) => {
    const getColor = () => {
      switch (frequency) {
        case 'daily': return 'bg-blue-100 text-blue-700';
        case 'weekly': return 'bg-purple-100 text-purple-700';
        case 'monthly': return 'bg-amber-100 text-amber-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getColor()}`}>
        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Medicine Reminders</h1>
          <p className="text-muted-foreground">
            Set reminders for your medications to never miss a dose
          </p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setOpenDialog(true);
              }}
            >
              <AlarmPlus className="mr-2 h-4 w-4" />
              Add Reminder
            </Button>
          </DialogTrigger>
          
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
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {currentReminder ? "Update Reminder" : "Add Reminder"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-primary">Loading reminders...</div>
        </div>
      ) : reminders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <AlarmClockCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No reminders yet</CardTitle>
            <CardDescription className="max-w-md mb-4">
              Create your first medicine reminder to stay on top of your medication schedule.
            </CardDescription>
            <Button
              onClick={() => {
                resetForm();
                setOpenDialog(true);
              }}
            >
              <AlarmPlus className="mr-2 h-4 w-4" />
              Add Your First Reminder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map((reminder) => (
            <Card key={reminder.id} className="overflow-hidden animate-scale-in card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between">
                  <div className="flex items-center">
                    <Pill className="h-5 w-5 mr-2 text-primary" />
                    <span className="truncate">{reminder.medicine_name}</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(reminder)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                
                {reminder.dosage && (
                  <CardDescription className="mt-1 flex items-center">
                    <MoveHorizontal className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {reminder.dosage}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-sm font-medium">
                    <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
                    {formatTime(reminder.time)}
                  </div>
                  
                  <div>{renderFrequencyBadge(reminder.frequency)}</div>
                </div>
                
                {reminder.notes && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <div className="flex items-start">
                      <AlertCircle className="h-4 w-4 mr-1.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{reminder.notes}</span>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-1 text-xs text-muted-foreground flex justify-between">
                <span className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Created {new Date(reminder.created_at).toLocaleDateString()}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
