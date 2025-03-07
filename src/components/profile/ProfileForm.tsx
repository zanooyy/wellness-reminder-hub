
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Profile } from "@/utils/supabase";
import { toast } from "sonner";
import { Save } from "lucide-react";

export function ProfileForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<Profile>>({
    name: "",
    age: null,
    gender: "",
    height: null,
    weight: null,
    physical_issues: "",
    contact_number: "",
  });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setProfile({
            name: data.name,
            age: data.age,
            gender: data.gender,
            height: data.height,
            weight: data.weight,
            physical_issues: data.physical_issues,
            contact_number: data.contact_number,
          });
        }
      } catch (error: any) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value === "" ? null : Number(value) }));
  };

  const handleGenderChange = (value: string) => {
    setProfile((prev) => ({ ...prev, gender: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            ...profile,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (error) throw error;
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-primary">Loading profile...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-input-wrapper">
          <Label htmlFor="name" className="form-label">Full Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="John Doe"
            value={profile.name || ""}
            onChange={handleChange}
          />
        </div>

        <div className="form-input-wrapper">
          <Label htmlFor="age" className="form-label">Age</Label>
          <Input
            id="age"
            name="age"
            type="number"
            min="0"
            placeholder="30"
            value={profile.age === null ? "" : profile.age}
            onChange={handleNumberChange}
          />
        </div>

        <div className="form-input-wrapper">
          <Label htmlFor="gender" className="form-label">Gender</Label>
          <Select value={profile.gender || ""} onValueChange={handleGenderChange}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="form-input-wrapper">
          <Label htmlFor="contact_number" className="form-label">Contact Number</Label>
          <Input
            id="contact_number"
            name="contact_number"
            placeholder="+1234567890"
            value={profile.contact_number || ""}
            onChange={handleChange}
          />
        </div>

        <div className="form-input-wrapper">
          <Label htmlFor="height" className="form-label">Height (cm)</Label>
          <Input
            id="height"
            name="height"
            type="number"
            min="0"
            placeholder="175"
            value={profile.height === null ? "" : profile.height}
            onChange={handleNumberChange}
          />
        </div>

        <div className="form-input-wrapper">
          <Label htmlFor="weight" className="form-label">Weight (kg)</Label>
          <Input
            id="weight"
            name="weight"
            type="number"
            min="0"
            placeholder="70"
            value={profile.weight === null ? "" : profile.weight}
            onChange={handleNumberChange}
          />
        </div>
      </div>

      <div className="form-input-wrapper">
        <Label htmlFor="physical_issues" className="form-label">Physical Issues or Conditions</Label>
        <Textarea
          id="physical_issues"
          name="physical_issues"
          placeholder="Describe any physical issues or medical conditions..."
          value={profile.physical_issues || ""}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <Button type="submit" className="w-full md:w-auto" disabled={saving}>
        {saving ? (
          <span className="flex items-center">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
            Saving...
          </span>
        ) : (
          <span className="flex items-center">
            <Save className="mr-2 h-4 w-4" />
            Save Profile
          </span>
        )}
      </Button>
    </form>
  );
}
