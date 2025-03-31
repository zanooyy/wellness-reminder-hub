
import { useState, useEffect } from "react";
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

  // Fetch reminders from Supabase
  const fetchReminders = async () => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
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
      setReminders(data || []);
    } catch (error: any) {
      console.error("Error fetching reminders:", error);
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  // Create a new reminder
  const createReminder = async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    
    try {
      const newReminder = {
        ...reminder,
        user_id: user.id,
      };
      
      const { data, error } = await supabase
        .from("reminders")
        .insert([newReminder])
        .select()
        .single();

      if (error) throw error;
      
      fetchReminders(); // Refresh the list
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
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("reminders")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      fetchReminders(); // Refresh the list
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
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

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
  };

  // Initialize on component mount
  useEffect(() => {
    if (user) {
      fetchReminders();
    } else {
      setReminders([]);
      setLoading(false);
    }
  }, [user, sortOrder, sortDirection]);

  return {
    reminders,
    loading,
    sortOrder,
    sortDirection,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleSort
  };
}
