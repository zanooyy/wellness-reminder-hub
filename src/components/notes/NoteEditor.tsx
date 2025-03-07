
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Note } from "@/utils/supabase";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

interface NoteEditorProps {
  note: Note | null;
  onSave: (note: Note) => void;
  onCancel: () => void;
}

export function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    setSaving(true);
    
    try {
      const now = new Date().toISOString();
      
      if (note) {
        // Update existing note
        const { data, error } = await supabase
          .from("notes")
          .update({
            title,
            content,
            updated_at: now,
          })
          .eq("id", note.id)
          .select()
          .single();

        if (error) throw error;
        
        toast.success("Note updated successfully");
        onSave(data as Note);
      } else {
        // Create new note
        const { data, error } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            title,
            content,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (error) throw error;
        
        toast.success("Note created successfully");
        onSave(data as Note);
      }
    } catch (error: any) {
      console.error("Error saving note:", error);
      toast.error(note ? "Failed to update note" : "Failed to create note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Notes
        </Button>
        <h1 className="text-xl font-semibold">{note ? "Edit Note" : "Create Note"}</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Note Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium"
          />
        </div>
        
        <div className="space-y-2">
          <Textarea
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px] resize-none"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <span className="flex items-center">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <Save className="mr-2 h-4 w-4" />
                Save Note
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
