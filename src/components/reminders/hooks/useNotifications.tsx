
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Reminder } from "@/utils/supabase";

export function useNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "default">("default");
  const [snoozedReminders, setSnoozedReminders] = useState<Record<string, Date>>({});
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

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
        
        // Register for service worker updates if not already registered
        if ('serviceWorker' in navigator && !serviceWorkerReady) {
          registerServiceWorker();
        }
        
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

  // Register service worker
  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers are not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registration successful with scope:', registration.scope);
      
      // Wait for the service worker to be ready
      if (registration.installing) {
        registration.installing.addEventListener('statechange', (e) => {
          if ((e.target as ServiceWorker).state === 'activated') {
            setServiceWorkerReady(true);
          }
        });
      } else if (registration.waiting) {
        registration.waiting.addEventListener('statechange', (e) => {
          if ((e.target as ServiceWorker).state === 'activated') {
            setServiceWorkerReady(true);
          }
        });
      } else if (registration.active) {
        setServiceWorkerReady(true);
      }
      
      // Set up message listener for service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
          const { id, action } = event.data.payload;
          console.log('Notification clicked in service worker:', id, action);
          
          // Handle actions from service worker
          if (action === 'taken') {
            toast.success(`Marked reminder as taken`);
          }
        } else if (event.data && event.data.type === 'SYNC_REMINDERS') {
          // Trigger a sync of reminders
          console.log('Service worker requested reminders sync');
        }
      });
      
      return true;
    } catch (error) {
      console.error("Service worker registration failed:", error);
      return false;
    }
  };

  // Schedule upcoming notifications when app goes to background
  const scheduleUpcomingNotifications = (reminders: Reminder[]) => {
    if (!notificationsEnabled || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    
    console.log('Scheduling upcoming reminders for background notification');
    
    // Tell the service worker about all reminders
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_REMINDERS',
      payload: {
        reminders: reminders
      }
    });
    
    // Try to register periodic sync if supported
    if ('periodicSync' in navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(registration => {
        // @ts-ignore - Periodic sync is not in the TypeScript definitions yet
        if (registration.periodicSync) {
          try {
            // @ts-ignore
            registration.periodicSync.register('reminder-sync', {
              minInterval: 60 * 60 * 1000 // Once per hour
            }).catch(err => {
              console.log('Periodic sync registration failed:', err);
            });
          } catch (e) {
            console.log('Periodic sync error:', e);
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

  // Cancel a scheduled notification
  const cancelNotification = (reminderId: string) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CANCEL_NOTIFICATION',
        payload: {
          id: reminderId
        }
      });
    }
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
    registerServiceWorker();
    
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

    // Setup visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && notificationsEnabled) {
        // App is going to background, dispatch event to collect reminders
        window.dispatchEvent(new CustomEvent('app:background'));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    serviceWorkerReady,
    requestNotificationPermission,
    scheduleUpcomingNotifications,
    getUpcomingReminders,
    sendNotification,
    snoozeReminder,
    cancelNotification,
    isReminderSnoozed,
    getSnoozeRemaining
  };
}
