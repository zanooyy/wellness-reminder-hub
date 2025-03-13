
import React from "react";
import { Reminder } from "@/utils/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Clock, Pill, MoveHorizontal, AlertCircle, Calendar, Bell } from "lucide-react";
import { formatTime, getBorderColor, isReminderDueSoon } from "../utils/reminderUtils";

interface ReminderCardProps {
  reminder: Reminder;
  isActive: boolean;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

export function ReminderCard({ reminder, isActive, onEdit, onDelete }: ReminderCardProps) {
  return (
    <Card 
      key={reminder.id} 
      className={`overflow-hidden hover:shadow-md transition-shadow border-l-4 ${
        isActive ? "animate-pulse" : ""
      }`} 
      style={{ borderLeftColor: getBorderColor(reminder.frequency) }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start justify-between">
          <div className="flex items-center">
            <Pill className="h-5 w-5 mr-2 text-primary" />
            <span className="truncate">{reminder.medicine_name}</span>
          </div>
          
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(reminder)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(reminder.id)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        
        {reminder.dosage && (
          <CardDescription className="mt-1 flex items-center">
            <MoveHorizontal className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            {reminder.dosage}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm font-medium">
            <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
            {formatTime(reminder.time)}
          </div>
          
          <div>{renderFrequencyBadge(reminder.frequency)}</div>
        </div>
        
        {reminder.notes && (
          <div className="mt-3 pt-3 border-t text-sm">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 mr-1.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{reminder.notes}</span>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-1 text-xs text-muted-foreground flex justify-between">
        <span className="flex items-center">
          <Calendar className="h-3.5 w-3.5 mr-1" />
          Created {new Date(reminder.created_at).toLocaleDateString()}
        </span>
        <span className="flex items-center">
          <Bell className="h-3.5 w-3.5 mr-1" />
          {isReminderDueSoon(reminder.time) ? (
            <span className="text-orange-500 font-medium">Due soon</span>
          ) : (
            <span>Scheduled</span>
          )}
        </span>
      </CardFooter>
    </Card>
  );
}

// Render frequency badge
function renderFrequencyBadge(frequency: string) {
  const getColor = () => {
    switch (frequency) {
      case 'daily': return 'bg-blue-100 text-blue-700';
      case 'weekly': return 'bg-purple-100 text-purple-700';
      case 'monthly': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getColor()}`}>
      {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
    </span>
  );
}
