
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { MedicineReminder } from "@/components/reminders/MedicineReminder";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { saveThemePreference, getThemePreference } from "@/utils/supabase";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Reminders = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Register service worker for notifications
  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error("Service workers are not supported in this browser");
      return;
    }
    
    try {
      setIsRegistering(true);
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registration successful with scope:', registration.scope);
      toast.success("Notification service started");
      setServiceWorkerReady(true);
      
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
      
    } catch (error) {
      console.error("Service worker registration failed:", error);
      toast.error("Failed to start notification service");
    } finally {
      setIsRegistering(false);
    }
  };
  
  useEffect(() => {
    // Load theme preference when component mounts
    const loadThemePreference = async () => {
      const userId = user?.id;
      if (userId) {
        try {
          const savedTheme = await getThemePreference(userId);
          if (savedTheme) {
            setTheme(savedTheme);
          }
        } catch (error) {
          console.error("Error loading theme preference:", error);
        }
      }
    };
    
    if (user) {
      loadThemePreference();
    }
    
    // Check for service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerReady(true);
        console.log("Service worker is ready");
      }).catch(() => {
        console.log("Service worker not ready, registering...");
        registerServiceWorker();
      });
    }
  }, [user, setTheme]);
  
  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Save theme preference if user is logged in
    if (user?.id) {
      try {
        await saveThemePreference(user.id, newTheme);
      } catch (error) {
        console.error("Error saving theme preference:", error);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-4">
        <div>
          {!serviceWorkerReady && (
            <Button
              variant="outline"
              size="sm"
              onClick={registerServiceWorker}
              disabled={isRegistering}
              className="mr-2"
            >
              {isRegistering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                "Enable Notifications"
              )}
            </Button>
          )}
        </div>
        
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
