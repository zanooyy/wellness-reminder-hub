
import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTime, getBorderColor, isReminderDueSoon } from "../utils/reminderUtils";
import { Pill, Clock, Trash2, Edit, Bell, AlarmClock, Image } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Reminder } from "@/utils/supabase";
import { SnoozeDialog } from "./SnoozeDialog";
import { toast } from "sonner";
import { useNotifications } from "../hooks/useNotifications";

interface ReminderCardProps {
  reminder: Reminder;
  isActive: boolean;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onSnooze?: (id: string, minutes: number) => void;
}

export function ReminderCard({ 
  reminder, 
  isActive, 
  onEdit, 
  onDelete,
  onSnooze 
}: ReminderCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const { snoozeReminder, isReminderSnoozed, getSnoozeRemaining } = useNotifications();
  
  const borderColor = getBorderColor(reminder.frequency);
  const dueSoon = isReminderDueSoon(reminder.time);
  
  // Check if reminder is snoozed
  const isSnoozed = isReminderSnoozed(reminder.id);
  const snoozeRemaining = getSnoozeRemaining(reminder.id);
  
  const handleSnooze = (minutes: number) => {
    snoozeReminder(reminder.id, minutes);
    if (onSnooze) {
      onSnooze(reminder.id, minutes);
    }
  };
  
  return (
    <>
      <Card 
        className={`overflow-hidden transition-all ${isActive ? 'shadow-lg animate-pulse border-red-500' : ''} ${dueSoon && !isSnoozed ? 'border-amber-500 border-2' : ''}`}
        style={{ borderLeftColor: borderColor, borderLeftWidth: '4px' }}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-3">
              {reminder.image_url && (
                <div className="w-12 h-12 rounded-md overflow-hidden border flex-shrink-0">
                  <img 
                    src={reminder.image_url} 
                    alt={reminder.medicine_name}
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg">{reminder.medicine_name}</h3>
                <div className="flex items-center text-muted-foreground mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatTime(reminder.time)}</span>
                  
                  {isSnoozed && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center">
                      <AlarmClock className="h-3 w-3 mr-1" />
                      Snoozed ({snoozeRemaining}m)
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex">
              {dueSoon && !isSnoozed && (
                <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center">
                  <Bell className="h-3 w-3 mr-1" />
                  Due soon
                </span>
              )}
            </div>
          </div>
          
          {reminder.dosage && (
            <div className="flex items-center mb-2 text-sm">
              <Pill className="h-4 w-4 mr-1 text-primary" />
              <span>{reminder.dosage}</span>
            </div>
          )}
          
          {reminder.notes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {reminder.notes}
            </p>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between bg-muted/50 px-4 py-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(reminder)}
              className="h-8 px-2 text-xs"
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-8 px-2 text-xs text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setSnoozeDialogOpen(true)}
          >
            <AlarmClock className="h-3.5 w-3.5 mr-1" />
            {isSnoozed ? `Snoozed (${snoozeRemaining}m)` : 'Snooze'}
          </Button>
        </CardFooter>
      </Card>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the reminder for {reminder.medicine_name}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDelete(reminder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <SnoozeDialog
        open={snoozeDialogOpen}
        setOpen={setSnoozeDialogOpen}
        reminderName={reminder.medicine_name}
        onSnooze={handleSnooze}
      />
    </>
  );
}
