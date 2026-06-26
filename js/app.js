/* ============================================================
   app.js — Point d'entrée : init Firebase + Auth + Router
   ============================================================ */

(function () {

  let foregroundListenerActive = false;

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
      window.firebaseApp = firebase.app();
    }
  }

  /* --- Active l'écoute foreground (une seule fois) -------- */
  function activerForeground() {
    if (foregroundListenerActive) return;
    foregroundListenerActive = true;
    onForegroundMessage(payload => {
      const body = payload.notification?.body || payload.data?.body || 'Nouvelle notification';
      toast(body, 'info');
    });
  }

  /* --- Restaure la session si déjà connecté --------------- */
  function restoreSession() {
    const role = session.get('role');
    if (!role) return false;

    const authScreen = document.getElementById('auth-screen');
    const mainApp    = document.getElementById('main-app');
    if (authScreen) authScreen.classList.add('hidden');
    if (mainApp)    mainApp.classList.remove('hidden');

    return true;
  }

  /* --- DOMContentLoaded ------------------------------------ */
  document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initFirebase();

    const hasSession = restoreSession();

    Router.init();

    if (hasSession) {
      const userId = session.get('userId');
      await requestNotificationPermission(userId);
      activerForeground();
    }
  });

  /* --- Post-login : appelé par auth.js après succès ------- */
  window.addEventListener('czr:login', async () => {
    const userId = session.get('userId');
    await requestNotificationPermission(userId);
    activerForeground();
    const redirect = sessionStorage.getItem('czr_redirect');
    if (redirect) {
      sessionStorage.removeItem('czr_redirect');
      window.location.hash = redirect;
    }
  });

})();