import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Reminder } from "@/utils/supabase";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { 
  AlarmClockCheck, AlarmPlus, Clock, Pill, Bell, BellRing, 
  ArrowUpDown, VolumeX, Volume2, Settings, Music, ArrowLeft 
} from "lucide-react";

import { useReminders } from "./hooks/useReminders";
import { useNotifications } from "./hooks/useNotifications";
import { useReminderSounds } from "./hooks/useReminderSounds";

import { ReminderCard } from "./components/ReminderCard";
import { ReminderForm, AddReminderButton } from "./components/ReminderForm";
import { EmptyReminders } from "./components/EmptyReminders";
import { NotificationSettingsDialog } from "./components/NotificationSettingsDialog";
import { NotificationPermissionAlert } from "./components/NotificationAlert";

import { checkDueReminders, getNextOccurrence } from "./utils/reminderUtils";

export function MedicineReminder() {
  const [openDialog, setOpenDialog] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Reminder | null>(null);
  const [soundsDialogOpen, setSoundsDialogOpen] = useState(false);

  const { 
    reminders, loading, sortOrder, toggleSort, 
    fetchReminders, deleteReminder, createReminder, updateReminder
  } = useReminders();

  const { 
    notificationsEnabled, notificationPermission, serviceWorkerReady,
    requestNotificationPermission, sendNotification,
    scheduleUpcomingNotifications, getUpcomingReminders,
    snoozeReminder, cancelNotification, isReminderSnoozed 
  } = useNotifications();

  const { 
    soundEnabled, selectedSound, activeAlarms, alarmAudioRef,
    volume, customSounds, getAllSounds,
    setSoundEnabled, setSelectedSound, setVolume,
    playAlarmSound, playTestSound, stopAllAlarms, toggleSound,
    addCustomSound, removeCustomSound
  } = useReminderSounds();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && notificationsEnabled) {
        console.log("App going to background, scheduling notifications");
        scheduleUpcomingNotifications(reminders);
      } else if (document.visibilityState === 'visible') {
        console.log("App becoming visible, refreshing data");
        fetchReminders();
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const upcomingReminders = getUpcomingReminders(reminders, 60);
      
      if (upcomingReminders.length > 0 && notificationsEnabled) {
        const nextReminder = upcomingReminders[0];
        try {
          new Notification("Medicine Reminder - App Closed", {
            body: `Don't forget: ${nextReminder.medicine_name} at ${nextReminder.time}${upcomingReminders.length > 1 ? ` and ${upcomingReminders.length - 1} more reminders` : ''}`,
            icon: "/favicon.ico"
          });
        } catch (error) {
          console.error("Error sending notification:", error);
        }
        
        scheduleUpcomingNotifications(reminders);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('app:background', () => scheduleUpcomingNotifications(reminders));

    if (serviceWorkerReady && reminders.length > 0 && notificationsEnabled) {
      scheduleUpcomingNotifications(reminders);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('app:background', () => scheduleUpcomingNotifications(reminders));
    };
  }, [reminders, notificationsEnabled, serviceWorkerReady]);

  useEffect(() => {
    if (reminders.length === 0) return;

    const timers: NodeJS.Timeout[] = [];

    reminders.forEach(reminder => {
      const nextOccurrence = getNextOccurrence(reminder.time);
      const timeUntilReminder = nextOccurrence.getTime() - Date.now();

      if (timeUntilReminder > 0) {
        const timer = setTimeout(() => {
          if (!isReminderSnoozed || !isReminderSnoozed(reminder.id)) {
            playAlarmSound(reminder.id);
            sendNotification(reminder);

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
          }
        }, timeUntilReminder);

        timers.push(timer);
      }
    });

    const checkNow = () => {
      const dueReminders = checkDueReminders(
        reminders, 
        playAlarmSound, 
        stopAllAlarms, 
        sendNotification,
        isReminderSnoozed
      );

      if (dueReminders.length > 0) {
        dueReminders.forEach(reminder => {
          playAlarmSound(reminder.id);
          sendNotification(reminder);

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
        });
      }
    };

    checkNow();

    const regularInterval = setInterval(checkNow, 15000);

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const swMessageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
          const { id, action } = event.data.payload;
          if (action === 'taken') {
          }
        } else if (event.data && event.data.type === 'SYNC_REMINDERS') {
          scheduleUpcomingNotifications(reminders);
        }
      };

      navigator.serviceWorker.addEventListener('message', swMessageHandler);

      return () => {
        timers.forEach(clearTimeout);
        clearInterval(regularInterval);
        navigator.serviceWorker.removeEventListener('message', swMessageHandler);
      };
    }

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(regularInterval);
    };
  }, [reminders, soundEnabled, notificationsEnabled, selectedSound, serviceWorkerReady]);

  const openEditDialog = (reminder: Reminder) => {
    setCurrentReminder(reminder);
    setOpenDialog(true);
  };

  const resetForm = () => {
    setCurrentReminder(null);
  };

  const handleSnooze = (id: string, minutes: number) => {
    if (activeAlarms.includes(id)) {
      stopAllAlarms();
    }
  };

  const handleDeleteReminder = async (id: string) => {
    cancelNotification(id);
    stopAllAlarms();
    await deleteReminder(id);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold mb-1">Medicine Reminders</h1>
            <p className="text-muted-foreground">
              Set reminders for your medications to never miss a dose
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center space-x-2 mr-2">
            <button 
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={toggleSound}
              aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
            >
              {soundEnabled ? (
                <><Volume2 className="h-4 w-4" /><span className="hidden sm:inline">Sound On</span></>
              ) : (
                <><VolumeX className="h-4 w-4" /><span className="hidden sm:inline">Sound Off</span></>
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
              <span className="hidden sm:inline">
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
              <span className="hidden sm:inline">Time</span>
              <ArrowUpDown className={`h-3 w-3 ${sortOrder === "time" ? "opacity-100" : "opacity-50"}`} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("name")}
              className="flex items-center gap-1 text-xs"
            >
              <Pill className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Name</span>
              <ArrowUpDown className={`h-3 w-3 ${sortOrder === "name" ? "opacity-100" : "opacity-50"}`} />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundsDialogOpen(true)}
            className="flex items-center gap-1"
          >
            <Music className="h-4 w-4" />
            <span className="hidden sm:inline">Ringtones</span>
          </Button>
          
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

      <audio id="reminder-sound" ref={alarmAudioRef} />

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
              onDelete={handleDeleteReminder}
              onSnooze={handleSnooze}
            />
          ))}
        </div>
      )}
    </div>
  );
}
