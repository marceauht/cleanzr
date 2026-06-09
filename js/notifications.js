/* ============================================================
   notifications.js — Firebase Cloud Messaging
   ============================================================ */

let _messaging        = null;
let _handlerRegistered = false;

/* --- Initialise Firebase + SW + récupère le token FCM ----- */
window.initFCM = async function () {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;
  if (!window.FIREBASE_CONFIG) {
    console.warn('[FCM] FIREBASE_CONFIG non disponible');
    return null;
  }
  if (!window.FCM_VAPID_KEY || window.FCM_VAPID_KEY === 'REMPLACER') {
    console.warn('[FCM] FCM_VAPID_KEY non configurée — tokens FCM désactivés');
    return null;
  }

  try {
    // Utilise l'app Firebase déjà initialisée par app.js, sinon l'init
    if (!window.firebaseApp) {
      try {
        window.firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
      } catch {
        window.firebaseApp = firebase.app();
      }
    }

    // Enregistre le service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');

    // Attend que le SW soit actif
    const activeReg = await navigator.serviceWorker.ready;

    // Obtient le singleton messaging
    if (!_messaging) {
      _messaging = firebase.messaging();
    }

    // Récupère le token FCM
    const token = await _messaging.getToken({
      vapidKey:                  window.FCM_VAPID_KEY,
      serviceWorkerRegistration: activeReg,
    });

    // Navigation depuis une notification cliquée (SW → client)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
        window.location.hash = event.data.url;
      }
    });

    return token || null;
  } catch (err) {
    console.warn('[FCM] initFCM error :', err);
    return null;
  }
};

/* --- Demande la permission et enregistre le token --------- */
window.requestNotificationPermission = async function (userId) {
  if (!('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const token = await window.initFCM();
    if (!token) return false;

    const saved = session.get('fcmToken');
    if (saved !== token) {
      await saveFcmToken(token).catch(() => null);
      session.set('fcmToken', token);
    }

    return true;
  } catch (err) {
    console.warn('[FCM] requestNotificationPermission error :', err);
    return false;
  }
};

/* --- Écoute les messages FCM au premier plan -------------- */
window.onForegroundMessage = function (callback) {
  if (_handlerRegistered) return;
  if (!window.firebaseApp) return;

  try {
    if (!_messaging) {
      _messaging = firebase.messaging();
    }
    _messaging.onMessage(callback);
    _handlerRegistered = true;
  } catch (err) {
    console.warn('[FCM] onForegroundMessage error :', err);
  }
};
