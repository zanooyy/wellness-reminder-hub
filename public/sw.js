
// Service Worker for background notifications
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

// Handle messages from the main application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, time } = event.data.payload;
    console.log(`Scheduling notification: ${title} in ${time}ms`);
    
    // Cancel any existing notification with the same ID
    if (scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
    }
    
    // Schedule notification with precise timing
    const timerId = setTimeout(() => {
      console.log(`Showing notification: ${title}`);
      self.registration.showNotification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: id,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
      scheduledNotifications.delete(id);
    }, time);
    
    scheduledNotifications.set(id, timerId);
  } else if (event.data && event.data.type === 'SNOOZE_NOTIFICATION') {
    const { id, snoozeUntil } = event.data.payload;
    
    // Cancel the existing notification
    if (scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
    }
    
    console.log(`Notification ${id} snoozed until ${new Date(snoozeUntil).toLocaleTimeString()}`);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();
  
  // Focus on or open a window when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
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
