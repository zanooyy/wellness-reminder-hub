// Service Worker for background notifications and alarms
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  console.log('Service Worker activated');
  
  // Create IndexedDB for storing reminder information directly in the service worker
  const request = indexedDB.open('serviceWorkerDB', 1);
  
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('reminders')) {
      db.createObjectStore('reminders', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('alarms')) {
      db.createObjectStore('alarms', { keyPath: 'id' });
    }
  };
  
  request.onsuccess = () => {
    console.log('Service Worker DB initialized');
  };
});

// Store scheduled notifications
const scheduledNotifications = new Map();
const activeAlarms = new Map();
const snoozedReminders = new Map();

// Keep track of last sync time
let lastSyncTime = Date.now();
let isOnline = true;

// Set up periodic sync for reminders (every 15 minutes)
setInterval(() => {
  loadRemindersFromIndexedDB().then(reminders => {
    if (reminders && reminders.length > 0) {
      console.log('Periodic check for scheduled reminders, found:', reminders.length);
      scheduleRemindersFromIndexedDB(reminders);
    }
  });
}, 15 * 60 * 1000);

// Check online status periodically
setInterval(() => {
  fetch('/favicon.ico', { cache: 'no-store' })
    .then(() => {
      if (!isOnline) {
        console.log('Service worker is now online');
        isOnline = true;
      }
    })
    .catch(() => {
      if (isOnline) {
        console.log('Service worker is now offline');
        isOnline = false;
      }
    });
}, 30000);

// Handle messages from the main application
self.addEventListener('message', (event) => {
  if (!event.data) return;
  
  console.log('Service Worker received message:', event.data.type);
  
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, time, medicine, dosage, frequency } = event.data.payload;
    console.log(`Scheduling notification: ${title} in ${time}ms (${Math.round(time/60000)} minutes)`);
    
    // Cancel any existing notification with the same ID
    if (scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
    }
    
    // Store reminder in IndexedDB for persistence
    storeReminderInIndexedDB({
      id,
      title,
      body,
      scheduledTime: Date.now() + time,
      medicine,
      dosage,
      frequency
    });
    
    // Schedule notification with precise timing
    const timerId = setTimeout(() => {
      showNotification(id, title, body, { id, medicine, dosage, frequency });
    }, time);
    
    scheduledNotifications.set(id, timerId);
    
  } else if (event.data.type === 'SNOOZE_NOTIFICATION') {
    const { id, snoozeUntil } = event.data.payload;
    handleSnooze(id, snoozeUntil);
  } else if (event.data.type === 'CANCEL_NOTIFICATION') {
    const { id } = event.data.payload;
    cancelNotification(id);
  } else if (event.data.type === 'SYNC_REMINDERS') {
    const { reminders } = event.data.payload;
    syncReminders(reminders);
  } else if (event.data.type === 'KEEPALIVE') {
    handleKeepalive();
  }
});

// Show notification
function showNotification(id, title, body, data) {
  console.log(`Showing notification: ${title}`);
  
  // Try to play a sound even when app is in background
  try {
    // We can only play audio from the service worker if the user has interacted with the page
    if ('audioContext' in self) {
      const oscillator = self.audioContext.createOscillator();
      oscillator.connect(self.audioContext.destination);
      oscillator.frequency.value = 440;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 1000);
    }
  } catch (e) {
    console.error('Failed to play sound in service worker', e);
  }
  
  // Show the notification
  self.registration.showNotification(title, {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: id,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'snooze',
        title: 'Snooze 5 min'
      },
      {
        action: 'taken',
        title: 'Taken'
      }
    ],
    data
  });
  
  scheduledNotifications.delete(id);
  activeAlarms.set(id, Date.now());
}

// Handle snooze
function handleSnooze(id, snoozeUntil) {
  // Cancel the existing notification
  if (scheduledNotifications.has(id)) {
    clearTimeout(scheduledNotifications.get(id));
    scheduledNotifications.delete(id);
  }
  
  if (activeAlarms.has(id)) {
    activeAlarms.delete(id);
  }
  
  // Set snooze
  snoozedReminders.set(id, snoozeUntil);
  
  // Store snooze info in IndexedDB
  storeSnoozeInIndexedDB(id, snoozeUntil);
  
  console.log(`Notification ${id} snoozed until ${new Date(snoozeUntil).toLocaleTimeString()}`);
}

// Cancel notification
function cancelNotification(id) {
  if (scheduledNotifications.has(id)) {
    clearTimeout(scheduledNotifications.get(id));
    scheduledNotifications.delete(id);
    console.log(`Notification ${id} cancelled`);
  }
  
  if (activeAlarms.has(id)) {
    activeAlarms.delete(id);
  }
  
  if (snoozedReminders.has(id)) {
    snoozedReminders.delete(id);
  }
  
  // Remove from IndexedDB
  removeReminderFromIndexedDB(id);
}

// Sync reminders
function syncReminders(reminders) {
  console.log(`Service worker syncing ${reminders.length} reminders`);
  lastSyncTime = Date.now();
  
  // Sync all reminders to IndexedDB for persistence
  storeRemindersInIndexedDB(reminders);
  
  // Schedule all reminders for background notifications
  reminders.forEach(reminder => {
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    let delayMs = reminderTime.getTime() - now.getTime();
    
    // Skip if reminder is snoozed
    if (snoozedReminders.has(reminder.id)) {
      const snoozeUntil = snoozedReminders.get(reminder.id);
      if (snoozeUntil > now.getTime()) {
        console.log(`Reminder ${reminder.id} is snoozed until ${new Date(snoozeUntil).toLocaleTimeString()}`);
        return;
      } else {
        // Snooze expired
        snoozedReminders.delete(reminder.id);
      }
    }
    
    // If time already passed today, schedule for tomorrow
    if (delayMs < 0) {
      delayMs += 24 * 60 * 60 * 1000; // Add 24 hours
    }
    
    if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
      // Schedule new notification
      console.log(`Scheduling notification for ${reminder.medicine_name} in ${Math.round(delayMs/60000)} minutes`);
      
      // Cancel any existing notification for this reminder
      if (scheduledNotifications.has(reminder.id)) {
        clearTimeout(scheduledNotifications.get(reminder.id));
        scheduledNotifications.delete(reminder.id);
      }
      
      // Set up the notification directly
      const timerId = setTimeout(() => {
        showNotification(
          reminder.id,
          `Medicine Reminder: ${reminder.medicine_name}`,
          reminder.dosage ? `Dosage: ${reminder.dosage}` : "Time to take your medicine",
          {
            id: reminder.id,
            medicine: reminder.medicine_name,
            dosage: reminder.dosage,
            frequency: reminder.frequency
          }
        );
      }, delayMs);
      
      scheduledNotifications.set(reminder.id, timerId);
    }
  });
}

// Handle keepalive
function handleKeepalive() {
  console.log('Service worker keepalive received at:', new Date().toLocaleTimeString());
  
  // Check if reminders need to be synced (if it's been more than 30 minutes)
  const timeSinceLastSync = Date.now() - lastSyncTime;
  if (timeSinceLastSync > 30 * 60 * 1000) {
    // Reload reminders from IndexedDB and reschedule
    loadRemindersFromIndexedDB().then(reminders => {
      if (reminders && reminders.length > 0) {
        console.log('Reloading reminders from IndexedDB after long idle period');
        scheduleRemindersFromIndexedDB(reminders);
      }
    });
  }
}

// Store reminder in IndexedDB
function storeReminderInIndexedDB(reminderData) {
  const request = indexedDB.open('serviceWorkerDB', 1);
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(['reminders'], 'readwrite');
    const store = transaction.objectStore('reminders');
    
    store.put(reminderData);
    
    transaction.oncomplete = () => {
      console.log('Reminder stored in IndexedDB:', reminderData.id);
    };
    
    transaction.onerror = (error) => {
      console.error('Error storing reminder in IndexedDB:', error);
    };
  };
}

// Store multiple reminders in IndexedDB
function storeRemindersInIndexedDB(reminders) {
  const request = indexedDB.open('serviceWorkerDB', 1);
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(['reminders'], 'readwrite');
    const store = transaction.objectStore('reminders');
    
    // Clear existing and add all reminders
    store.clear();
    
    reminders.forEach(reminder => {
      store.put({
        id: reminder.id,
        title: `Medicine Reminder: ${reminder.medicine_name}`,
        body: reminder.dosage ? `Dosage: ${reminder.dosage}` : "Time to take your medicine",
        medicine: reminder.medicine_name,
        dosage: reminder.dosage,
        frequency: reminder.frequency,
        time: reminder.time,
        // Store the next occurrence time for more reliable scheduling
        scheduledTime: getNextOccurrenceTime(reminder.time)
      });
    });
    
    transaction.oncomplete = () => {
      console.log(`${reminders.length} reminders stored in IndexedDB`);
    };
    
    transaction.onerror = (error) => {
      console.error('Error storing reminders in IndexedDB:', error);
    };
  };
}

// Calculate the next occurrence time for a given time string (HH:MM)
function getNextOccurrenceTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  // If the time has already passed today, schedule for tomorrow
  if (reminderTime < now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }
  
  return reminderTime.getTime();
}

// Store snooze info in IndexedDB
function storeSnoozeInIndexedDB(id, snoozeUntil) {
  const request = indexedDB.open('serviceWorkerDB', 1);
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(['alarms'], 'readwrite');
    const store = transaction.objectStore('alarms');
    
    store.put({
      id,
      snoozeUntil,
      type: 'snooze'
    });
  };
}

// Remove reminder from IndexedDB
function removeReminderFromIndexedDB(id) {
  const request = indexedDB.open('serviceWorkerDB', 1);
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(['reminders', 'alarms'], 'readwrite');
    const remindersStore = transaction.objectStore('reminders');
    const alarmsStore = transaction.objectStore('alarms');
    
    remindersStore.delete(id);
    alarmsStore.delete(id);
  };
}

// Load reminders from IndexedDB
function loadRemindersFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('serviceWorkerDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('reminders')) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(['reminders'], 'readonly');
      const store = transaction.objectStore('reminders');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result);
      };
      
      getAllRequest.onerror = (error) => {
        console.error('Error loading reminders from IndexedDB:', error);
        resolve([]);
      };
    };
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      resolve([]);
    };
  });
}

// Schedule reminders from IndexedDB data
function scheduleRemindersFromIndexedDB(reminders) {
  reminders.forEach(reminder => {
    // Skip if no time property (for compatibility with old format)
    if (!reminder.time && !reminder.scheduledTime) return;
    
    let delayMs;
    
    if (reminder.scheduledTime) {
      // Absolute scheduled time
      delayMs = reminder.scheduledTime - Date.now();
    } else {
      // Daily time format HH:MM
      delayMs = getNextOccurrenceTime(reminder.time) - Date.now();
    }
    
    // Only schedule if the time is in the future and within 24 hours
    if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
      console.log(`Scheduling stored reminder for ${reminder.id} in ${Math.round(delayMs/60000)} minutes`);
      
      // Cancel any existing notification for this reminder
      if (scheduledNotifications.has(reminder.id)) {
        clearTimeout(scheduledNotifications.get(reminder.id));
        scheduledNotifications.delete(reminder.id);
      }
      
      const timerId = setTimeout(() => {
        showNotification(
          reminder.id, 
          reminder.title || `Medicine Reminder`, 
          reminder.body || "Time to take your medicine", 
          reminder
        );
      }, delayMs);
      
      scheduledNotifications.set(reminder.id, timerId);
    }
  });
}

// Load snoozed reminders from IndexedDB
function loadSnoozedRemindersFromIndexedDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('serviceWorkerDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('alarms')) {
        resolve({});
        return;
      }
      
      const transaction = db.transaction(['alarms'], 'readonly');
      const store = transaction.objectStore('alarms');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const snoozedMap = {};
        getAllRequest.result.forEach(alarm => {
          if (alarm.type === 'snooze') {
            snoozedMap[alarm.id] = alarm.snoozeUntil;
          }
        });
        resolve(snoozedMap);
      };
      
      getAllRequest.onerror = () => {
        resolve({});
      };
    };
    
    request.onerror = () => {
      resolve({});
    };
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const notificationData = notification.data;
  const action = event.action;
  
  console.log('Notification clicked:', notification.tag, 'Action:', action);
  notification.close();
  
  if (action === 'snooze') {
    // Snooze for 5 minutes
    const snoozeTime = Date.now() + 5 * 60 * 1000;
    handleSnooze(notificationData.id, snoozeTime);
    
    // Create new timeout for reminder
    const timerId = setTimeout(() => {
      showNotification(
        notificationData.id,
        `Medicine Reminder: ${notificationData.medicine}`,
        notificationData.dosage ? `Dosage: ${notificationData.dosage}` : "Time to take your medicine",
        notificationData
      );
    }, 5 * 60 * 1000);
    
    scheduledNotifications.set(notificationData.id, timerId);
    
  } else if (action === 'taken') {
    // Mark as taken
    if (activeAlarms.has(notificationData.id)) {
      activeAlarms.delete(notificationData.id);
    }
    
    // Remove from snoozed if it was there
    if (snoozedReminders.has(notificationData.id)) {
      snoozedReminders.delete(notificationData.id);
    }
  }
  
  // Focus on or open a window when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            payload: {
              id: notificationData.id,
              action: action
            }
          });
          return client.focus();
        }
      }
      // If no window/tab is open, open one
      if (clients.openWindow) {
        return clients.openWindow('/reminders');
      }
    })
  );
});

// Handle notification closing
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// On service worker activation, load saved data from IndexedDB
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      loadRemindersFromIndexedDB().then(reminders => {
        if (reminders && reminders.length > 0) {
          console.log('Loaded and scheduling', reminders.length, 'reminders from IndexedDB');
          scheduleRemindersFromIndexedDB(reminders);
        }
      }),
      loadSnoozedRemindersFromIndexedDB().then(snoozedMap => {
        Object.entries(snoozedMap).forEach(([id, snoozeTime]) => {
          if (snoozeTime > Date.now()) {
            snoozedReminders.set(id, snoozeTime);
          }
        });
      })
    ])
  );
});

// Set up offline functionality with improved cache handling
const CACHE_NAME = 'reminder-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html'
];

// Cache core assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle network requests with offline support
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.includes(self.location.origin)) {
    return;
  }
  
  // Skip requests to the Supabase API
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  // Network-first strategy for API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            // Cache the fetched resource
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(() => {
            // If navigation request fails when offline, show offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            return new Response(
              'Network error, cannot fetch resource',
              { status: 503, headers: { 'Content-Type': 'text/plain' } }
            );
          });
      })
  );
});

// Background sync for when the app comes back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'reminder-sync') {
    console.log('Background sync for reminders triggered');
    event.waitUntil(
      clients.matchAll().then((clients) => {
        if (clients && clients.length) {
          clients[0].postMessage({
            type: 'SYNC_REMINDERS'
          });
        } else {
          // No clients available, load reminders from IndexedDB
          loadRemindersFromIndexedDB().then(reminders => {
            if (reminders && reminders.length > 0) {
              scheduleRemindersFromIndexedDB(reminders);
            }
          });
        }
      })
    );
  }
});

// Wake lock for keeping the service worker active
setInterval(() => {
  console.log('Service worker heartbeat - keeping active at', new Date().toLocaleTimeString());
  
  // Check if any reminders are due soon
  const now = Date.now();
  loadRemindersFromIndexedDB().then(reminders => {
    const upcomingReminders = reminders.filter(reminder => {
      if (!reminder.scheduledTime) return false;
      const timeUntil = reminder.scheduledTime - now;
      return timeUntil > 0 && timeUntil < 30 * 60 * 1000; // Due within 30 minutes
    });
    
    if (upcomingReminders.length > 0) {
      console.log(`${upcomingReminders.length} reminders due within 30 minutes`);
      
      // If there are upcoming reminders, make sure they are scheduled
      scheduleRemindersFromIndexedDB(upcomingReminders);
      
      // Try to wake the app to ensure alarm delivery
      if ('wakelock' in navigator) {
        try {
          // @ts-ignore - Wake Lock API is still experimental
          navigator.wakelock.request('screen')
            .then(lock => {
              setTimeout(() => lock.release(), 5000);
            })
            .catch(err => console.log('Wake lock request failed:', err));
        } catch (e) {
          console.log('Wake lock API error:', e);
        }
      }
    }
  });
}, 10 * 60 * 1000); // Run every 10 minutes
