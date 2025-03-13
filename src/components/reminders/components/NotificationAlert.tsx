
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NotificationPermissionAlertProps {
  notificationsEnabled: boolean;
  notificationPermission: NotificationPermission | "default";
  remindersExist: boolean;
  onRequestPermission: () => void;
}

export function NotificationPermissionAlert({
  notificationsEnabled,
  notificationPermission,
  remindersExist,
  onRequestPermission
}: NotificationPermissionAlertProps) {
  if (!remindersExist) {
    return null;
  }

  // Show notification permission prompt
  if (!notificationsEnabled && notificationPermission !== "denied") {
    return (
      <Card className="bg-blue-50 border-blue-200 mb-4">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-blue-500 mr-3" />
            <div>
              <p className="font-medium">Enable notifications</p>
              <p className="text-sm text-muted-foreground">Get notified about your medicine reminders even when you close this app</p>
            </div>
          </div>
          <Button size="sm" onClick={onRequestPermission}>
            Enable
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show notification blocked message
  if (notificationPermission === "denied" && remindersExist) {
    return (
      <Card className="bg-amber-50 border-amber-200 mb-4">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-3" />
            <div>
              <p className="font-medium">Notifications are blocked</p>
              <p className="text-sm text-muted-foreground">Please enable notifications in your browser settings to receive medicine reminders</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              toast.info(
                <div className="text-sm">
                  <p className="font-medium mb-1">How to enable notifications:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click the lock/info icon in your browser's address bar</li>
                    <li>Find "Notifications" settings</li>
                    <li>Change from "Block" to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>, 
                { duration: 10000 }
              );
            }}
          >
            Learn How
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
