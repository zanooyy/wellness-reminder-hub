
import React, { useState } from "react";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, Radio } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Music, VolumeX, Volume, Volume2, Plus, X, ArrowLeft } from "lucide-react";
import { notificationSounds, soundCategories } from "../hooks/useReminderSounds";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

interface NotificationSettingsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedSound: string;
  soundEnabled: boolean;
  volume?: number;
  customSounds?: Array<{id: string, name: string, url: string, category: string}>;
  onSelectSound: (soundId: string) => void;
  onToggleSound: (enabled: boolean) => void;
  onTestSound: (soundId?: string) => void;
  onChangeVolume?: (volume: number) => void;
  onAddCustomSound?: (name: string, url: string) => any;
  onRemoveCustomSound?: (id: string) => void;
}

export function NotificationSettingsDialog({
  open,
  setOpen,
  selectedSound,
  soundEnabled,
  volume = 80,
  customSounds = [],
  onSelectSound,
  onToggleSound,
  onTestSound,
  onChangeVolume,
  onAddCustomSound,
  onRemoveCustomSound
}: NotificationSettingsDialogProps) {
  const [newSoundName, setNewSoundName] = useState("");
  const [newSoundUrl, setNewSoundUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState("built-in");
  
  const handleAddSound = () => {
    if (!newSoundName || !newSoundUrl) {
      toast.error("Please provide both name and URL for the custom sound");
      return;
    }
    
    try {
      // Test if URL is valid by creating an audio element
      const audio = new Audio(newSoundUrl);
      
      // Test the audio to make sure it works
      audio.volume = 0.2; // Low volume for testing
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Audio is playing successfully
          setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
            
            if (onAddCustomSound) {
              const newSound = onAddCustomSound(newSoundName, newSoundUrl);
              toast.success(`Added "${newSoundName}" to custom sounds`);
              onSelectSound(newSound.id);
              setNewSoundName("");
              setNewSoundUrl("");
              setShowAddForm(false);
            }
          }, 1000); // Play for 1 second to verify sound
        }).catch(error => {
          toast.error("Error playing sound. Please check the URL and try again.");
          console.error("Error testing sound:", error);
        });
      }
    } catch (error) {
      toast.error("Invalid sound URL. Please provide a valid audio file URL");
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (onChangeVolume) {
      onChangeVolume(value[0]);
    }
  };
  
  // Get volume icon based on level
  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="h-4 w-4" />;
    if (volume < 50) return <Volume className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <Music className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Ringtones</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Reminder Ringtone Settings</DialogTitle>
          <DialogDescription>
            Choose a sound for your medicine reminders
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue="built-in" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="mt-2"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="built-in">Built-in Sounds</TabsTrigger>
            <TabsTrigger value="custom">Custom Sounds</TabsTrigger>
          </TabsList>
          
          <TabsContent value="built-in" className="py-4">
            <div className="space-y-4">
              <RadioGroup 
                value={selectedSound} 
                onValueChange={onSelectSound}
                className="space-y-6"
              >
                {Object.entries(soundCategories).map(([category, sounds]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
                    
                    <div className="space-y-3">
                      {sounds.map((sound) => (
                        <div key={sound.id} className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                          <div className="flex items-center space-x-2">
                            <Radio value={sound.id} id={sound.id} />
                            <Label htmlFor={sound.id} className="font-medium cursor-pointer">
                              {sound.name}
                            </Label>
                          </div>
                          
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              onTestSound(sound.id);
                            }}
                          >
                            Test
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </TabsContent>
          
          <TabsContent value="custom" className="py-4">
            <div className="space-y-4">
              {customSounds.length > 0 ? (
                <RadioGroup 
                  value={selectedSound} 
                  onValueChange={onSelectSound}
                  className="space-y-3"
                >
                  {customSounds.map((sound) => (
                    <div key={sound.id} className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Radio value={sound.id} id={sound.id} />
                        <Label htmlFor={sound.id} className="font-medium cursor-pointer">
                          {sound.name}
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            onTestSound(sound.id);
                          }}
                        >
                          Test
                        </Button>
                        
                        {onRemoveCustomSound && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => onRemoveCustomSound(sound.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No custom sounds added yet
                </div>
              )}
              
              <Separator />
              
              {showAddForm ? (
                <div className="space-y-3 border p-4 rounded-md">
                  <h3 className="text-sm font-medium">Add Custom Sound</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sound-name">Sound Name</Label>
                    <Input 
                      id="sound-name"
                      value={newSoundName}
                      onChange={(e) => setNewSoundName(e.target.value)}
                      placeholder="Enter sound name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sound-url">Sound URL</Label>
                    <Input 
                      id="sound-url"
                      value={newSoundUrl}
                      onChange={(e) => setNewSoundUrl(e.target.value)}
                      placeholder="https://example.com/sound.mp3"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL to an MP3 or WAV file
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewSoundName("");
                        setNewSoundUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      size="sm"
                      onClick={handleAddSound}
                    >
                      Add Sound
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Sound
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="volume-slider" className="flex items-center gap-2">
                {getVolumeIcon()}
                Volume
              </Label>
              <span className="text-sm text-muted-foreground">{volume}%</span>
            </div>
            
            <Slider
              id="volume-slider"
              defaultValue={[volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              checked={soundEnabled}
              onCheckedChange={onToggleSound}
              id="sound-enabled"
            />
            <Label htmlFor="sound-enabled">Enable sounds</Label>
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button 
            onClick={() => {
              // Save sound preferences
              localStorage.setItem('reminderSound', selectedSound);
              localStorage.setItem('soundEnabled', soundEnabled.toString());
              setOpen(false);
              toast.success("Sound settings saved");
            }}
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
