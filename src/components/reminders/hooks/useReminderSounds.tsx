
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// Available notification sounds with categories
export const notificationSounds = [
  // Bells category
  { id: "bell", name: "Bell", url: "/sounds/bell.mp3", category: "Bells" },
  { id: "chime", name: "Chime", url: "/sounds/chime.mp3", category: "Bells" },
  { id: "gentle-chime", name: "Gentle Chime", url: "/sounds/gentle-chime.mp3", category: "Bells" },
  { id: "soft-bell", name: "Soft Bell", url: "/sounds/soft-bell.mp3", category: "Bells" },
  { id: "school-bell", name: "School Bell", url: "https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3", category: "Bells" },
  { id: "doorbell", name: "Doorbell", url: "https://assets.mixkit.co/active_storage/sfx/213/213-preview.mp3", category: "Bells" },
  
  // Alerts category
  { id: "alert", name: "Alert", url: "/sounds/alert.mp3", category: "Alerts" },
  { id: "pill-time", name: "Pill Time", url: "/sounds/pill-time.mp3", category: "Alerts" },
  { id: "medication-time", name: "Medication Time", url: "/sounds/medication-time.mp3", category: "Alerts" },
  { id: "soft-alert", name: "Soft Alert", url: "/sounds/soft-alert.mp3", category: "Alerts" },
  { id: "notification", name: "Notification", url: "/sounds/notification.mp3", category: "Alerts" },
  { id: "emergency", name: "Emergency", url: "https://assets.mixkit.co/active_storage/sfx/990/990-preview.mp3", category: "Alerts" },
  
  // Alarms category
  { id: "clock-alarm", name: "Clock Alarm", url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", category: "Alarms" },
  { id: "digital-alarm", name: "Digital Alarm", url: "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3", category: "Alarms" },
  { id: "morning-alarm", name: "Morning Alarm", url: "https://assets.mixkit.co/active_storage/sfx/2909/2909-preview.mp3", category: "Alarms" },
  { id: "buzzer", name: "Buzzer", url: "https://assets.mixkit.co/active_storage/sfx/259/259-preview.mp3", category: "Alarms" },
  
  // Tones category
  { id: "beep", name: "Beep", url: "https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3", category: "Tones" },
  { id: "ding", name: "Ding", url: "https://assets.mixkit.co/active_storage/sfx/2872/2872-preview.mp3", category: "Tones" },
  { id: "ping", name: "Ping", url: "https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3", category: "Tones" },
  { id: "positive", name: "Positive", url: "https://assets.mixkit.co/active_storage/sfx/221/221-preview.mp3", category: "Tones" },
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
  // Create references for audio elements
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // State for sound preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState("bell");
  const [activeAlarms, setActiveAlarms] = useState<string[]>([]);
  const [volume, setVolume] = useState(80); // Default volume (0-100)
  const [customSounds, setCustomSounds] = useState<Array<{id: string, name: string, url: string, category: string}>>([]);
  const [soundLoaded, setSoundLoaded] = useState(false);
  
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
    
    setSoundLoaded(true);
  }, []);
  
  // Save volume to localStorage when it changes
  useEffect(() => {
    if (soundLoaded) {
      localStorage.setItem('soundVolume', volume.toString());
    }
  }, [volume, soundLoaded]);
  
  // Save custom sounds to localStorage when they change
  useEffect(() => {
    if (soundLoaded && customSounds.length > 0) {
      localStorage.setItem('customSounds', JSON.stringify(customSounds));
    }
  }, [customSounds, soundLoaded]);

  // Save selected sound and sound enabled to localStorage when they change
  useEffect(() => {
    if (soundLoaded) {
      localStorage.setItem('reminderSound', selectedSound);
      localStorage.setItem('soundEnabled', soundEnabled.toString());
    }
  }, [selectedSound, soundEnabled, soundLoaded]);

  // Preload sound when selectedSound changes
  useEffect(() => {
    if (!soundEnabled || !selectedSound) return;
    
    const preloadSound = () => {
      const allSounds = getAllSounds();
      const sound = allSounds.find(s => s.id === selectedSound);
      
      if (sound) {
        const audio = new Audio();
        audio.src = sound.url;
        audio.load();
      }
    };
    
    preloadSound();
  }, [selectedSound, soundEnabled]);

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
      audio.preload = "auto"; // Preload the audio
      
      // Set a reference to the audio if we don't have one yet
      if (!alarmAudioRef.current) {
        alarmAudioRef.current = audio;
      }
      
      // Set up event handlers
      audio.addEventListener('ended', () => {
        // Loop the sound
        if (activeAlarms.includes(reminderId)) {
          setTimeout(() => {
            audio.play().catch(err => console.error("Error playing sound:", err));
          }, 500); // Short delay between loops
        }
      });
      
      // Play the sound
      audio.play().then(() => {
        // Add this reminder to the active alarms list
        setActiveAlarms(prev => [...prev, reminderId]);
      }).catch(err => {
        console.error("Error playing sound:", err);
        // Try again with user interaction
        document.addEventListener('click', function playOnClick() {
          audio.play().catch(e => console.error("Still couldn't play sound:", e));
          document.removeEventListener('click', playOnClick);
        }, { once: true });
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
      // Stop any previous test sound
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current.currentTime = 0;
      }

      // Find the selected sound
      const allSounds = getAllSounds();
      const soundToPlay = soundId ? allSounds.find(s => s.id === soundId) : allSounds.find(s => s.id === selectedSound);
      
      if (!soundToPlay) {
        toast.error("Sound not found");
        return;
      }
      
      // Create a new audio element for the test
      const audio = new Audio(soundToPlay.url);
      audio.volume = volume / 100; // Convert to 0-1 range
      audio.preload = "auto";
      testAudioRef.current = audio;
      
      // Play the sound
      audio.play().catch(err => {
        console.error("Error playing test sound:", err, soundToPlay);
        toast.error(`Could not play test sound: ${soundToPlay.name}`);
        
        // Try again with user interaction
        toast.info("Click anywhere to try playing the sound again");
        document.addEventListener('click', function playOnClick() {
          audio.play().catch(e => console.error("Still couldn't play sound:", e));
          document.removeEventListener('click', playOnClick);
        }, { once: true });
      });
    } catch (error) {
      console.error("Error playing test sound:", error);
      toast.error("Could not play test sound");
    }
  };
  
  // Stop all alarms
  const stopAllAlarms = () => {
    try {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
        alarmAudioRef.current = null;
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
