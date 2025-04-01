import { useState, useEffect } from "react";
import { Reminder } from "@/utils/supabase";
import { toast } from "sonner";
import { BellRing, AlarmPlus } from "lucide-react";

import { useReminders } from "./hooks/useReminders";
import { useNotifications } from "./hooks/useNotifications";
import { useReminderSounds } from "./hooks/useReminderSounds";

import { ReminderHeader } from "./components/ReminderHeader";
import { ReminderControls } from "./components/ReminderControls";
import { ReminderList } from "./components/ReminderList";
import { ReminderForm } from "./components/ReminderForm";
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
            showReminderToast(reminder);
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
          showReminderToast(reminder);
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
            // Handle taken action if needed
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

  const showReminderToast = (reminder: Reminder) => {
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
  };

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

  const handleAddReminder = () => {
    resetForm();
    setOpenDialog(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <ReminderHeader 
          title="Medicine Reminders"
          description="Set reminders for your medications to never miss a dose"
        />
        
        <ReminderControls
          sortOrder={sortOrder}
          toggleSort={toggleSort}
          soundEnabled={soundEnabled}
          toggleSound={toggleSound}
          notificationsEnabled={notificationsEnabled}
          notificationPermission={notificationPermission}
          requestNotificationPermission={requestNotificationPermission}
          onOpenSoundsDialog={() => setSoundsDialogOpen(true)}
          onAddReminder={handleAddReminder}
        />
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
        <EmptyReminders onAddReminder={handleAddReminder} />
      ) : (
        <ReminderList 
          reminders={reminders}
          activeAlarms={activeAlarms}
          onEdit={openEditDialog}
          onDelete={handleDeleteReminder}
          onSnooze={handleSnooze}
        />
      )}
      
      <ReminderForm
        open={openDialog}
        setOpen={setOpenDialog}
        currentReminder={currentReminder}
        onSuccess={fetchReminders}
      />
      
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
    </div>
  );
}
