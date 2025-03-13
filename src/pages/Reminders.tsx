
import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { MedicineReminder } from "@/components/reminders/MedicineReminder";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

const Reminders = () => {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <DashboardLayout>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="flex items-center gap-2"
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
