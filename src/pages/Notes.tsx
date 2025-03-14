
import { useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { NotesList } from "@/components/notes/NotesList";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { saveThemePreference, getThemePreference } from "@/utils/supabase";

const Notes = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  
  useEffect(() => {
    // Load theme preference from profile when component mounts
    const loadThemePreference = async () => {
      if (user) {
        const savedTheme = await getThemePreference(user.id);
        if (savedTheme) {
          setTheme(savedTheme);
        }
      }
    };
    
    loadThemePreference();
  }, [user, setTheme]);
  
  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Save theme preference to profile
    if (user) {
      await saveThemePreference(user.id, newTheme);
    }
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
      <NotesList />
    </DashboardLayout>
  );
};

export default Notes;
