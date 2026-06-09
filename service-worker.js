// ============================================================
//  service-worker.js — Firebase Cloud Messaging (background)
//  Les clés Firebase côté client ne sont pas secrètes.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config Firebase (identique à firebase-config.js — pas un secret côté client)
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDYHc-h55LpSqW61w45m2gLc8C9FkHMsBk',
  authDomain:        'cleanzr.firebaseapp.com',
  projectId:         'cleanzr',
  storageBucket:     'cleanzr.firebasestorage.app',
  messagingSenderId: '696526753906',
  appId:             '1:696526753906:web:db0a49426eb57489c9b2eb',
};

// Initialisation immédiate — obligatoire avant tout event listener push
firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

// Notifications reçues quand l'app est en arrière-plan ou fermée
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Cleanzr';
  const body  = payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon:    '/assets/icons/icon-192.png',
    badge:   '/assets/icons/icon-192.png',
    data:    payload.data || {},
    vibrate: [200, 100, 200],
  });
});

// Clic sur une notification : focus ou ouvre l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
