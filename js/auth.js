/* ============================================================
   auth.js — Authentification multi-flux (4 scénarios)

   Flux 1 — Premier accès      : création de profil (rôle + nom + PIN)
   Flux 2 — Appareil connu     : PIN direct avec "Bonjour [nom]"
   Flux 3 — Accès existant     : PIN sans profil local → enregistre le profil
   Flux 4 — PIN oublié         : vérification par nom → nouveau PIN
   ============================================================ */

(function () {

  /* --- États --------------------------------------------- */
  const S = {
    CREATE_IDENTITY: 'create-identity',
    CREATE_PIN:      'create-pin',
    CREATE_CONFIRM:  'create-confirm',
    LOGIN:           'login',
    EXISTING_ACCESS: 'existing-access',
    FORGOT_NAME:     'forgot-name',
    FORGOT_NEW_PIN:  'forgot-new-pin',
    FORGOT_CONFIRM:  'forgot-confirm',
  };

  let state        = null;
  let pin          = '';
  let submitting   = false;

  // Données inter-états
  let pendingRole  = null;
  let pendingNom   = null;
  let firstPinHash = null;
  let forgotNom    = null;

  /* --- Profil localStorage ------------------------------- */
  function getLocalProfile() {
    try { return JSON.parse(localStorage.getItem('czr_profile') || 'null'); }
    catch { return null; }
  }

  function saveLocalProfile(nom, role) {
    localStorage.setItem('czr_profile', JSON.stringify({ nom, role }));
  }

  /* --- Init ---------------------------------------------- */
  function init() {
    // Masquer tous les panels immédiatement — garantit un état propre
    // indépendamment du CSS, avant que enterState n'en affiche un seul.
    hideAllPanels();

    setupPinKeyboard();
    setupCreationPanel();
    setupForgotPanel();

    const profile = getLocalProfile();
    enterState(profile?.nom && profile?.role ? S.LOGIN : S.CREATE_IDENTITY);
  }

  function hideAllPanels() {
    ['panel-creation', 'panel-pin', 'panel-forgot'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  /* --- Transitions avec fade ----------------------------- */
  function fadeTransition(callback) {
    const panels = document.getElementById('auth-panels');
    if (!panels) { callback(); return; }
    panels.classList.add('auth--fading');
    setTimeout(() => {
      callback();
      void panels.offsetWidth; // force reflow
      panels.classList.remove('auth--fading');
    }, 200);
  }

  function showPanel(panelId) {
    // Passe 1 : masquer tous (aucun overlap possible)
    hideAllPanels();
    // Passe 2 : afficher uniquement la cible
    const target = document.getElementById(panelId);
    if (target) target.hidden = false;
  }

  /* --- Machine d'états ----------------------------------- */
  function enterState(newState, data = {}) {
    fadeTransition(() => {
      state = newState;
      clearPin();
      setLabel('');

      switch (newState) {

        case S.CREATE_IDENTITY:
          showPanel('panel-creation');
          break;

        case S.CREATE_PIN:
          if (data.role) pendingRole = data.role;
          if (data.nom)  pendingNom  = data.nom;
          showPanel('panel-pin');
          setGreeting(null);
          setTitle('Choisissez votre code PIN');
          setSecondary('← Retour', () => enterState(S.CREATE_IDENTITY));
          break;

        case S.CREATE_CONFIRM:
          if (data.pinHash) firstPinHash = data.pinHash;
          showPanel('panel-pin');
          setGreeting(null);
          setTitle('Confirmez votre code PIN');
          setSecondary('← Changer le PIN', () => enterState(S.CREATE_PIN));
          break;

        case S.LOGIN: {
          const profile = getLocalProfile();
          pendingNom = profile?.nom;
          showPanel('panel-pin');
          setGreeting(`Bonjour, ${(pendingNom || '').split(' ')[0] || 'vous'} 👋`);
          setTitle('Entrez votre code PIN');
          setSecondary('PIN oublié ?', () => enterState(S.FORGOT_NAME));
          break;
        }

        case S.EXISTING_ACCESS:
          showPanel('panel-pin');
          setGreeting(null);
          setTitle('Entrez votre code PIN');
          setSecondary('← Retour', () => enterState(S.CREATE_IDENTITY));
          break;

        case S.FORGOT_NAME: {
          showPanel('panel-forgot');
          const fi = document.getElementById('input-forgot-nom');
          if (fi) { fi.value = ''; setTimeout(() => fi.focus(), 220); }
          break;
        }

        case S.FORGOT_NEW_PIN:
          if (data.nom) forgotNom = data.nom;
          showPanel('panel-pin');
          setGreeting(null);
          setTitle('Choisissez un nouveau code PIN');
          setSecondary('← Retour', () => enterState(S.FORGOT_NAME));
          break;

        case S.FORGOT_CONFIRM:
          if (data.pinHash) firstPinHash = data.pinHash;
          showPanel('panel-pin');
          setGreeting(null);
          setTitle('Confirmez le nouveau code PIN');
          setSecondary('← Retour', () => enterState(S.FORGOT_NEW_PIN, { nom: forgotNom }));
          break;
      }
    });
  }

  /* --- Helpers UI ---------------------------------------- */
  function clearPin() {
    pin = '';
    updateDots();
  }

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) dot.classList.toggle('pin-dot--filled', i < pin.length);
    }
  }

  function setLabel(text, isError = false) {
    const el = document.getElementById('pin-label');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('pin-label--error', isError);
  }

  function setGreeting(text) {
    const el = document.getElementById('pin-ctx-greeting');
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
  }

  function setTitle(text) {
    const el = document.getElementById('pin-ctx-title');
    if (el) el.textContent = text;
  }

  function setSecondary(label, handler) {
    const btn = document.getElementById('pin-secondary-btn');
    if (!btn) return;
    btn.hidden = !label;
    if (label) {
      btn.textContent = label;
      btn.onclick = handler;
    }
  }

  function setLoading(loading) {
    submitting = loading;
    const spinner  = document.getElementById('auth-spinner');
    const keyboard = document.getElementById('pin-keyboard');
    if (spinner)  spinner.classList.toggle('hidden', !loading);
    if (keyboard) keyboard.style.visibility = loading ? 'hidden' : '';
  }

  function shake() {
    const el = document.getElementById('pin-display');
    if (!el) return;
    el.classList.remove('pin-display--shake');
    void el.offsetWidth;
    el.classList.add('pin-display--shake');
    el.addEventListener('animationend', () => el.classList.remove('pin-display--shake'), { once: true });
  }

  /* --- Clavier PIN --------------------------------------- */
  function setupPinKeyboard() {
    const keyboard = document.getElementById('pin-keyboard');
    if (!keyboard) return;

    keyboard.addEventListener('click', (e) => {
      if (submitting) return;
      const key = e.target.closest('[data-key]');
      const del = e.target.closest('#pin-delete');
      if (key) addDigit(key.dataset.key);
      if (del) removeDigit();
    });

    document.addEventListener('keydown', handleKeydown);
  }

  const PIN_STATES = new Set([
    S.CREATE_PIN, S.CREATE_CONFIRM,
    S.LOGIN, S.EXISTING_ACCESS,
    S.FORGOT_NEW_PIN, S.FORGOT_CONFIRM,
  ]);

  function handleKeydown(e) {
    if (submitting || !PIN_STATES.has(state)) return;
    if (e.key >= '0' && e.key <= '9') addDigit(e.key);
    if (e.key === 'Backspace') removeDigit();
  }

  function addDigit(digit) {
    if (pin.length >= 4) return;
    pin += digit;
    updateDots();
    if (pin.length === 4) setTimeout(() => onPinComplete(pin), 130);
  }

  function removeDigit() {
    if (!pin.length) return;
    pin = pin.slice(0, -1);
    updateDots();
    setLabel('');
  }

  /* --- Logique à 4 chiffres ------------------------------ */
  async function onPinComplete(enteredPin) {
    if (submitting) return;
    const hash = await sha256(enteredPin);

    switch (state) {

      /* --- Flux 1 : création ----------------------------- */
      case S.CREATE_PIN:
        enterState(S.CREATE_CONFIRM, { pinHash: hash });
        break;

      case S.CREATE_CONFIRM:
        if (hash !== firstPinHash) {
          shake();
          setLabel('Les codes ne correspondent pas — réessayez', true);
          clearPin();
          return;
        }
        setLoading(true);
        try {
          const res = await creerProfil(pendingNom, pendingRole, firstPinHash);
          if (res.success) {
            saveLocalProfile(res.nom || pendingNom, pendingRole);
            session.set('role',   pendingRole);
            session.set('name',   res.nom || pendingNom);
            session.set('userId', res.userId);
            onAuthSuccess(pendingRole);
          } else {
            shake();
            setLabel(res.error || 'Erreur lors de la création', true);
            clearPin();
          }
        } catch {
          shake();
          setLabel('Erreur réseau — réessayez', true);
          clearPin();
        }
        setLoading(false);
        break;

      /* --- Flux 2 & 3 : connexion PIN -------------------- */
      case S.LOGIN:
      case S.EXISTING_ACCESS:
        setLoading(true);
        try {
          const res = await verifierPin(hash);
          if (res.success) {
            saveLocalProfile(res.nom, res.role);
            session.set('role',   res.role);
            session.set('name',   res.nom);
            session.set('userId', res.userId);
            onAuthSuccess(res.role);
          } else {
            shake();
            setLabel('Code incorrect — réessayez', true);
            clearPin();
          }
        } catch {
          shake();
          setLabel('Erreur réseau — réessayez', true);
          clearPin();
        }
        setLoading(false);
        break;

      /* --- Flux 4 : nouveau PIN -------------------------- */
      case S.FORGOT_NEW_PIN:
        enterState(S.FORGOT_CONFIRM, { pinHash: hash });
        break;

      case S.FORGOT_CONFIRM:
        if (hash !== firstPinHash) {
          shake();
          setLabel('Les codes ne correspondent pas — réessayez', true);
          clearPin();
          return;
        }
        setLoading(true);
        try {
          const res = await reinitialiserPin(forgotNom, firstPinHash);
          if (res.success) {
            saveLocalProfile(res.nom || forgotNom, res.role);
            session.set('role',   res.role);
            session.set('name',   res.nom || forgotNom);
            session.set('userId', res.userId);
            onAuthSuccess(res.role);
          } else {
            shake();
            setLabel(res.error || 'Erreur lors de la réinitialisation', true);
            clearPin();
          }
        } catch {
          shake();
          setLabel('Erreur réseau — réessayez', true);
          clearPin();
        }
        setLoading(false);
        break;
    }
  }

  /* --- Panel Création ------------------------------------ */
  function setupCreationPanel() {
    let selectedRole = null;

    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('role-btn--active'));
        btn.classList.add('role-btn--active');
        selectedRole = btn.dataset.role;
      });
    });

    document.getElementById('btn-creation-next')?.addEventListener('click', () => {
      const nom = document.getElementById('input-nom')?.value.trim() || '';
      if (!selectedRole) {
        toast('Choisissez un rôle : Hôte ou Agent', 'error');
        return;
      }
      if (nom.length < 2) {
        toast('Entrez votre prénom ou nom (min. 2 caractères)', 'error');
        document.getElementById('input-nom')?.focus();
        return;
      }
      enterState(S.CREATE_PIN, { role: selectedRole, nom });
    });

    // Enter dans le champ nom → submit
    document.getElementById('input-nom')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-creation-next')?.click();
    });

    document.getElementById('btn-deja-acces')?.addEventListener('click', () => {
      enterState(S.EXISTING_ACCESS);
    });
  }

  /* --- Panel PIN oublié ---------------------------------- */
  function setupForgotPanel() {
    document.getElementById('btn-forgot-back')?.addEventListener('click', () => {
      const profile = getLocalProfile();
      enterState(profile ? S.LOGIN : S.CREATE_IDENTITY);
    });

    document.getElementById('btn-forgot-nom-next')?.addEventListener('click', submitForgotName);
    document.getElementById('input-forgot-nom')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitForgotName();
    });
  }

  async function submitForgotName() {
    const nom = document.getElementById('input-forgot-nom')?.value.trim() || '';
    if (nom.length < 2) {
      toast('Entrez votre nom (min. 2 caractères)', 'error');
      return;
    }

    const btn = document.getElementById('btn-forgot-nom-next');
    if (btn) { btn.disabled = true; btn.textContent = 'Vérification…'; }

    try {
      const res = await verifierNom(nom);
      if (res.found) {
        enterState(S.FORGOT_NEW_PIN, { nom });
      } else {
        toast('Aucun compte trouvé avec ce nom', 'error');
      }
    } catch {
      toast('Erreur réseau — réessayez', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Vérifier →'; }
    }
  }

  /* --- Transition vers l'app ----------------------------- */
  function onAuthSuccess(role) {
    const authScreen = document.getElementById('auth-screen');
    const mainApp    = document.getElementById('main-app');
    if (authScreen) authScreen.classList.add('hidden');
    if (mainApp)    mainApp.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('czr:login'));
    window.location.hash = role === 'host' ? '#/host/dashboard' : '#/agent/dashboard';
  }

  /* --- Déconnexion --------------------------------------- */
  window.logout = function () {
    session.clear();
    submitting = false;
    pin = '';

    const mainApp    = document.getElementById('main-app');
    const authScreen = document.getElementById('auth-screen');
    if (mainApp)    mainApp.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');
    window.location.hash = '';

    // Profil localStorage conservé → retour sur l'écran PIN
    const profile = getLocalProfile();
    enterState(profile ? S.LOGIN : S.CREATE_IDENTITY);
  };

  document.addEventListener('DOMContentLoaded', init);

})();
