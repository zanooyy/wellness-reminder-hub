
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Note } from "@/utils/supabase";
import { NoteEditor } from "./NoteEditor";
import { toast } from "sonner";
import { 
  FilePlus, FileText, Pencil, Trash, Clock, Search, StickyNote
} from "lucide-react";
import { Input } from "@/components/ui/input";

export function NotesList() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Fetch notes on component mount
  useEffect(() => {
    if (!user) return;
    
    fetchNotes();
  }, [user]);

  // Filter notes based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredNotes(notes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(
        notes.filter(
          (note) =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, notes]);

  // Fetch notes from Supabase
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setNotes(data || []);
      setFilteredNotes(data || []);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  // Create a new note
  const createNote = () => {
    setSelectedNote(null);
    setShowEditor(true);
  };

  // Edit an existing note
  const editNote = (note: Note) => {
    setSelectedNote(note);
    setShowEditor(true);
  };

  // Delete a note
  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setNotes(notes.filter(note => note.id !== id));
      toast.success("Note deleted successfully");
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  // Handle save from editor
  const handleSaveNote = (savedNote: Note) => {
    if (selectedNote) {
      // Update existing note in the list
      setNotes(notes.map(note => note.id === savedNote.id ? savedNote : note));
    } else {
      // Add new note to the list
      setNotes([savedNote, ...notes]);
    }
    setShowEditor(false);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (showEditor) {
    return (
      <NoteEditor
        note={selectedNote}
        onSave={handleSaveNote}
        onCancel={() => setShowEditor(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">My Notes</h1>
          <p className="text-muted-foreground">
            Keep track of your thoughts and health observations
          </p>
        </div>
        
        <Button onClick={createNote}>
          <FilePlus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-primary">Loading notes...</div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">
              {searchQuery ? "No matching notes" : "No notes yet"}
            </CardTitle>
            <CardDescription className="max-w-md mb-4">
              {searchQuery
                ? "Try a different search term or clear the search to see all notes."
                : "Create your first note to start tracking your health journey."}
            </CardDescription>
            {!searchQuery && (
              <Button onClick={createNote}>
                <FilePlus className="mr-2 h-4 w-4" />
                Create Your First Note
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="overflow-hidden animate-scale-in card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                    <span className="truncate">{note.title}</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => editNote(note)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pb-2">
                <p className="text-muted-foreground line-clamp-3">{note.content}</p>
              </CardContent>
              
              <CardFooter className="pt-2 text-xs text-muted-foreground border-t">
                <span className="flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {formatDate(note.created_at)}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
