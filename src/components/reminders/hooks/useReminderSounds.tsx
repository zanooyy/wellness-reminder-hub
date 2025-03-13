
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// Available notification sounds
export const notificationSounds = [
  { id: "bell", name: "Bell", url: "/sounds/bell.mp3" },
  { id: "chime", name: "Chime", url: "/sounds/chime.mp3" },
  { id: "alert", name: "Alert", url: "/sounds/alert.mp3" },
  { id: "pill-time", name: "Pill Time", url: "/sounds/pill-time.mp3" },
];

export function useReminderSounds() {
  // Create a reference to the audio element
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // State for sound preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState("bell");
  const [activeAlarms, setActiveAlarms] = useState<string[]>([]);
  
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
  }, []);
  
  // Play a sound for a specific reminder
  const playAlarmSound = (reminderId: string) => {
    if (!soundEnabled) return;
    
    try {
      // Check if we already have an active alarm for this reminder
      if (activeAlarms.includes(reminderId)) {
        return; // Sound is already playing for this reminder
      }
      
      // Find the selected sound
      const sound = notificationSounds.find(s => s.id === selectedSound);
      if (!sound) return;
      
      // Create a new audio element for this alarm
      const audio = new Audio(sound.url);
      
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
  const playTestSound = () => {
    if (!soundEnabled) {
      toast.info("Sound is disabled. Enable sound to test.");
      return;
    }
    
    try {
      // Find the selected sound
      const sound = notificationSounds.find(s => s.id === selectedSound);
      if (!sound) return;
      
      // Create a new audio element for the test
      const audio = new Audio(sound.url);
      
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
    setSoundEnabled,
    setSelectedSound,
    playAlarmSound,
    playTestSound,
    stopAllAlarms,
    toggleSound
  };
}
