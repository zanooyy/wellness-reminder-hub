
import { useState, useEffect, useCallback } from "react";
import { Reminder } from "@/utils/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"time" | "name">("time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  // Check for network status
  useEffect(() => {
    const handleOnline = () => {
      setOfflineMode(false);
      toast.success("You're back online");
      fetchReminders(); // Refetch when back online
    };
    
    const handleOffline = () => {
      setOfflineMode(true);
      toast.warning("You're offline. Limited functionality available.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    setOfflineMode(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Save reminders to IndexedDB for offline access
  const saveToIndexedDB = useCallback((remindersToSave: Reminder[]) => {
    if (!('indexedDB' in window)) return;
    
    const openRequest = indexedDB.open('remindersDB', 1);
    
    openRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' });
      }
    };
    
    openRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      
      // Clear existing data and add new data
      store.clear();
      
      remindersToSave.forEach(reminder => {
        store.add(reminder);
      });
      
      transaction.oncomplete = () => {
        console.log('Reminders saved to IndexedDB');
      };
      
      transaction.onerror = () => {
        console.error('Error saving reminders to IndexedDB');
      };
    };
    
    openRequest.onerror = () => {
      console.error('Could not open IndexedDB');
    };
  }, []);
  
  // Load reminders from IndexedDB
  const loadFromIndexedDB = useCallback(() => {
    if (!('indexedDB' in window)) return Promise.resolve([]);
    
    return new Promise<Reminder[]>((resolve) => {
      const openRequest = indexedDB.open('remindersDB', 1);
      
      openRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Check if the object store exists
        if (!db.objectStoreNames.contains('reminders')) {
          resolve([]);
          return;
        }
        
        const transaction = db.transaction(['reminders'], 'readonly');
        const store = transaction.objectStore('reminders');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
        };
        
        getAllRequest.onerror = () => {
          console.error('Error loading reminders from IndexedDB');
          resolve([]);
        };
      };
      
      openRequest.onerror = () => {
        console.error('Could not open IndexedDB');
        resolve([]);
      };
    });
  }, []);

  // Fetch reminders from Supabase with retry mechanism
  const fetchReminders = useCallback(async (retryCount = 0) => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching reminders for user:", user.id);
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user.id)
        .order(sortOrder, { ascending: sortDirection === "asc" });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log("Reminders fetched:", data?.length || 0);
      
      const reminderData = data || [];
      setReminders(reminderData);
      
      // Save to IndexedDB for offline access
      if (reminderData.length > 0) {
        saveToIndexedDB(reminderData);
      }
      
    } catch (error: any) {
      console.error("Error fetching reminders:", error);
      
      // If offline or failed to fetch, try to get from IndexedDB
      if (!navigator.onLine || retryCount >= 2) {
        console.log("Falling back to IndexedDB");
        const offlineData = await loadFromIndexedDB();
        
        if (offlineData && offlineData.length > 0) {
          setReminders(offlineData);
          setOfflineMode(true);
          toast.info("Using cached reminder data (offline mode)");
        } else {
          toast.error("Failed to load reminders");
          setError("Could not load reminders");
        }
      } else if (retryCount < 2) {
        // Retry with exponential backoff
        const delay = 1000 * Math.pow(2, retryCount);
        console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1})`);
        setTimeout(() => fetchReminders(retryCount + 1), delay);
        return;
      } else {
        toast.error("Failed to load reminders after multiple attempts");
        setError("Could not load reminders");
      }
    } finally {
      setLoading(false);
    }
  }, [user, sortOrder, sortDirection, saveToIndexedDB, loadFromIndexedDB]);

  // Create a new reminder
  const createReminder = async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) {
      toast.error("You must be logged in to create reminders");
      return null;
    }
    
    try {
      const newReminder = {
        ...reminder,
        user_id: user.id,
      };
      
      if (offlineMode) {
        toast.error("Cannot create reminders while offline");
        return null;
      }
      
      const { data, error } = await supabase
        .from("reminders")
        .insert([newReminder])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setReminders(prev => [...prev, data]);
      
      // Update IndexedDB
      saveToIndexedDB([...reminders, data]);
      
      // Schedule notification if service worker is available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        let delayMs = reminderTime.getTime() - now.getTime();
        
        // If time already passed today, schedule for tomorrow
        if (delayMs < 0) {
          delayMs += 24 * 60 * 60 * 1000; // Add 24 hours
        }
        
        if (delayMs > 0) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: 'SCHEDULE_NOTIFICATION',
              payload: {
                id: data.id,
                title: `Medicine Reminder: ${data.medicine_name}`,
                body: data.dosage ? `Dosage: ${data.dosage}` : "Time to take your medicine",
                time: delayMs,
                medicine: data.medicine_name,
                dosage: data.dosage,
                frequency: data.frequency
              }
            });
          } catch (e) {
            console.error("Failed to schedule notification:", e);
          }
        }
      }
      
      toast.success("Reminder created successfully");
      return data;
    } catch (error: any) {
      console.error("Error creating reminder:", error);
      toast.error("Failed to create reminder");
      return null;
    }
  };

  // Update a reminder
  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    if (!user) {
      toast.error("You must be logged in to update reminders");
      return false;
    }
    
    if (offlineMode) {
      toast.error("Cannot update reminders while offline");
      return false;
    }
    
    try {
      const { error } = await supabase
        .from("reminders")
        .update({...updates, updated_at: new Date().toISOString()})
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Update local state
      setReminders(prev => prev.map(item => 
        item.id === id ? {...item, ...updates, updated_at: new Date().toISOString()} : item
      ));
      
      // Update IndexedDB
      saveToIndexedDB(reminders.map(item => 
        item.id === id ? {...item, ...updates, updated_at: new Date().toISOString()} : item
      ));
      
      // Update notification schedule if time changed
      if (updates.time && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Cancel the old notification
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'CANCEL_NOTIFICATION',
            payload: { id }
          });
        } catch (e) {
          console.error("Failed to cancel notification:", e);
        }
        
        // Schedule new notification
        const updatedReminder = reminders.find(r => r.id === id);
        if (updatedReminder) {
          const [hours, minutes] = updates.time.split(':').map(Number);
          const reminderTime = new Date();
          reminderTime.setHours(hours, minutes, 0, 0);
          
          const now = new Date();
          let delayMs = reminderTime.getTime() - now.getTime();
          
          // If time already passed today, schedule for tomorrow
          if (delayMs < 0) {
            delayMs += 24 * 60 * 60 * 1000; // Add 24 hours
          }
          
          if (delayMs > 0) {
            try {
              navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_NOTIFICATION',
                payload: {
                  id,
                  title: `Medicine Reminder: ${updatedReminder.medicine_name}`,
                  body: updatedReminder.dosage ? `Dosage: ${updatedReminder.dosage}` : "Time to take your medicine",
                  time: delayMs,
                  medicine: updatedReminder.medicine_name,
                  dosage: updatedReminder.dosage,
                  frequency: updatedReminder.frequency
                }
              });
            } catch (e) {
              console.error("Failed to schedule notification:", e);
            }
          }
        }
      }
      
      toast.success("Reminder updated successfully");
      return true;
    } catch (error: any) {
      console.error("Error updating reminder:", error);
      toast.error("Failed to update reminder");
      return false;
    }
  };

  // Delete a reminder
  const deleteReminder = async (id: string) => {
    if (!user) {
      toast.error("You must be logged in to delete reminders");
      return;
    }
    
    if (offlineMode) {
      toast.error("Cannot delete reminders while offline");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Update local state
      const updatedReminders = reminders.filter(reminder => reminder.id !== id);
      setReminders(updatedReminders);
      
      // Update IndexedDB
      saveToIndexedDB(updatedReminders);
      
      // Cancel notification if service worker is available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'CANCEL_NOTIFICATION',
            payload: { id }
          });
        } catch (e) {
          console.error("Failed to cancel notification:", e);
        }
      }
      
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
  };

  // Initialize on component mount
  useEffect(() => {
    if (user) {
      fetchReminders();
      
      // Schedule background sync when supported
      if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
        navigator.serviceWorker.ready
          .then(registration => registration.sync.register('reminder-sync'))
          .catch(error => console.error('Background sync registration failed:', error));
      }
    } else {
      setReminders([]);
      setLoading(false);
    }
  }, [user, sortOrder, sortDirection, fetchReminders]);

  return {
    reminders,
    loading,
    error,
    offlineMode,
    sortOrder,
    sortDirection,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleSort
  };
}
