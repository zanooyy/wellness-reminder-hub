
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Note } from "@/utils/supabase";
import { toast } from "sonner";
import { ArrowLeft, Save, Image, X } from "lucide-react";

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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(
    note?.image_urls ? JSON.parse(note.image_urls) : []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setSelectedImages(prev => [...prev, ...newFiles]);
      
      // Create object URLs for preview
      const newImageUrls = newFiles.map(file => URL.createObjectURL(file));
      setImageUrls(prev => [...prev, ...newImageUrls]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
    
    setImageUrls(prev => {
      const newUrls = [...prev];
      // Revoke the object URL to avoid memory leaks
      if (prev[index] && prev[index].startsWith('blob:')) {
        URL.revokeObjectURL(prev[index]);
      }
      newUrls.splice(index, 1);
      return newUrls;
    });
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) return [];

    const uploadPromises = selectedImages.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `medicine-images/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      const { data } = supabase.storage
        .from('notes')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    });

    return Promise.all(uploadPromises);
  };

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
      let uploadedImageUrls: string[] = [];
      
      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadImages();
      }
      
      // Combine existing images (that weren't newly uploaded) with new ones
      const finalImageUrls = [...imageUrls.filter(url => !url.startsWith('blob:')), ...uploadedImageUrls];
      
      if (note) {
        // Update existing note
        const { data, error } = await supabase
          .from("notes")
          .update({
            title,
            content,
            updated_at: now,
            image_urls: JSON.stringify(finalImageUrls),
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
            image_urls: JSON.stringify(finalImageUrls),
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
        
        {/* Image upload section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Medicine Images</label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="mr-2 h-4 w-4" />
              Add Images
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelection}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>
          
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={url} 
                    alt={`Medicine ${index + 1}`} 
                    className="h-24 w-full object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
