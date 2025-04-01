
import React from "react";
import { Reminder } from "@/utils/supabase";
import { ReminderCard } from "./ReminderCard";

interface ReminderListProps {
  reminders: Reminder[];
  activeAlarms: string[];
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
}

export function ReminderList({ 
  reminders, 
  activeAlarms, 
  onEdit, 
  onDelete, 
  onSnooze 
}: ReminderListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder.id}
          reminder={reminder}
          isActive={activeAlarms.includes(reminder.id)}
          onEdit={onEdit}
          onDelete={onDelete}
          onSnooze={onSnooze}
        />
      ))}
    </div>
  );
}
