/* ============================================================
   notifications.js — Firebase Cloud Messaging
   ============================================================ */

let _messaging        = null;
let _handlerRegistered = false;

/* --- Initialise Firebase + SW + récupère le token FCM ----- */
window.initFCM = async function () {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    toast('FCM: serviceWorker ou Notification non supporté', 'error');
    return null;
  }
  if (!window.FIREBASE_CONFIG) {
    toast('FCM: FIREBASE_CONFIG manquant', 'error');
    return null;
  }
  if (!window.FCM_VAPID_KEY || window.FCM_VAPID_KEY === 'REMPLACER') {
    toast('FCM: FCM_VAPID_KEY manquant', 'error');
    return null;
  }

  // Utilise l'app Firebase déjà initialisée par app.js, sinon l'init
  if (!window.firebaseApp) {
    try {
      window.firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
    } catch {
      window.firebaseApp = firebase.app();
    }
  }

  // Enregistrement du service worker
  let activeReg;
  try {
    await navigator.serviceWorker.register('/service-worker.js');
    activeReg = await navigator.serviceWorker.ready;
  } catch (err) {
    toast('Erreur FCM: ' + err.message, 'error');
    return null;
  }

  // Obtient le singleton messaging
  if (!_messaging) {
    _messaging = firebase.messaging();
  }

  // Récupération du token FCM
  let token;
  try {
    token = await _messaging.getToken({
      vapidKey:                  window.FCM_VAPID_KEY,
      serviceWorkerRegistration: activeReg,
    });
  } catch (err) {
    toast('Erreur FCM: ' + err.message, 'error');
    return null;
  }

  // Navigation depuis une notification cliquée (SW → client)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
      window.location.hash = event.data.url;
    }
  });

  return token || null;
};

/* --- Demande la permission et enregistre le token --------- */
window.requestNotificationPermission = async function (userId) {
  if (!('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    toast('Permission: ' + permission, 'info');
    if (permission !== 'granted') return false;

    const token = await window.initFCM();
    if (!token) {
      toast('Token NULL — initFCM a échoué', 'error');
      return false;
    }
    toast('Token OK: ' + token.slice(0, 20) + '...', 'success');

    const saved = session.get('fcmToken');
    if (saved !== token) {
      const res = await saveFcmToken(token).catch(err => ({ success: false, error: err.message }));
      if (res && res.success) {
        toast('Token enregistré en base ✓', 'success');
      } else {
        toast('Erreur enregistrement: ' + JSON.stringify(res), 'error');
      }
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
