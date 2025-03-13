
import { useState, useEffect, useRef } from "react";

// Available notification sounds
export const notificationSounds = [
  { id: "sound1", name: "Bell", url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" },
  { id: "sound2", name: "Chime", url: "https://assets.mixkit.co/active_storage/sfx/1531/1531-preview.mp3" },
  { id: "sound3", name: "Alert", url: "https://assets.mixkit.co/active_storage/sfx/1824/1824-preview.mp3" },
  { id: "sound4", name: "Soft", url: "https://assets.mixkit.co/active_storage/sfx/1821/1821-preview.mp3" },
];

export function useReminderSounds() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState<string>("sound1");
  const [activeAlarms, setActiveAlarms] = useState<string[]>([]);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load sound preferences from localStorage
  useEffect(() => {
    const savedSound = localStorage.getItem('reminderSound');
    if (savedSound) {
      setSelectedSound(savedSound);
    }
    
    const savedSoundEnabled = localStorage.getItem('soundEnabled');
    if (savedSoundEnabled !== null) {
      setSoundEnabled(savedSoundEnabled === 'true');
    }
  }, []);

  // Initialize audio element
  useEffect(() => {
    // Get the selected sound URL
    const soundUrl = notificationSounds.find(sound => sound.id === selectedSound)?.url || notificationSounds[0].url;
    
    // Create audio element for alarm
    alarmAudioRef.current = new Audio(soundUrl);
    alarmAudioRef.current.loop = false;
    
    // Clean up on component unmount
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current = null;
      }
    };
  }, [selectedSound]);

  // Save sound preferences when they change
  useEffect(() => {
    localStorage.setItem('reminderSound', selectedSound);
    localStorage.setItem('soundEnabled', soundEnabled.toString());
  }, [selectedSound, soundEnabled]);

  // Play alarm sound for a specific reminder
  const playAlarmSound = (reminderId: string) => {
    if (!soundEnabled || !alarmAudioRef.current) return;
    
    // Only play if not already playing for this reminder
    if (!activeAlarms.includes(reminderId)) {
      setActiveAlarms(prev => [...prev, reminderId]);
      
      // Update audio source with selected sound
      const soundUrl = notificationSounds.find(sound => sound.id === selectedSound)?.url || notificationSounds[0].url;
      if (alarmAudioRef.current && alarmAudioRef.current.src !== soundUrl) {
        alarmAudioRef.current.src = soundUrl;
      }
      
      // Play the alarm sound
      if (alarmAudioRef.current) {
        alarmAudioRef.current.currentTime = 0;
        alarmAudioRef.current.play()
          .catch(err => console.error("Error playing alarm sound:", err));
      }
      
      // Remove from active alarms after sound completes
      setTimeout(() => {
        setActiveAlarms(prev => prev.filter(id => id !== reminderId));
      }, 5000); // Assuming the alarm sound is around 5 seconds
    }
  };

  // Test selected sound
  const playTestSound = () => {
    if (!alarmAudioRef.current) return;
    
    // Update audio source with selected sound
    const soundUrl = notificationSounds.find(sound => sound.id === selectedSound)?.url || notificationSounds[0].url;
    if (alarmAudioRef.current && alarmAudioRef.current.src !== soundUrl) {
      alarmAudioRef.current.src = soundUrl;
    }
    
    // Play the test sound
    alarmAudioRef.current.currentTime = 0;
    alarmAudioRef.current.play()
      .catch(err => console.error("Error playing test sound:", err));
  };

  // Stop all alarm sounds
  const stopAllAlarms = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
    setActiveAlarms([]);
  };

  // Toggle sound
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    
    if (!soundEnabled) {
      localStorage.setItem('soundEnabled', 'true');
      toast.success("Alarm sounds enabled");
    } else {
      stopAllAlarms();
      localStorage.setItem('soundEnabled', 'false');
      toast.success("Alarm sounds disabled");
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
