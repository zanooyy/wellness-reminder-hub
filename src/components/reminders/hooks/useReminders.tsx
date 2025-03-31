
import { useState, useEffect } from "react";
import { supabase, Reminder } from "@/utils/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user.id)
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

  // Delete a reminder
  const deleteReminder = async (id: string) => {
    if (!user) return;
    
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
    deleteReminder,
    toggleSort
  };
}
