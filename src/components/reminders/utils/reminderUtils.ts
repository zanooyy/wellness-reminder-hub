
import { format } from "date-fns";
import { Reminder } from "@/utils/supabase";

// Format time for display
export const formatTime = (timeString: string) => {
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

// Get border color based on frequency
export const getBorderColor = (frequency: string): string => {
  switch (frequency) {
    case 'daily': return '#3b82f6'; // blue-500
    case 'weekly': return '#8b5cf6'; // purple-500
    case 'monthly': return '#f59e0b'; // amber-500
    case 'as-needed': return '#6b7280'; // gray-500
    default: return '#3b82f6'; // blue-500
  }
};

// Check if a reminder is due soon (within 30 minutes)
export const isReminderDueSoon = (reminderTime: string): boolean => {
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const reminderDate = new Date();
  reminderDate.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const timeDiff = reminderDate.getTime() - now.getTime();
  
  // If reminder is in the past (today), it's not "due soon"
  if (timeDiff < 0) return false;
  
  // If reminder is within 30 minutes, it's "due soon"
  return timeDiff <= 30 * 60 * 1000;
};

// Improved precision for checking due reminders
export const checkDueReminders = (
  reminders: Reminder[], 
  playAlarmSound: (id: string) => void, 
  stopAllAlarms: () => void, 
  sendNotification: (reminder: Reminder) => void,
  isReminderSnoozed?: (id: string) => boolean
) => {
  if (reminders.length === 0) return [];
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSeconds = now.getSeconds();
  
  // Only check when we're within the first 10 seconds of a minute
  // This helps ensure we don't miss the exact minute
  if (currentSeconds > 10) return [];
  
  const dueReminders = reminders.filter(reminder => {
    // Skip snoozed reminders
    if (isReminderSnoozed && isReminderSnoozed(reminder.id)) {
      return false;
    }
    
    // Parse reminder time (HH:MM format)
    const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number);
    
    // Check if the time matches the current time (exact minute)
    return currentHour === reminderHour && currentMinute === reminderMinute;
  });
  
  return dueReminders;
};

// Function to check if a specific reminder is due right now (more precise)
export const isReminderDueNow = (reminderTime: string): boolean => {
  const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  return currentHour === reminderHour && currentMinute === reminderMinute;
};

// Convert a time string (HH:MM) to milliseconds since midnight
export const timeStringToMilliseconds = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
};

// Get the next occurrence of a time
export const getNextOccurrence = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const now = new Date();
  const result = new Date();
  
  result.setHours(hours, minutes, 0, 0);
  
  // If the time has already passed today, set it for tomorrow
  if (result < now) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
};
