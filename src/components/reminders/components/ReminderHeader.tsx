
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BatteryMedium, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ReminderHeaderProps {
  title: string;
  description?: string;
}

export function ReminderHeader({ title, description }: ReminderHeaderProps) {
  const [isAndroid, setIsAndroid] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if the device is Android
  useEffect(() => {
    const checkPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      setIsAndroid(/android/.test(userAgent));

      // Check if the user already dismissed the battery warning
      const batteryWarningDismissed = localStorage.getItem('batteryWarningDismissed');
      if (batteryWarningDismissed) {
        setDismissed(true);
      }
    };
    
    checkPlatform();
  }, []);

  const dismissWarning = () => {
    localStorage.setItem('batteryWarningDismissed', 'true');
    setDismissed(true);
  };

  return (
    <>
      <div className="flex items-center">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold mb-1">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {isAndroid && !dismissed && (
        <Alert className="mt-4 border-amber-500">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="flex items-center gap-2">
            <BatteryMedium className="h-4 w-4" /> Important for Android users
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              For reliable alarm notifications, please disable battery optimization for this app:
            </p>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>Go to <strong>Settings</strong> &gt; <strong>Apps</strong> &gt; <strong>This App</strong></li>
              <li>Tap on <strong>Battery</strong></li>
              <li>Select <strong>Don't optimize</strong> or <strong>Unrestricted</strong></li>
            </ol>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={dismissWarning}
            >
              I understand, don't show again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
