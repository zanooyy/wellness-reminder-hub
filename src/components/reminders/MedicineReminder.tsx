
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Reminder } from "@/utils/supabase";
import { toast } from "sonner";
import { 
  AlarmClockCheck, AlarmPlus, Clock, Pill, Bell, BellRing, 
  ArrowUpDown, VolumeX, Volume2, Settings 
} from "lucide-react";

// Custom hooks
import { useReminders } from "./hooks/useReminders";
import { useNotifications } from "./hooks/useNotifications";
import { useReminderSounds } from "./hooks/useReminderSounds";

// Components
import { ReminderCard } from "./components/ReminderCard";
import { ReminderForm, AddReminderButton } from "./components/ReminderForm";
import { EmptyReminders } from "./components/EmptyReminders";
import { NotificationSettingsDialog } from "./components/NotificationSettingsDialog";
import { NotificationPermissionAlert } from "./components/NotificationAlert";

// Utilities
import { checkDueReminders } from "./utils/reminderUtils";

export function MedicineReminder() {
  // State for form dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [soundsDialogOpen, setSoundsDialogOpen] = useState(false);
  
  // Custom hooks
  const { 
    reminders, loading, sortOrder, toggleSort, 
    fetchReminders, deleteReminder 
  } = useReminders();
  
  const { 
    notificationsEnabled, notificationPermission, 
    requestNotificationPermission, sendNotification,
    scheduleUpcomingNotifications, getUpcomingReminders,
    snoozeReminder, isReminderSnoozed 
  } = useNotifications();
  
  const { 
    soundEnabled, selectedSound, activeAlarms, alarmAudioRef,
    volume, customSounds, getAllSounds,
    setSoundEnabled, setSelectedSound, setVolume,
    playAlarmSound, playTestSound, stopAllAlarms, toggleSound,
    addCustomSound, removeCustomSound
  } = useReminderSounds();
  
  // Handle visibility change (page hidden/visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && notificationsEnabled) {
        // App is going to background, schedule upcoming notifications
        scheduleUpcomingNotifications(reminders);
      }
    };
    
    // Add event listener for when the page is about to be closed
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Check if there are any upcoming reminders in the next hour
      const upcomingReminders = getUpcomingReminders(reminders, 60); // 60 minutes
      
      if (upcomingReminders.length > 0 && notificationsEnabled) {
        // Send notification about upcoming reminders
        const nextReminder = upcomingReminders[0];
        try {
          new Notification("Medicine Reminder - App Closed", {
            body: `Don't forget: ${nextReminder.medicine_name} at ${nextReminder.time}${upcomingReminders.length > 1 ? ` and ${upcomingReminders.length - 1} more reminders` : ''}`,
            icon: "/favicon.ico"
          });
        } catch (error) {
          console.error("Error sending notification:", error);
        }
        
        // Schedule background notifications
        scheduleUpcomingNotifications(reminders);
      }
    };
    
    // Listen for visibility changes to handle when app is in background
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up on component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reminders, notificationsEnabled]);
  
  // Check for due reminders every minute
  useEffect(() => {
    if (reminders.length === 0) return;
    
    const checkInterval = setInterval(() => {
      const dueReminders = checkDueReminders(
        reminders, 
        playAlarmSound, 
        stopAllAlarms, 
        sendNotification,
        isReminderSnoozed
      );
      
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
                label: "Snooze",
                onClick: () => {
                  snoozeReminder(reminder.id, 5);
                  stopAllAlarms();
                  toast.success(`Reminder for ${reminder.medicine_name} snoozed for 5 minutes`);
                },
              }
            }
          );
          
          // Send browser notification
          sendNotification(reminder);
        });
      }
    }, 30000); // Check every 30 seconds
    
    // Initial check when component mounts or reminders change
    const initialDueReminders = checkDueReminders(
      reminders, 
      playAlarmSound, 
      stopAllAlarms, 
      sendNotification,
      isReminderSnoozed
    );
    
    if (initialDueReminders.length > 0) {
      initialDueReminders.forEach(reminder => {
        playAlarmSound(reminder.id);
        sendNotification(reminder);
      });
    }
    
    return () => clearInterval(checkInterval);
  }, [reminders, soundEnabled, notificationsEnabled, selectedSound]);
  
  // Open dialog to edit a reminder
  const openEditDialog = (reminder: Reminder) => {
    setCurrentReminder(reminder);
    setOpenDialog(true);
  };
  
  // Reset form data
  const resetForm = () => {
    setCurrentReminder(null);
  };

  // Handle snoozing a reminder
  const handleSnooze = (id: string, minutes: number) => {
    // Stop any active alarms for this reminder
    if (activeAlarms.includes(id)) {
      stopAllAlarms();
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
              aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
            >
              {soundEnabled ? (
                <><Volume2 className="h-4 w-4" /><span>Sound On</span></>
              ) : (
                <><VolumeX className="h-4 w-4" /><span>Sound Off</span></>
              )}
            </button>
          </div>
          
          <NotificationSettingsDialog
            open={soundsDialogOpen}
            setOpen={setSoundsDialogOpen}
            selectedSound={selectedSound}
            soundEnabled={soundEnabled}
            volume={volume}
            customSounds={customSounds}
            onSelectSound={setSelectedSound}
            onToggleSound={setSoundEnabled}
            onTestSound={playTestSound}
            onChangeVolume={setVolume}
            onAddCustomSound={addCustomSound}
            onRemoveCustomSound={removeCustomSound}
          />
          
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
          
          <AddReminderButton
            onClick={() => {
              resetForm();
              setOpenDialog(true);
            }}
          />
          
          <ReminderForm
            open={openDialog}
            setOpen={setOpenDialog}
            currentReminder={currentReminder}
            onSuccess={fetchReminders}
          />
        </div>
      </div>

      {/* Hidden audio element for notification sound */}
      <audio id="reminder-sound" ref={alarmAudioRef} />

      {/* Notification permission alerts */}
      <NotificationPermissionAlert 
        notificationsEnabled={notificationsEnabled}
        notificationPermission={notificationPermission}
        remindersExist={reminders.length > 0}
        onRequestPermission={requestNotificationPermission}
      />

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-primary">Loading reminders...</div>
        </div>
      ) : reminders.length === 0 ? (
        <EmptyReminders 
          onAddReminder={() => {
            resetForm();
            setOpenDialog(true);
          }} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              isActive={activeAlarms.includes(reminder.id)}
              onEdit={openEditDialog}
              onDelete={deleteReminder}
              onSnooze={handleSnooze}
            />
          ))}
        </div>
      )}
    </div>
  );
}
