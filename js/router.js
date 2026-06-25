/* ============================================================
   router.js — Routeur SPA hash-based
   Charge les pages HTML via fetch() et injecte dans #main-app
   ============================================================ */

const Router = {
  routes: {
    'host/dashboard':       'pages/dashboard.html',
    'host/reservation/new': 'pages/host-new-reservation.html',
    'host/reservation':     'pages/host-detail.html',
    'agent/dashboard':      'pages/dashboard.html',
    'agent/intervention':   'pages/agent-detail.html',
    'agent/cloture':        'pages/agent-cloture.html',
    'rapport':              'pages/rapport.html',
  },

  /* --- Résolution de route -------------------------------- */
  resolve(path) {
    if (this.routes[path]) return this.routes[path];
    const match = Object.keys(this.routes).find(r => path.startsWith(r + '/') || path === r);
    return match ? this.routes[match] : null;
  },

  /* --- Extraction de l'ID depuis le path ------------------ */
  extractId(path) {
    const parts = path.split('/');
    return parts[parts.length - 1] || null;
  },

  /* --- Navigation ----------------------------------------- */
  async navigate(hash) {
    const path = (hash || '').replace(/^#\//, '').replace(/\/$/, '');

    const role = session.get('role');
    if (!role) {
      window.history.replaceState(null, '', window.location.pathname);
      window.location.hash = '';
      return;
    }

    if (path.startsWith('host/') && role !== 'host') {
      window.location.hash = '#/agent/dashboard';
      return;
    }
    if (path.startsWith('agent/') && role !== 'agent') {
      window.location.hash = '#/host/dashboard';
      return;
    }

    const file = this.resolve(path);
    if (!file) {
      window.location.hash = role === 'host' ? '#/host/dashboard' : '#/agent/dashboard';
      return;
    }

    window._currentPath = path;
    window._currentId   = this.extractId(path);
    await this.loadPage(file);
  },

  /* --- Chargement et injection ---------------------------- */
  async loadPage(file) {
    const app = document.getElementById('main-app');
    if (!app) return;

    app.innerHTML = `
      <div class="page-loading">
        <div class="spinner"></div>
      </div>`;

    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();
      app.innerHTML = html;
      this.initPage(app);
    } catch (err) {
      console.error('[Router]', err);
      app.innerHTML = `
        <div class="page-wrapper">
          <div class="error-state">
            <p>Impossible de charger la page.<br><small>${err.message}</small></p>
          </div>
        </div>`;
      toast('Erreur de chargement', 'error');
    }
  },

  /* --- Init de la page chargée ---------------------------- */
  initPage(container) {
    const root   = container.querySelector('[data-init]');
    if (!root) return;
    const fnName = root.dataset.init;
    if (typeof window[fnName] === 'function') {
      window[fnName]();
    }
  },

  /* --- Init ---------------------------------------------- */
  init() {
    window.addEventListener('hashchange', () => this.navigate(window.location.hash));

    const h = window.location.hash;
    const role = session.get('role');
    if (!h || h === '#') {
      const defaultHash = role === 'host' ? '#/host/dashboard' : '#/agent/dashboard';
      window.history.replaceState(null, '', defaultHash);
      this.navigate(defaultHash);
    } else {
      this.navigate(h);
    }
  },
};
