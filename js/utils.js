/* ============================================================
   utils.js — Utilitaires partagés
   ============================================================ */

/* --- Session (sessionStorage avec préfixe) ---------------- */
const session = {
  get(key)        { return JSON.parse(sessionStorage.getItem(`czr_${key}`) ?? 'null'); },
  set(key, value) { sessionStorage.setItem(`czr_${key}`, JSON.stringify(value)); },
  remove(key)     { sessionStorage.removeItem(`czr_${key}`); },
  clear()         { Object.keys(sessionStorage).filter(k => k.startsWith('czr_')).forEach(k => sessionStorage.removeItem(k)); },
};
window.session = session;

/* --- Crypto : SHA-256 via Web Crypto API ------------------ */
async function sha256(message) {
  const buf  = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* --- Dates ------------------------------------------------ */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatDay(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function calcNuits(dateArrivee, dateDepart) {
  if (!dateArrivee || !dateDepart) return 0;
  const diff = new Date(dateDepart) - new Date(dateArrivee);
  return Math.max(0, Math.round(diff / 86_400_000));
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isFuture(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) > new Date();
}

/* --- Statuts ---------------------------------------------- */
const STATUTS = {
  en_attente: { label: 'En attente',  cls: 'badge--warning'  },
  confirmee:  { label: 'Confirmée',   cls: 'badge--primary'  },
  en_cours:   { label: 'En cours',    cls: 'badge--accent'   },
  terminee:   { label: 'Terminée',    cls: 'badge--success'  },
  annulee:    { label: 'Annulée',     cls: 'badge--neutral'  },
};

function statutBadge(statut) {
  const s = STATUTS[statut] ?? { label: statut || '—', cls: 'badge--neutral' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

function statutLabel(statut) {
  return (STATUTS[statut] ?? { label: statut || '—' }).label;
}

/* --- Initiales avatar ------------------------------------- */
function initiales(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* --- Pluriel simple --------------------------------------- */
function pluriel(n, singular, plural) {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
}

/* --- Toast ------------------------------------------------ */
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  container.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('toast--visible'));
  });

  setTimeout(() => {
    el.classList.remove('toast--visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, 3500);
}

/* --- DOM helpers ------------------------------------------ */
function $(selector, root = document) { return root.querySelector(selector); }
function $$(selector, root = document) { return [...root.querySelectorAll(selector)]; }

function setHTML(selector, html, root = document) {
  const el = $(selector, root);
  if (el) el.innerHTML = html;
}

function setText(selector, text, root = document) {
  const el = $(selector, root);
  if (el) el.textContent = text;
}
