
import React from "react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlarmClockCheck, AlarmPlus } from "lucide-react";

interface EmptyRemindersProps {
  onAddReminder: () => void;
}

export function EmptyReminders({ onAddReminder }: EmptyRemindersProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <AlarmClockCheck className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="text-xl mb-2">No reminders yet</CardTitle>
        <CardDescription className="max-w-md mb-4">
          Create your first medicine reminder to stay on top of your medication schedule.
        </CardDescription>
        <Button onClick={onAddReminder}>
          <AlarmPlus className="mr-2 h-4 w-4" />
          Add Your First Reminder
        </Button>
      </CardContent>
    </Card>
  );
}
