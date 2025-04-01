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
  
  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error("Service workers are not supported in this browser");
      return;
    }
    
    try {
      setIsRegistering(true);
      
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.scope.includes('/')) {
          await registration.update();
          console.log('Updated existing service worker');
        }
      }
      
      const registration = await navigator.serviceWorker.register('/sw.js', { 
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('ServiceWorker registration successful with scope:', registration.scope);
      toast.success("Notification service started");
      
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
      
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success("Notifications enabled");
        } else {
          toast.warning("Notifications disabled. Some features may not work properly.");
        }
      }
      
    } catch (error) {
      console.error("Service worker registration failed:", error);
      toast.error("Failed to start notification service. Retrying...");
      
      setTimeout(() => {
        registerServiceWorker();
      }, 2000);
    } finally {
      setIsRegistering(false);
    }
  };
  
  useEffect(() => {
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
    
    if ('serviceWorker' in navigator) {
      const checkServiceWorker = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          const activeServiceWorker = registrations.find(reg => 
            reg.active && reg.scope.includes(window.location.origin)
          );
          
          if (activeServiceWorker) {
            console.log("Active service worker found:", activeServiceWorker.scope);
            setServiceWorkerReady(true);
            
            activeServiceWorker.update()
              .then(() => console.log("Service worker updated"))
              .catch(err => console.error("Error updating service worker:", err));
          } else {
            console.log("No active service worker found, registering...");
            registerServiceWorker();
          }
        } catch (error) {
          console.error("Error checking service worker:", error);
          registerServiceWorker();
        }
      };
      
      checkServiceWorker();
      
      const keepaliveInterval = setInterval(() => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'KEEPALIVE',
            payload: { timestamp: Date.now() }
          });
        }
      }, 60000);
      
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_REMINDERS') {
          console.log('Service worker requested reminders sync');
          window.dispatchEvent(new CustomEvent('sync-reminders'));
        }
      });
      
      return () => {
        clearInterval(keepaliveInterval);
      };
    }
  }, [user, setTheme]);
  
  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
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
