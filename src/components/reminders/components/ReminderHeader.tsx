
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ReminderHeaderProps {
  title: string;
  description?: string;
}

export function ReminderHeader({ title, description }: ReminderHeaderProps) {
  return (
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
  );
}
