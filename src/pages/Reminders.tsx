
import { useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { MedicineReminder } from "@/components/reminders/MedicineReminder";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { saveThemePreference, getThemePreference } from "@/utils/supabase";

const Reminders = () => {
  const { theme, setTheme } = useTheme();
  const { user, bypassAuth } = useAuth();
  
  useEffect(() => {
    // Load theme preference when component mounts
    const loadThemePreference = async () => {
      // If auth is bypassed, we'll use null for userId
      const userId = bypassAuth ? null : user?.id;
      const savedTheme = await getThemePreference(userId);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    };
    
    loadThemePreference();
  }, [user, setTheme, bypassAuth]);
  
  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Save theme preference - if auth is bypassed, we'll use null for userId
    const userId = bypassAuth ? null : user?.id;
    await saveThemePreference(userId || '', newTheme);
  };

  return (
    <DashboardLayout>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="flex items-center gap-2"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
      </div>
      <MedicineReminder />
    </DashboardLayout>
  );
};

export default Reminders;
