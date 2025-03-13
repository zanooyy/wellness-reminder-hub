
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Reminder } from "@/utils/supabase";

export function useNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "default">("default");

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
      
      return reminderTime <= cutoffTime;
    });
  };

  // Send notification for a specific reminder
  const sendNotification = (reminder: Reminder) => {
    if (!notificationsEnabled || Notification.permission !== "granted") return;
    
    // Create and show notification
    try {
      const notification = new Notification(`Time to take ${reminder.medicine_name}`, {
        body: reminder.dosage ? `Dosage: ${reminder.dosage}` : "",
        icon: "/favicon.ico",
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

  // Initialize on component mount
  useEffect(() => {
    checkNotificationPermission();
    initializeServiceWorker();
  }, []);

  return {
    notificationsEnabled,
    notificationPermission,
    requestNotificationPermission,
    scheduleUpcomingNotifications,
    getUpcomingReminders,
    sendNotification
  };
}
