
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// Available notification sounds with categories
export const notificationSounds = [
  // Bells category
  { id: "bell", name: "Bell", url: "/sounds/bell.mp3", category: "Bells" },
  { id: "chime", name: "Chime", url: "/sounds/chime.mp3", category: "Bells" },
  { id: "alert", name: "Alert", url: "/sounds/alert.mp3", category: "Alerts" },
  { id: "pill-time", name: "Pill Time", url: "/sounds/pill-time.mp3", category: "Alerts" },
  // Adding more sound options
  { id: "gentle-chime", name: "Gentle Chime", url: "/sounds/gentle-chime.mp3", category: "Bells" },
  { id: "soft-bell", name: "Soft Bell", url: "/sounds/soft-bell.mp3", category: "Bells" },
  { id: "medication-time", name: "Medication Time", url: "/sounds/medication-time.mp3", category: "Alerts" },
  { id: "soft-alert", name: "Soft Alert", url: "/sounds/soft-alert.mp3", category: "Alerts" },
  { id: "notification", name: "Notification", url: "/sounds/notification.mp3", category: "Alerts" },
];

// Group sounds by category
export const soundCategories = notificationSounds.reduce((acc, sound) => {
  if (!acc[sound.category]) {
    acc[sound.category] = [];
  }
  acc[sound.category].push(sound);
  return acc;
}, {} as Record<string, typeof notificationSounds>);

export function useReminderSounds() {
  // Create a reference to the audio element
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // State for sound preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState("bell");
  const [activeAlarms, setActiveAlarms] = useState<string[]>([]);
  const [volume, setVolume] = useState(80); // Default volume (0-100)
  const [customSounds, setCustomSounds] = useState<Array<{id: string, name: string, url: string, category: string}>>([]);
  
  // Effect to load preferences from localStorage
  useEffect(() => {
    const savedSound = localStorage.getItem('reminderSound');
    if (savedSound) {
      setSelectedSound(savedSound);
    }
    
    const savedSoundEnabled = localStorage.getItem('soundEnabled');
    if (savedSoundEnabled) {
      setSoundEnabled(savedSoundEnabled === 'true');
    }
    
    const savedVolume = localStorage.getItem('soundVolume');
    if (savedVolume) {
      setVolume(parseInt(savedVolume, 10));
    }
    
    const savedCustomSounds = localStorage.getItem('customSounds');
    if (savedCustomSounds) {
      try {
        setCustomSounds(JSON.parse(savedCustomSounds));
      } catch (e) {
        console.error("Error parsing custom sounds:", e);
      }
    }
  }, []);
  
  // Save volume to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('soundVolume', volume.toString());
  }, [volume]);
  
  // Save custom sounds to localStorage when they change
  useEffect(() => {
    if (customSounds.length > 0) {
      localStorage.setItem('customSounds', JSON.stringify(customSounds));
    }
  }, [customSounds]);

  // Add a custom sound
  const addCustomSound = (name: string, url: string) => {
    const id = `custom-${Math.random().toString(36).substring(2, 9)}`;
    const newSound = {
      id,
      name,
      url,
      category: "Custom"
    };
    
    setCustomSounds(prev => [...prev, newSound]);
    return newSound;
  };

  // Remove a custom sound
  const removeCustomSound = (id: string) => {
    setCustomSounds(prev => prev.filter(sound => sound.id !== id));
    
    // If the removed sound was selected, switch to default
    if (selectedSound === id) {
      setSelectedSound("bell");
      localStorage.setItem('reminderSound', "bell");
    }
  };
  
  // Get all available sounds (including custom ones)
  const getAllSounds = () => {
    return [...notificationSounds, ...customSounds];
  };
  
  // Play a sound for a specific reminder
  const playAlarmSound = (reminderId: string) => {
    if (!soundEnabled) return;
    
    try {
      // Check if we already have an active alarm for this reminder
      if (activeAlarms.includes(reminderId)) {
        return; // Sound is already playing for this reminder
      }
      
      // Find the selected sound
      const allSounds = getAllSounds();
      const sound = allSounds.find(s => s.id === selectedSound);
      if (!sound) return;
      
      // Create a new audio element for this alarm
      const audio = new Audio(sound.url);
      audio.volume = volume / 100; // Convert to 0-1 range
      
      // Set a reference to the audio if we don't have one yet
      if (!alarmAudioRef.current) {
        alarmAudioRef.current = audio;
      }
      
      // Set up event handlers
      audio.addEventListener('ended', () => {
        // Loop the sound
        if (activeAlarms.includes(reminderId)) {
          audio.play().catch(err => console.error("Error playing sound:", err));
        }
      });
      
      // Play the sound
      audio.play().then(() => {
        // Add this reminder to the active alarms list
        setActiveAlarms(prev => [...prev, reminderId]);
      }).catch(err => {
        console.error("Error playing sound:", err);
      });
    } catch (error) {
      console.error("Error playing alarm sound:", error);
      toast.error("Could not play notification sound");
    }
  };
  
  // Play a test sound
  const playTestSound = (soundId?: string) => {
    if (!soundEnabled) {
      toast.info("Sound is disabled. Enable sound to test.");
      return;
    }
    
    try {
      // Find the selected sound
      const allSounds = getAllSounds();
      const sound = allSounds.find(s => s.id === (soundId || selectedSound));
      if (!sound) return;
      
      // Create a new audio element for the test
      const audio = new Audio(sound.url);
      audio.volume = volume / 100; // Convert to 0-1 range
      
      // Play the sound
      audio.play().catch(err => {
        console.error("Error playing test sound:", err);
        toast.error("Could not play test sound");
      });
    } catch (error) {
      console.error("Error playing test sound:", error);
    }
  };
  
  // Stop all alarms
  const stopAllAlarms = () => {
    try {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
      setActiveAlarms([]);
    } catch (error) {
      console.error("Error stopping alarm sounds:", error);
    }
  };
  
  // Toggle sound on/off
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('soundEnabled', newValue.toString());
    
    if (!newValue) {
      // Stop all active sounds if we're disabling sound
      stopAllAlarms();
    }
  };
  
  return {
    soundEnabled,
    selectedSound,
    activeAlarms,
    alarmAudioRef,
    volume,
    customSounds,
    getAllSounds,
    setSoundEnabled,
    setSelectedSound,
    setVolume,
    playAlarmSound,
    playTestSound,
    stopAllAlarms,
    toggleSound,
    addCustomSound,
    removeCustomSound
  };
}
