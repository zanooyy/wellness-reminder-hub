
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Clock, Pill, ArrowUpDown, VolumeX, Volume2, Bell, Music, AlarmPlus
} from "lucide-react";
import { AddReminderButton } from "./ReminderForm";

interface ReminderControlsProps {
  sortOrder: "time" | "name";
  toggleSort: (field: "time" | "name") => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  notificationsEnabled: boolean;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<void>;
  onOpenSoundsDialog: () => void;
  onAddReminder: () => void;
}

export function ReminderControls({
  sortOrder,
  toggleSort,
  soundEnabled,
  toggleSound,
  notificationsEnabled,
  notificationPermission,
  requestNotificationPermission,
  onOpenSoundsDialog,
  onAddReminder
}: ReminderControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center space-x-2 mr-2">
        <button 
          className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={toggleSound}
          aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
        >
          {soundEnabled ? (
            <><Volume2 className="h-4 w-4" /><span className="hidden sm:inline">Sound On</span></>
          ) : (
            <><VolumeX className="h-4 w-4" /><span className="hidden sm:inline">Sound Off</span></>
          )}
        </button>
      </div>
      
      <div className="flex items-center space-x-2 mr-2">
        <button 
          className={`flex items-center space-x-2 text-sm ${notificationsEnabled ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`}
          onClick={requestNotificationPermission}
          disabled={notificationPermission === "denied"}
        >
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">
            {notificationPermission === "denied" 
              ? "Notifications Blocked" 
              : notificationsEnabled 
                ? "Notifications On" 
                : "Enable Notifications"}
          </span>
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("time")}
          className="flex items-center gap-1 text-xs"
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Time</span>
          <ArrowUpDown className={`h-3 w-3 ${sortOrder === "time" ? "opacity-100" : "opacity-50"}`} />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("name")}
          className="flex items-center gap-1 text-xs"
        >
          <Pill className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Name</span>
          <ArrowUpDown className={`h-3 w-3 ${sortOrder === "name" ? "opacity-100" : "opacity-50"}`} />
        </Button>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenSoundsDialog}
        className="flex items-center gap-1"
      >
        <Music className="h-4 w-4" />
        <span className="hidden sm:inline">Ringtones</span>
      </Button>
      
      <AddReminderButton onClick={onAddReminder} />
    </div>
  );
}
