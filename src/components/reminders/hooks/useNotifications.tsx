
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Reminder } from "@/utils/supabase";

export function useNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "default">("default");
  const [snoozedReminders, setSnoozedReminders] = useState<Record<string, Date>>({});

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

  // Schedule upcoming notifications when app goes to background
  const scheduleUpcomingNotifications = (reminders: Reminder[]) => {
    if (!notificationsEnabled || Notification.permission !== 'granted') return;
    
    const upcomingReminders = getUpcomingReminders(reminders, 60); // Next 60 minutes
    
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

  // Get upcoming reminders within specified minutes
  const getUpcomingReminders = (reminders: Reminder[], withinMinutes: number): Reminder[] => {
    if (reminders.length === 0) return [];
    
    const now = new Date();
    const cutoffTime = new Date(now.getTime() + withinMinutes * 60000);
    
    return reminders.filter(reminder => {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);
      
      // If the reminder time has already passed today, don't include it
      if (reminderTime < now) return false;
      
      // If the reminder is snoozed and snooze time is in the future, don't include it
      if (snoozedReminders[reminder.id]) {
        const snoozeTime = snoozedReminders[reminder.id];
        if (snoozeTime > now) return false;
      }
      
      return reminderTime <= cutoffTime;
    });
  };

  // Send notification for a specific reminder
  const sendNotification = (reminder: Reminder) => {
    if (!notificationsEnabled || Notification.permission !== "granted") return;
    
    // Don't send notification if reminder is snoozed
    if (snoozedReminders[reminder.id] && snoozedReminders[reminder.id] > new Date()) {
      return;
    }
    
    // Create and show notification
    try {
      const notification = new Notification(`Time to take ${reminder.medicine_name}`, {
        body: reminder.dosage ? `Dosage: ${reminder.dosage}` : "",
        icon: "/favicon.ico",
        tag: reminder.id, // Prevent duplicate notifications
        requireInteraction: true // Keep notification until user interacts
      });
      
      notification.onclick = function() {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Initialize notification service worker
  const initializeServiceWorker = () => {
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
  };

  // Snooze a reminder for the specified minutes
  const snoozeReminder = (reminderId: string, minutes: number) => {
    const snoozeUntil = new Date(new Date().getTime() + minutes * 60000);
    setSnoozedReminders(prev => ({
      ...prev,
      [reminderId]: snoozeUntil
    }));
    
    toast.info(`Reminder snoozed for ${minutes} minutes`);
    
    // Also tell service worker about the snooze
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SNOOZE_NOTIFICATION',
        payload: {
          id: reminderId,
          snoozeUntil: snoozeUntil.getTime()
        }
      });
    }
    
    return snoozeUntil;
  };

  // Check if a reminder is currently snoozed
  const isReminderSnoozed = (reminderId: string): boolean => {
    return !!(snoozedReminders[reminderId] && snoozedReminders[reminderId] > new Date());
  };

  // Get snooze time remaining in minutes
  const getSnoozeRemaining = (reminderId: string): number => {
    if (!snoozedReminders[reminderId] || snoozedReminders[reminderId] <= new Date()) {
      return 0;
    }
    
    const now = new Date();
    const snoozeTime = snoozedReminders[reminderId];
    return Math.ceil((snoozeTime.getTime() - now.getTime()) / 60000);
  };

  // Initialize on component mount
  useEffect(() => {
    checkNotificationPermission();
    initializeServiceWorker();
    
    // Load saved snoozed reminders from localStorage
    const savedSnoozed = localStorage.getItem('snoozedReminders');
    if (savedSnoozed) {
      try {
        const parsed = JSON.parse(savedSnoozed);
        // Convert string dates back to Date objects
        const convertedSnoozed: Record<string, Date> = {};
        Object.entries(parsed).forEach(([id, time]) => {
          convertedSnoozed[id] = new Date(time as string);
        });
        setSnoozedReminders(convertedSnoozed);
      } catch (e) {
        console.error("Error parsing saved snoozed reminders:", e);
      }
    }
  }, []);

  // Save snoozed reminders to localStorage when they change
  useEffect(() => {
    if (Object.keys(snoozedReminders).length > 0) {
      localStorage.setItem('snoozedReminders', JSON.stringify(snoozedReminders));
    }
  }, [snoozedReminders]);

  return {
    notificationsEnabled,
    notificationPermission,
    requestNotificationPermission,
    scheduleUpcomingNotifications,
    getUpcomingReminders,
    sendNotification,
    snoozeReminder,
    isReminderSnoozed,
    getSnoozeRemaining
  };
}
