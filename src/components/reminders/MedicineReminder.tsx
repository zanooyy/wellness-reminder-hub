
import { useState, useEffect, useRef } from "react";
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
  AlarmClockCheck, AlarmPlus, Clock, Pill, Trash, Edit, AlertCircle, Calendar, MoveHorizontal,
  Bell, BellRing, Filter, ArrowUpDown, VolumeX, Volume2, Settings
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function MedicineReminder() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [sortOrder, setSortOrder] = useState<"time" | "name">("time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "default">("default");
  const [selectedSound, setSelectedSound] = useState<string>("sound1");
  const [soundsDialogOpen, setSoundsDialogOpen] = useState(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activeAlarms, setActiveAlarms] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    medicine_name: "",
    dosage: "",
    frequency: "daily",
    time: "",
    notes: "",
  });

  // Available notification sounds
  const notificationSounds = [
    { id: "sound1", name: "Bell", url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" },
    { id: "sound2", name: "Chime", url: "https://assets.mixkit.co/active_storage/sfx/1531/1531-preview.mp3" },
    { id: "sound3", name: "Alert", url: "https://assets.mixkit.co/active_storage/sfx/1824/1824-preview.mp3" },
    { id: "sound4", name: "Soft", url: "https://assets.mixkit.co/active_storage/sfx/1821/1821-preview.mp3" },
  ];

  // Initialize notifications
  useEffect(() => {
    checkNotificationPermission();
    
    // Register service worker for background notifications
    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('/sw.js').then(function(registration) {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }).catch(function(err) {
          console.log('ServiceWorker registration failed: ', err);
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    }

    // Add event listener for when the page is about to be closed
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Listen for visibility changes to handle when app is in background
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up on component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle visibility change (page hidden/visible)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && notificationsEnabled) {
      // App is going to background, schedule upcoming notifications
      scheduleUpcomingNotifications();
    }
  };

  // Schedule upcoming notifications when app goes to background
  const scheduleUpcomingNotifications = () => {
    if (!notificationsEnabled || Notification.permission !== 'granted') return;
    
    const upcomingReminders = getUpcomingReminders(60); // Next 60 minutes
    
    if (upcomingReminders.length > 0) {
      // Schedule notifications for upcoming reminders
      upcomingReminders.forEach(reminder => {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const delayMs = reminderTime.getTime() - now.getTime();
        
        if (delayMs > 0) {
          // Use service worker to schedule notification
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SCHEDULE_NOTIFICATION',
              payload: {
                id: reminder.id,
                title: `Medicine Reminder: ${reminder.medicine_name}`,
                body: reminder.dosage ? `Dosage: ${reminder.dosage}` : "Time to take your medicine",
                time: delayMs
              }
            });
          }
        }
      });
    }
  };

  // Load selected sound from localStorage on component mount
  useEffect(() => {
    const savedSound = localStorage.getItem('reminderSound');
    if (savedSound) {
      setSelectedSound(savedSound);
    }
    
    const savedSoundEnabled = localStorage.getItem('soundEnabled');
    if (savedSoundEnabled !== null) {
      setSoundEnabled(savedSoundEnabled === 'true');
    }
  }, []);

  // Check notification permission and update state
  const checkNotificationPermission = () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return;
    }

    setNotificationPermission(Notification.permission);
    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Notifications enabled");
        
        // Send a test notification
        new Notification("Medicine Reminder", {
          body: "You will now receive notifications for your medicine reminders",
          icon: "/favicon.ico"
        });
      } else {
        toast.error("Notification permission denied");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Could not request notification permission");
    }
  };

  // Handle page close/refresh event
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    // Check if there are any upcoming reminders in the next hour
    const upcomingReminders = getUpcomingReminders(60); // 60 minutes
    
    if (upcomingReminders.length > 0 && notificationsEnabled) {
      // Send notification about upcoming reminders
      const nextReminder = upcomingReminders[0];
      new Notification("Medicine Reminder - App Closed", {
        body: `Don't forget: ${nextReminder.medicine_name} at ${formatTime(nextReminder.time)}${upcomingReminders.length > 1 ? ` and ${upcomingReminders.length - 1} more reminders` : ''}`,
        icon: "/favicon.ico"
      });
      
      // Schedule background notifications
      scheduleUpcomingNotifications();
    }
  };

  // Get upcoming reminders within specified minutes
  const getUpcomingReminders = (withinMinutes: number): Reminder[] => {
    if (reminders.length === 0) return [];
    
    const now = new Date();
    const cutoffTime = new Date(now.getTime() + withinMinutes * 60000);
    
    return reminders.filter(reminder => {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);
      
      // If the reminder time has already passed today, don't include it
      if (reminderTime < now) return false;
      
      return reminderTime <= cutoffTime;
    });
  };

  // Initialize alarm sound
  useEffect(() => {
    // Get the selected sound URL
    const soundUrl = notificationSounds.find(sound => sound.id === selectedSound)?.url || notificationSounds[0].url;
    
    // Create audio element for alarm
    alarmAudioRef.current = new Audio(soundUrl);
    alarmAudioRef.current.loop = false;
    
    // Clean up on component unmount
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current = null;
      }
    };
  }, [selectedSound]);

  // Fetch reminders on component mount
  useEffect(() => {
    if (!user) return;
    
    fetchReminders();
  }, [user]);

  // Check for due reminders every minute
  useEffect(() => {
    if (reminders.length === 0) return;
    
    const checkInterval = setInterval(() => {
      checkDueReminders();
    }, 30000); // Check every 30 seconds
    
    // Initial check when component mounts or reminders change
    checkDueReminders();
    
    return () => clearInterval(checkInterval);
  }, [reminders, soundEnabled, notificationsEnabled, selectedSound]);
  
  // Save sound preferences when they change
  useEffect(() => {
    localStorage.setItem('reminderSound', selectedSound);
    localStorage.setItem('soundEnabled', soundEnabled.toString());
  }, [selectedSound, soundEnabled]);
  
  // Play alarm sound for a specific reminder
  const playAlarmSound = (reminderId: string) => {
    if (!soundEnabled || !alarmAudioRef.current) return;
    
    // Only play if not already playing for this reminder
    if (!activeAlarms.includes(reminderId)) {
      setActiveAlarms(prev => [...prev, reminderId]);
      
      // Update audio source with selected sound
      const soundUrl = notificationSounds.find(sound => sound.id === selectedSound)?.url || notificationSounds[0].url;
      if (alarmAudioRef.current && alarmAudioRef.current.src !== soundUrl) {
        alarmAudioRef.current.src = soundUrl;
      }
      
      // Play the alarm sound
      if (alarmAudioRef.current) {
        alarmAudioRef.current.currentTime = 0;
        alarmAudioRef.current.play()
          .catch(err => console.error("Error playing alarm sound:", err));
      }
      
      // Remove from active alarms after sound completes
      setTimeout(() => {
        setActiveAlarms(prev => prev.filter(id => id !== reminderId));
      }, 5000); // Assuming the alarm sound is around 5 seconds
    }
  };
  
  // Test selected sound
  const playTestSound = () => {
    if (!alarmAudioRef.current) return;
    
    // Update audio source with selected sound
    const soundUrl = notificationSounds.find(sound => sound.id === selectedSound)?.url || notificationSounds[0].url;
    if (alarmAudioRef.current && alarmAudioRef.current.src !== soundUrl) {
      alarmAudioRef.current.src = soundUrl;
    }
    
    // Play the test sound
    alarmAudioRef.current.currentTime = 0;
    alarmAudioRef.current.play()
      .catch(err => console.error("Error playing test sound:", err));
  };
  
  // Stop all alarm sounds
  const stopAllAlarms = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
    setActiveAlarms([]);
  };

  // Check for due reminders
  const checkDueReminders = () => {
    if (reminders.length === 0) return;
    
    const currentTime = new Date();
    const currentHour = currentTime.getHours().toString().padStart(2, '0');
    const currentMinute = currentTime.getMinutes().toString().padStart(2, '0');
    const timeNow = `${currentHour}:${currentMinute}`;
    
    const dueReminders = reminders.filter(reminder => {
      // Check if the time is within 1 minute of the current time
      const [reminderHour, reminderMinute] = reminder.time.split(':');
      const reminderDate = new Date();
      reminderDate.setHours(parseInt(reminderHour), parseInt(reminderMinute));
      
      const diffMs = Math.abs(currentTime.getTime() - reminderDate.getTime());
      const diffMinutes = Math.floor(diffMs / 60000);
      
      return diffMinutes < 1;
    });
    
    if (dueReminders.length > 0) {
      dueReminders.forEach(reminder => {
        // Play alarm sound
        playAlarmSound(reminder.id);
        
        // Show toast notification
        toast.info(
          <div className="flex flex-col gap-1">
            <div className="font-bold">Medicine Reminder</div>
            <div>Time to take {reminder.medicine_name}</div>
            {reminder.dosage && <div className="text-sm">Dosage: {reminder.dosage}</div>}
          </div>,
          {
            duration: 10000,
            icon: <BellRing className="h-5 w-5 text-blue-500" />,
            action: {
              label: "Dismiss",
              onClick: () => {
                stopAllAlarms();
                console.log("Dismissed reminder");
              },
            }
          }
        );
        
        // Send browser notification if enabled
        if (notificationsEnabled && Notification.permission === "granted") {
          // Create and show notification
          try {
            const notification = new Notification(`Time to take ${reminder.medicine_name}`, {
              body: reminder.dosage ? `Dosage: ${reminder.dosage}` : "",
              icon: "/favicon.ico",
              vibrate: [200, 100, 200],
              tag: reminder.id, // Prevent duplicate notifications
              renotify: true, // Allow notifications with same tag to notify
              requireInteraction: true // Keep notification until user interacts
            });
            
            notification.onclick = function() {
              window.focus();
              notification.close();
            };
          } catch (error) {
            console.error("Error sending notification:", error);
          }
        }
      });
    }
  };

  // Fetch reminders from Supabase
  const fetchReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user?.id)
        .order(sortOrder, { ascending: sortDirection === "asc" });

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

  // Toggle sort order
  const toggleSort = (field: "time" | "name") => {
    if (sortOrder === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortOrder(field);
      setSortDirection("asc");
    }
    
    // Re-fetch reminders with new sort
    fetchReminders();
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

  // Toggle sound
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    
    if (!soundEnabled) {
      toast.success("Alarm sounds enabled");
    } else {
      stopAllAlarms();
      toast.success("Alarm sounds disabled");
    }
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
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center space-x-2 mr-2">
            <button 
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={toggleSound}
            >
              {soundEnabled ? (
                <><Volume2 className="h-4 w-4" /><span>Sound On</span></>
              ) : (
                <><VolumeX className="h-4 w-4" /><span>Sound Off</span></>
              )}
            </button>
          </div>
          
          <Dialog open={soundsDialogOpen} onOpenChange={setSoundsDialogOpen}>
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
                  onValueChange={setSelectedSound}
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
                    onCheckedChange={setSoundEnabled}
                    id="sound-enabled"
                  />
                  <Label htmlFor="sound-enabled">Enable sounds</Label>
                </div>
                
                <Button 
                  onClick={() => {
                    // Save sound preferences
                    localStorage.setItem('reminderSound', selectedSound);
                    localStorage.setItem('soundEnabled', soundEnabled.toString());
                    setSoundsDialogOpen(false);
                    toast.success("Sound settings saved");
                  }}
                >
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="flex items-center space-x-2 mr-2">
            <button 
              className={`flex items-center space-x-2 text-sm ${notificationsEnabled ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`}
              onClick={requestNotificationPermission}
              disabled={notificationPermission === "denied"}
            >
              <Bell className="h-4 w-4" />
              <span>
                {notificationPermission === "denied" 
                  ? "Notifications Blocked" 
                  : notificationsEnabled 
                    ? "Notifications On" 
                    : "Enable Notifications"}
              </span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("time")}
              className="flex items-center gap-1 text-xs"
            >
              <Clock className="h-3.5 w-3.5" />
              Time
              <ArrowUpDown className={`h-3 w-3 ${sortOrder === "time" ? "opacity-100" : "opacity-50"}`} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("name")}
              className="flex items-center gap-1 text-xs"
            >
              <Pill className="h-3.5 w-3.5" />
              Name
              <ArrowUpDown className={`h-3 w-3 ${sortOrder === "name" ? "opacity-100" : "opacity-50"}`} />
            </Button>
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
      </div>

      {/* Hidden audio element for notification sound */}
      <audio id="reminder-sound" ref={alarmAudioRef} />

      {/* Check if user has notifications enabled and prompt them if not */}
      {(!notificationsEnabled && reminders.length > 0 && notificationPermission !== "denied") && (
        <Card className="bg-blue-50 border-blue-200 mb-4">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <p className="font-medium">Enable notifications</p>
                <p className="text-sm text-muted-foreground">Get notified about your medicine reminders even when you close this app</p>
              </div>
            </div>
            <Button size="sm" onClick={requestNotificationPermission}>
              Enable
            </Button>
          </CardContent>
        </Card>
      )}
      
      {(notificationPermission === "denied" && reminders.length > 0) && (
        <Card className="bg-amber-50 border-amber-200 mb-4">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-3" />
              <div>
                <p className="font-medium">Notifications are blocked</p>
                <p className="text-sm text-muted-foreground">Please enable notifications in your browser settings to receive medicine reminders</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                toast.info(
                  <div className="text-sm">
                    <p className="font-medium mb-1">How to enable notifications:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Click the lock/info icon in your browser's address bar</li>
                      <li>Find "Notifications" settings</li>
                      <li>Change from "Block" to "Allow"</li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>, 
                  { duration: 10000 }
                );
              }}
            >
              Learn How
            </Button>
          </CardContent>
        </Card>
      )}

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
            <Card 
              key={reminder.id} 
              className={`overflow-hidden hover:shadow-md transition-shadow border-l-4 ${
                activeAlarms.includes(reminder.id) ? "animate-pulse" : ""
              }`} 
              style={{ borderLeftColor: getBorderColor(reminder.frequency) }}
            >
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
                <span className="flex items-center">
                  <Bell className="h-3.5 w-3.5 mr-1" />
                  {isReminderDueSoon(reminder.time) ? (
                    <span className="text-orange-500 font-medium">Due soon</span>
                  ) : (
                    <span>Scheduled</span>
                  )}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to check if a reminder is due soon (within 30 minutes)
function isReminderDueSoon(reminderTime: string): boolean {
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const reminderDate = new Date();
  reminderDate.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const timeDiff = reminderDate.getTime() - now.getTime();
  
  // If reminder is in the past (today), it's not "due soon"
  if (timeDiff < 0) return false;
  
  // If reminder is within 30 minutes, it's "due soon"
  return timeDiff <= 30 * 60 * 1000;
}

// Helper function to get border color based on frequency
function getBorderColor(frequency: string): string {
  switch (frequency) {
    case 'daily': return '#3b82f6'; // blue-500
    case 'weekly': return '#8b5cf6'; // purple-500
    case 'monthly': return '#f59e0b'; // amber-500
    case 'as-needed': return '#6b7280'; // gray-500
    default: return '#3b82f6'; // blue-500
  }
}
