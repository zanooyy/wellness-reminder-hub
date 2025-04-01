
// Service Worker for background notifications and alarms
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  console.log('Service Worker activated');
});

// Store scheduled notifications
const scheduledNotifications = new Map();
const activeAlarms = new Map();
const snoozedReminders = new Map();

// Handle messages from the main application
self.addEventListener('message', (event) => {
  if (!event.data) return;
  
  console.log('Service Worker received message:', event.data.type);
  
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, time, medicine, dosage, frequency } = event.data.payload;
    console.log(`Scheduling notification: ${title} in ${time}ms`);
    
    // Cancel any existing notification with the same ID
    if (scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
    }
    
    // Schedule notification with precise timing
    const timerId = setTimeout(() => {
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
        data: {
          id,
          medicine,
          dosage,
          frequency
        }
      });
      
      scheduledNotifications.delete(id);
      activeAlarms.set(id, Date.now());
      
    }, time);
    
    scheduledNotifications.set(id, timerId);
    
  } else if (event.data.type === 'SNOOZE_NOTIFICATION') {
    const { id, snoozeUntil } = event.data.payload;
    
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
    
    console.log(`Notification ${id} snoozed until ${new Date(snoozeUntil).toLocaleTimeString()}`);
  } else if (event.data.type === 'CANCEL_NOTIFICATION') {
    const { id } = event.data.payload;
    
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
  } else if (event.data.type === 'SYNC_REMINDERS') {
    const { reminders } = event.data.payload;
    console.log(`Service worker syncing ${reminders.length} reminders`);
    
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
        
        // Don't use postMessage here as it's meant for client->worker communication
        // Instead, set up the notification directly
        const timerId = setTimeout(() => {
          self.registration.showNotification(`Medicine Reminder: ${reminder.medicine_name}`, {
            body: reminder.dosage ? `Dosage: ${reminder.dosage}` : "Time to take your medicine",
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: reminder.id,
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
            data: {
              id: reminder.id,
              medicine: reminder.medicine_name,
              dosage: reminder.dosage,
              frequency: reminder.frequency
            }
          });
          
          scheduledNotifications.delete(reminder.id);
          activeAlarms.set(reminder.id, Date.now());
        }, delayMs);
        
        scheduledNotifications.set(reminder.id, timerId);
      }
    });
  }
});

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
    snoozedReminders.set(notificationData.id, snoozeTime);
    
    // Create new timeout for reminder
    const timerId = setTimeout(() => {
      self.registration.showNotification(`Medicine Reminder: ${notificationData.medicine}`, {
        body: notificationData.dosage ? `Dosage: ${notificationData.dosage}` : "Time to take your medicine",
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notificationData.id,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: notificationData,
        actions: [
          {
            action: 'snooze',
            title: 'Snooze 5 min'
          },
          {
            action: 'taken',
            title: 'Taken'
          }
        ]
      });
      
      snoozedReminders.delete(notificationData.id);
    }, 5 * 60 * 1000);
    
    scheduledNotifications.set(notificationData.id, timerId);
    
  } else if (action === 'taken') {
    // Mark as taken
    if (activeAlarms.has(notificationData.id)) {
      activeAlarms.delete(notificationData.id);
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

// Store reminders in IndexedDB for offline support
let db;

// Open IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('remindersDB', 1);
    
    request.onerror = () => reject('Failed to open database');
    
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' });
      }
    };
  });
};

// Listen for periodic syncs if supported
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'reminder-sync') {
    console.log('Performing reminder sync');
    event.waitUntil(
      clients.matchAll().then((clients) => {
        if (clients && clients.length) {
          clients[0].postMessage({
            type: 'SYNC_REMINDERS'
          });
        } else {
          // No clients available, try to show pending notifications from IndexedDB
          openDB().then(() => {
            const transaction = db.transaction(['reminders'], 'readonly');
            const store = transaction.objectStore('reminders');
            const getAll = store.getAll();
            
            getAll.onsuccess = () => {
              const reminders = getAll.result;
              if (reminders && reminders.length) {
                // Handle the reminders directly in the service worker
                reminders.forEach(reminder => {
                  const [hours, minutes] = reminder.time.split(':').map(Number);
                  const reminderTime = new Date();
                  reminderTime.setHours(hours, minutes, 0, 0);
                  
                  const now = new Date();
                  let delayMs = reminderTime.getTime() - now.getTime();
                  
                  // If time already passed today, schedule for tomorrow
                  if (delayMs < 0) {
                    delayMs += 24 * 60 * 60 * 1000; // Add 24 hours
                  }
                  
                  if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
                    // Schedule notification
                    const timerId = setTimeout(() => {
                      self.registration.showNotification(`Medicine Reminder: ${reminder.medicine_name}`, {
                        body: reminder.dosage ? `Dosage: ${reminder.dosage}` : "Time to take your medicine",
                        icon: '/favicon.ico',
                        badge: '/favicon.ico',
                        tag: reminder.id,
                        renotify: true,
                        requireInteraction: true,
                        vibrate: [200, 100, 200]
                      });
                    }, delayMs);
                    
                    scheduledNotifications.set(reminder.id, timerId);
                  }
                });
              }
            };
          }).catch(err => console.error('Failed to access IndexedDB:', err));
        }
      })
    );
  }
});

// Background sync for when the app comes back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'reminder-sync') {
    console.log('Background sync for reminders');
    event.waitUntil(
      clients.matchAll().then((clients) => {
        if (clients && clients.length) {
          clients[0].postMessage({
            type: 'SYNC_REMINDERS'
          });
        }
      })
    );
  }
});

// Set up offline functionality
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Skip cross-origin requests
  if (!request.url.includes(self.location.origin)) {
    return;
  }
  
  // Basic offline handling
  event.respondWith(
    fetch(request).catch(() => {
      // Return cached assets when offline
      return caches.match(request).then(response => {
        if (response) {
          return response;
        }
        
        // For navigation requests, return the offline page
        if (request.mode === 'navigate') {
          return caches.match('/offline.html').then(offlineResponse => {
            return offlineResponse || new Response('You are offline and the page could not be loaded.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        }
        
        return new Response('Failed to load resource while offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
