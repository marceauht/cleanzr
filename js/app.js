/* ============================================================
   app.js — Point d'entrée : init Firebase + Auth + Router
   ============================================================ */

(function () {

  /* --- Firebase ------------------------------------------- */
  function initFirebase() {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || cfg.apiKey === 'REMPLACER') {
      console.warn('[Firebase] firebase-config.js absent ou non configuré.');
      return;
    }
    try {
      window.firebaseApp = firebase.initializeApp(cfg);
    } catch {
      window.firebaseApp = firebase.app(); // déjà initialisé
    }
  }

  /* --- Restaure la session si déjà connecté --------------- */
  function restoreSession() {
    const role = session.get('role');
    if (!role) return false;

    const authScreen = document.getElementById('auth-screen');
    const mainApp    = document.getElementById('main-app');
    if (authScreen) authScreen.classList.add('hidden');
    if (mainApp)    mainApp.classList.remove('hidden');

    const h = window.location.hash;
    if (!h || h === '#') {
      window.location.hash = role === 'host' ? '#/host/dashboard' : '#/agent/dashboard';
    }
    return true;
  }

  /* --- DOMContentLoaded ------------------------------------ */
  document.addEventListener('DOMContentLoaded', async () => {
    initFirebase();

    const hasSession = restoreSession();

    Router.init();

    if (hasSession) {
      const userId = session.get('userId');

      // Récupère le token FCM et l'enregistre dans la Sheet
      await requestNotificationPermission(userId);

      // Écoute les messages foreground
      onForegroundMessage(payload => {
        const body = payload.notification?.body || payload.data?.body || 'Nouvelle notification';
        toast(body, 'info');
      });
    }
  });

  /* --- Post-login : appelé par auth.js après succès ------- */
  window.addEventListener('czr:login', async () => {
    const userId = session.get('userId');

    await requestNotificationPermission(userId);

    onForegroundMessage(payload => {
      const body = payload.notification?.body || payload.data?.body || 'Nouvelle notification';
      toast(body, 'info');
    });
  });

})();
