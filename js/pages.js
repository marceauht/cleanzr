/* ============================================================
   pages.js — Contrôleurs de pages
   Chaque fonction est appelée par router.js via data-init.
   ============================================================ */

/* ---------------------------------------------------------- */
/*  Dashboard unifié (hôte + agent)                           */
/* ---------------------------------------------------------- */
window.initDashboard = async function () {
  const role = session.get('role');
  const name = session.get('name') || (role === 'host' ? 'Hôte' : 'Agent');

  setText('#greeting-text', `Bonjour ${name.split(' ')[0]} 👋`);
  setText('#greeting-date', formatDay(new Date()));

  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    const SUN_SVG  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>`;
    const MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"/></svg>`;
    const updateIcon = () => {
      btnTheme.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? SUN_SVG : MOON_SVG;
    };
    updateIcon();
    btnTheme.addEventListener('click', () => { toggleTheme(); updateIcon(); });
  }

  document.getElementById('btn-logout')?.addEventListener('click', logout);

  if (role === 'host') {
    const btnNew = document.getElementById('btn-new');
    if (btnNew) {
      btnNew.removeAttribute('hidden');
      btnNew.addEventListener('click', () => { window.location.hash = '#/host/reservation/new'; });
    }
  }

  let allInterventions = [];
  let activeFilter = 'avenir';

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === activeFilter);
    tab.setAttribute('aria-selected', String(tab.dataset.filter === activeFilter));
  });

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeFilter = tab.dataset.filter;
      renderList(filterBy(allInterventions, activeFilter));
    });
  });

  try {
    const res = await getInterventions();
    allInterventions = res?.interventions || [];
    updateStats(allInterventions);
    renderList(filterBy(allInterventions, activeFilter));
    requestNotificationPermission(session.get('userId')).catch(() => null);
    } catch (err) {
        console.error('[Dashboard] Erreur:', err);
        const list = document.getElementById('interventions-list');
        if (list) list.innerHTML = `<div class="empty-state"><p style="color:var(--danger);font-size:0.75rem;word-break:break-all;">${err?.message || String(err)}</p></div>`;
      }

  function updateStats(list) {
    if (role === 'host') {
      setText('#stat-total',     String(list.length));
      setText('#stat-avenir',    String(list.filter(i => ['en_attente','confirmee','en_cours'].includes(i.statut)).length));
      setText('#stat-terminees', String(list.filter(i => i.statut === 'terminee').length));
    } else {
      setText('#stat-total',     String(list.length));
      setText('#stat-avenir',    String(list.filter(i => i.statut !== 'terminee' && i.statut !== 'annulee').length));
      setText('#stat-terminees', String(list.filter(i => i.statut === 'terminee').length));
    }
  }

  function filterBy(list, f) {
    if (f === 'avenir') return list.filter(i => role === 'host'
      ? ['en_attente', 'confirmee', 'en_cours'].includes(i.statut)
      : i.statut !== 'terminee' && i.statut !== 'annulee'
    );
    if (f === 'terminees') return list.filter(i => i.statut === 'terminee');
    return list;
  }

  function renderList(list) {
    const container = document.getElementById('interventions-list');
    if (!container) return;
    if (!list.length) {
      const emptyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" opacity="0.35" viewBox="0 0 256 256"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z"/></svg>`;
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">${emptyIcon}</div>
          <p>Aucune intervention trouvée.</p>
        </div>`;
      return;
    }
    container.innerHTML = list.map((item, i) => {
      const today    = isToday(item.date_intervention);
      const d        = new Date(item.date_intervention);
      const day      = isNaN(d) ? '—' : String(d.getDate()).padStart(2, '0');
      const month    = isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      const hDebut  = formatHeure(item.heure_debut);
      const hFin    = formatHeure(item.heure_fin);
      const hDepart = formatHeure(item.heure_depart);
      const typeLabel = { standard: 'Standard', grand_menage: 'Grand ménage', controle: 'Contrôle' }[item.type] || item.type;
      const plateformeRef = [item.plateforme, item.ref_reservation ? `#${item.ref_reservation}` : ''].filter(Boolean).join(' · ');
      return `
        <article class="glass-card intervention-card animate-fade-in-up stagger-${Math.min(i, 4) + 1}${today ? ' today-card' : ''}" data-id="${item.id}" role="listitem" tabindex="0">
          <div class="intervention-card__top">
            <div class="intervention-card__info">
              ${role === 'host' ? `
              <div style="display:flex;flex-direction:column;gap:2px;">
                ${plateformeRef ? `<div class="intervention-card__platform">${plateformeRef}</div>` : ''}
                <div class="intervention-card__logement">${item.client_nom || '—'}</div>
                ${item.logement_nom ? `<div class="intervention-card__meta"><span>${item.logement_nom}</span></div>` : ''}
                <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.8rem;color:var(--text-secondary);margin-top:1px;">${formatDateShort(item.date_arrivee)} → ${formatDateShort(item.date_depart)} · ${item.nb_voyageurs || (item.nb_adultes || 1)} voyageur${(item.nb_voyageurs || (item.nb_adultes || 1)) > 1 ? 's' : ''}</div>
              </div>
              ` : `
              ${today ? '<div class="today-label">Aujourd\'hui</div>' : ''}
              ${item.heure_debut ? `<div style="font-size:0.8125rem;font-weight:600;color:var(--accent);margin-bottom:2px;">${hDebut} → ${hFin}</div>` : ''}
              <div class="intervention-card__logement">${item.client_nom || '—'}</div>
              ${item.logement_nom ? `<div class="intervention-card__meta"><span>${item.logement_nom}</span></div>` : ''}
              `}
            </div>
            <div class="date-badge">
              <span class="date-badge__day">${day}</span>
              <span>${month}</span>
            </div>
          </div>
          <div class="intervention-card__bottom" style="flex-direction:column;align-items:flex-start;gap:0;">
            ${role === 'host'
              ? `<div style="width:100%;display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;">
                  <div style="display:inline-flex;align-items:center;gap:4px;font-size:0.8125rem;color:var(--accent);font-weight:500;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    ${item.agentName || 'Non assigné'}
                  </div>
                  ${statutBadge(item.statut)}
                </div>`
              : `<div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0px;">
                  ${item.nb_voyageurs || (item.nb_adultes || 1)} voyageur${(item.nb_voyageurs || (item.nb_adultes || 1)) > 1 ? 's' : ''}${item.nb_animaux > 0 ? ' · 🐾' : ''}${item.lit_bebe ? ' · 🍼' : ''}
                </div>
                <div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-top:-2px;">
                  <div class="intervention-card__agent">
                    ${hDepart !== '—' ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` : ''}
                    <span>${hDepart !== '—' ? `<span style="color:var(--accent);font-weight:500;">Départ client : ${hDepart}</span>` : ''}</span>
                  </div>
                  ${statutBadge(item.statut)}
                </div>`
            }
          </div>
        </article>`;
    }).join('');

    container.querySelectorAll('.intervention-card').forEach(card => {
      const hash = role === 'host'
        ? `#/host/reservation/${card.dataset.id}`
        : `#/agent/intervention/${card.dataset.id}`;
      const go = () => { window.location.hash = hash; };
      card.addEventListener('click', go);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(); });
    });
  }
};

/* ---------------------------------------------------------- */
/*  Utilitaire : custom select                                */
/* ---------------------------------------------------------- */
function initCustomSelect(selectId, onChange) {
  const root     = document.getElementById(selectId);
  const trigger  = root?.querySelector('.custom-select__trigger');
  const labelEl  = root?.querySelector('.custom-select__label');
  const dropdown = root?.querySelector('.custom-select__dropdown');
  if (!root || !trigger || !dropdown) return;

  const CSS = `
    .custom-select{position:relative;isolation:isolate;}
    .custom-select__trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-radius:var(--radius-sm);background:var(--bg-card, #ffffff);border:1px solid var(--border-glass);cursor:pointer;user-select:none;transition:border-color var(--transition);}
    .custom-select__trigger:hover,.custom-select[aria-expanded="true"] .custom-select__trigger{border-color:var(--accent);}
    .custom-select.has-error .custom-select__trigger{border-color:var(--danger);}
    .custom-select__label{font-size:0.9375rem;color:var(--text-primary);flex:1;}
    .custom-select__label.placeholder{color:var(--text-secondary);}
    .custom-select__dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:9999;border-radius:var(--radius-sm);overflow:hidden;box-shadow:var(--shadow-lg);background:var(--bg-card, #ffffff);opacity:1;}
    .custom-select__option{padding:12px 14px;font-size:0.9375rem;cursor:pointer;background:var(--bg-card, #ffffff);border-bottom:1px solid var(--border-glass);transition:background var(--transition),color var(--transition);}
    .custom-select__option:last-child{border-bottom:none;}
    .custom-select__option:hover,.custom-select__option.active{background:var(--accent-bg);color:var(--accent);}
    .slide-down{animation:slideDown 0.25s ease;}
    @keyframes slideDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
  `;
  if (!document.getElementById('custom-select-style')) {
    const s = document.createElement('style'); s.id = 'custom-select-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  labelEl.classList.add('placeholder');

  function openDropdown() {
    dropdown.hidden = false;
    root.setAttribute('aria-expanded', 'true');
  }
  function closeDropdown() {
    dropdown.hidden = true;
    root.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.hidden ? openDropdown() : closeDropdown();
  });

  dropdown.addEventListener('click', (e) => {
    const opt = e.target.closest('.custom-select__option');
    if (!opt) return;
    const val   = opt.dataset.value;
    const label = opt.textContent.trim();
    root.dataset.value = val;
    labelEl.textContent = label;
    labelEl.classList.remove('placeholder');
    dropdown.querySelectorAll('.custom-select__option').forEach(o => o.classList.toggle('active', o === opt));
    closeDropdown();
    if (onChange) onChange(val, label);
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) closeDropdown();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });
}

function getCustomSelectValue(selectId) {
  return document.getElementById(selectId)?.dataset.value || '';
}

function populateCustomSelect(selectId, options, placeholder) {
  const dropdown = document.querySelector(`#${selectId} .custom-select__dropdown`);
  const labelEl  = document.querySelector(`#${selectId} .custom-select__label`);
  if (!dropdown) return;
  dropdown.innerHTML = options.map(o =>
    `<div class="custom-select__option" data-value="${o.value}" role="option">${o.label}</div>`
  ).join('');
  if (labelEl && placeholder) { labelEl.textContent = placeholder; labelEl.classList.add('placeholder'); }
}

/* ---------------------------------------------------------- */
/*  Utilitaire : date picker custom (panneau glissant)         */
/* ---------------------------------------------------------- */
const MOIS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_FR = ['L','M','M','J','V','S','D'];

function isoDuJour(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoAujourdhui() { return isoDuJour(new Date()); }
function isoLendemain(iso) {
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return isoDuJour(d);
}
function formatDateFr(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

let datePickerOverlay = null;
const dpState = {};

function construireDatePicker() {
  if (datePickerOverlay) return;

  const CSS = `
    .date-picker-overlay{position:fixed;inset:0;z-index:1000;visibility:hidden;}
    .date-picker-overlay.open{visibility:visible;}
    .date-picker-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.45);opacity:0;transition:opacity var(--transition);}
    .date-picker-overlay.open .date-picker-backdrop{opacity:1;}
    .date-picker-sheet{position:fixed;left:0;right:0;bottom:0;background:var(--bg-card, #ffffff);border-radius:var(--radius-lg) var(--radius-lg) 0 0;box-shadow:var(--shadow-lg);padding:16px;transform:translateY(100%);transition:transform var(--transition-spring);max-width:var(--max-w);margin:0 auto;}
    .date-picker-overlay.open .date-picker-sheet{transform:translateY(0);}
    .date-picker-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
    .date-picker-title{font-weight:600;font-size:0.9375rem;color:var(--text-primary);text-transform:capitalize;}
    .date-picker-nav{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;color:var(--primary);border-radius:var(--radius-sm);background:var(--bg-surface);}
    .date-picker-weekdays{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;}
    .date-picker-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
    .date-picker-day{height:40px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);font-size:0.875rem;color:var(--text-primary);background:transparent;}
    .date-picker-day--empty{visibility:hidden;}
    .date-picker-day--disabled{color:var(--text-tertiary);cursor:not-allowed;}
    .date-picker-day--selected{background:var(--primary);color:#fff;font-weight:600;}
    .date-picker-close{margin-top:12px;width:100%;text-align:center;padding:10px;font-size:0.875rem;color:var(--text-secondary);}
  `;
  const s = document.createElement('style');
  s.id = 'date-picker-style';
  s.textContent = CSS;
  document.head.appendChild(s);

  datePickerOverlay = document.createElement('div');
  datePickerOverlay.className = 'date-picker-overlay';
  datePickerOverlay.innerHTML = `
    <div class="date-picker-backdrop"></div>
    <div class="date-picker-sheet">
      <div class="date-picker-header">
        <button type="button" class="date-picker-nav" data-nav="-1" aria-label="Mois précédent">‹</button>
        <span class="date-picker-title"></span>
        <button type="button" class="date-picker-nav" data-nav="1" aria-label="Mois suivant">›</button>
      </div>
      <div class="date-picker-weekdays">${JOURS_FR.map(j => `<span>${j}</span>`).join('')}</div>
      <div class="date-picker-grid"></div>
      <button type="button" class="date-picker-close">Fermer</button>
    </div>
  `;
  document.body.appendChild(datePickerOverlay);

  datePickerOverlay.querySelector('.date-picker-backdrop').addEventListener('click', fermerDatePicker);
  datePickerOverlay.querySelector('.date-picker-close').addEventListener('click', fermerDatePicker);
  datePickerOverlay.querySelectorAll('.date-picker-nav').forEach(btn => {
    btn.addEventListener('click', () => {
      dpState.moisAffiche.setMonth(dpState.moisAffiche.getMonth() + parseInt(btn.dataset.nav, 10));
      rendreDatePicker();
    });
  });
}

function rendreDatePicker() {
  const { inputEl, opts, moisAffiche } = dpState;
  const titre = datePickerOverlay.querySelector('.date-picker-title');
  const grid  = datePickerOverlay.querySelector('.date-picker-grid');
  titre.textContent = `${MOIS_FR[moisAffiche.getMonth()]} ${moisAffiche.getFullYear()}`;

  const premierJour = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
  const decalage  = (premierJour.getDay() + 6) % 7;
  const nbJours   = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0).getDate();
  const minIso    = opts.minDate ? opts.minDate() : isoAujourdhui();
  const isoActuel = inputEl.dataset.iso || '';

  let html = '';
  for (let i = 0; i < decalage; i++) html += '<span class="date-picker-day date-picker-day--empty"></span>';
  for (let j = 1; j <= nbJours; j++) {
    const d = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), j);
    const iso = isoDuJour(d);
    const desactive   = iso < minIso;
    const selectionne = iso === isoActuel;
    html += `<button type="button" class="date-picker-day${desactive ? ' date-picker-day--disabled' : ''}${selectionne ? ' date-picker-day--selected' : ''}" data-iso="${iso}"${desactive ? ' disabled' : ''}>${j}</button>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.date-picker-day:not(.date-picker-day--disabled):not(.date-picker-day--empty)').forEach(btn => {
    btn.addEventListener('click', () => {
      const iso = btn.dataset.iso;
      inputEl.dataset.iso = iso;
      inputEl.value = formatDateFr(iso);
      inputEl.dispatchEvent(new Event('change'));
      fermerDatePicker();
    });
  });
}

function ouvrirDatePicker(inputEl, opts) {
  construireDatePicker();
  dpState.inputEl = inputEl;
  dpState.opts = opts || {};
  const baseDate = inputEl.dataset.iso ? new Date(inputEl.dataset.iso) : new Date();
  dpState.moisAffiche = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  rendreDatePicker();
  datePickerOverlay.classList.add('open');
}

function fermerDatePicker() {
  datePickerOverlay?.classList.remove('open');
}

function initDatePicker(inputEl, opts) {
  inputEl.readOnly = true;
  inputEl.addEventListener('click', () => ouvrirDatePicker(inputEl, opts));
}

/* ---------------------------------------------------------- */
/*  Utilitaire : confirmation bottom sheet (remplace confirm()) */
/* ---------------------------------------------------------- */

// Retourne Promise<boolean> : true si confirmé, false si backdrop / Échap / bouton "non"
function confirmerAction({ titre, message, labelOui = 'Confirmer', labelNon = 'Annuler', danger = true }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-backdrop"></div>
      <div class="confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirm-sheet-titre">
        <div class="confirm-sheet__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>
        <h2 class="confirm-sheet__title" id="confirm-sheet-titre">${titre}</h2>
        <p class="confirm-sheet__message">${message}</p>
        <div class="confirm-sheet__actions">
          <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'} btn--full" id="confirm-btn-oui">${labelOui}</button>
          ${labelNon ? `<button type="button" class="btn btn--secondary btn--full" id="confirm-btn-non">${labelNon}</button>` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const backdrop    = overlay.querySelector('.confirm-backdrop');
    const btnOui       = overlay.querySelector('#confirm-btn-oui');
    const btnNon       = overlay.querySelector('#confirm-btn-non');
    const focusables   = btnNon ? [btnOui, btnNon] : [btnOui];

    function fermer(valeur) {
      overlay.classList.remove('open');
      document.removeEventListener('keydown', surKeydown);
      // Laisse l'animation de fermeture se jouer avant de retirer l'overlay du DOM
      setTimeout(() => overlay.remove(), 250);
      resolve(valeur);
    }

    function surKeydown(e) {
      if (e.key === 'Escape') { fermer(false); return; }
      if (e.key !== 'Tab') return;
      // Piège le focus entre les deux boutons de la bottom sheet
      e.preventDefault();
      const index   = focusables.indexOf(document.activeElement);
      const suivant = e.shiftKey
        ? focusables[(index - 1 + focusables.length) % focusables.length]
        : focusables[(index + 1) % focusables.length];
      suivant.focus();
    }

    backdrop.addEventListener('click', () => fermer(false));
    btnNon?.addEventListener('click', () => fermer(false));
    btnOui.addEventListener('click', () => fermer(true));
    document.addEventListener('keydown', surKeydown);

    requestAnimationFrame(() => {
      overlay.classList.add('open');
      btnOui.focus();
    });
  });
}

/* ---------------------------------------------------------- */
/*  Utilitaire : champ heure avec auto-formatage HH:MM         */
/* ---------------------------------------------------------- */
function formaterSaisieHeure(brut) {
  let valeur = brut.replace(/[^0-9:]/g, '');

  // Un seul ':' autorisé
  const posDeuxPoints = valeur.indexOf(':');
  if (posDeuxPoints !== -1) {
    valeur = valeur.slice(0, posDeuxPoints + 1) + valeur.slice(posDeuxPoints + 1).replace(/:/g, '');
  }

  // Insertion automatique du ':' après les 2 premiers chiffres
  if (!valeur.includes(':') && valeur.length > 2) {
    valeur = `${valeur.slice(0, 2)}:${valeur.slice(2)}`;
  }

  return valeur.slice(0, 5);
}

function validerChampHeure(inputEl) {
  const conteneur = inputEl.closest('.form-group');

  if (!inputEl.value) {
    inputEl.classList.remove('input--error');
    conteneur?.querySelector('.field-error')?.remove();
    return;
  }

  const match   = /^([0-9]{1,2}):([0-9]{1,2})$/.exec(inputEl.value);
  const heures  = match ? parseInt(match[1], 10) : -1;
  const minutes = match ? parseInt(match[2], 10) : -1;
  const valide  = !!match && heures >= 0 && heures <= 23 && minutes >= 0 && minutes <= 59;

  if (!valide) {
    inputEl.value = '';
    inputEl.classList.add('input--error');
    if (conteneur && !conteneur.querySelector('.field-error')) {
      const p = document.createElement('p');
      p.className = 'field-error';
      p.textContent = 'Format invalide (HH:MM)';
      conteneur.appendChild(p);
    }
    return;
  }

  inputEl.value = `${String(heures).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  inputEl.classList.remove('input--error');
  conteneur?.querySelector('.field-error')?.remove();
}

function initChampHeure(inputEl) {
  inputEl.addEventListener('input', () => { inputEl.value = formaterSaisieHeure(inputEl.value); });
  inputEl.addEventListener('blur', () => validerChampHeure(inputEl));
}

/* ---------------------------------------------------------- */
/*  Nouvelle réservation Hôte                                 */
/* ---------------------------------------------------------- */
window.initHostNewReservation = async function () {
  document.getElementById('btn-back')?.addEventListener('click', () => history.back());

  // --- Mode édition : pré-chargement d'une réservation existante ---
  const editData    = session.get('edit_reservation');
  const modeEdition = !!editData;
  if (modeEdition) {
    const titre = document.getElementById('form-title');
    if (titre) titre.textContent = 'Modification de réservation';
  }

  // --- Navigation multi-étapes ---
  let etapeActuelle = 1;
  const TOTAL_ETAPES = 6;
  const sections       = document.querySelectorAll('.form-section');
  const btnPrev        = document.getElementById('btn-prev');
  const btnNext        = document.getElementById('btn-next');
  const progressLabel  = document.getElementById('progress-label');
  const progressBarFill = document.getElementById('progress-bar-fill');

  function afficherEtape(n) {
    etapeActuelle = n;
    sections.forEach(section => {
      section.style.display = parseInt(section.dataset.step, 10) === n ? '' : 'none';
    });
    progressLabel.textContent = `Étape ${n} sur ${TOTAL_ETAPES}`;
    progressBarFill.style.width = `${(n / TOTAL_ETAPES) * 100}%`;
    btnPrev.style.display = n === 1 ? 'none' : '';
    btnNext.textContent   = n === TOTAL_ETAPES ? (modeEdition ? 'Enregistrer les modifications' : 'Créer la réservation') : 'Suivant';
  }

  // --- Validation des champs obligatoires avant de passer à l'étape suivante ---
  function marquerErreur(champ, conteneur, estSelect) {
    champ.classList.add(estSelect ? 'has-error' : 'input--error');
    if (!conteneur.querySelector('.field-error')) {
      const p = document.createElement('p');
      p.className = 'field-error';
      p.textContent = 'Champ obligatoire';
      conteneur.appendChild(p);
    }
  }
  function effacerErreur(champ, conteneur, estSelect) {
    champ.classList.remove(estSelect ? 'has-error' : 'input--error');
    conteneur.querySelector('.field-error')?.remove();
  }
  function validerChamp(champ, estSelect, estRempli) {
    const conteneur = champ.closest('.form-group');
    if (!estRempli()) { marquerErreur(champ, conteneur, estSelect); return false; }
    effacerErreur(champ, conteneur, estSelect);
    return true;
  }

  function validerEtape(n) {
    if (n === 1) {
      return validerChamp(document.getElementById('select-logement'), true, () => !!getCustomSelectValue('select-logement'));
    }
    if (n === 2) {
      return validerChamp(document.getElementById('select-plateforme'), true, () => !!getCustomSelectValue('select-plateforme'));
    }
    if (n === 3) {
      const champ = document.getElementById('input-client-nom');
      return validerChamp(champ, false, () => !!champ.value.trim());
    }
    if (n === 4) {
      const champA = document.getElementById('input-arrivee');
      const champD = document.getElementById('input-depart');
      const validA = validerChamp(champA, false, () => !!champA.dataset.iso);
      const validD = validerChamp(champD, false, () => !!champD.dataset.iso);
      return validA && validD;
    }
    if (n === 5) {
      return validerChamp(document.getElementById('select-agent'), true, () => !!getCustomSelectValue('select-agent'));
    }
    return true;
  }

  // Effacement de l'erreur dès que le champ se remplit
  document.getElementById('input-client-nom').addEventListener('input', (e) => {
    if (e.target.value.trim()) effacerErreur(e.target, e.target.closest('.form-group'), false);
  });

  btnNext.addEventListener('click', () => {
    if (!validerEtape(etapeActuelle)) return;
    if (etapeActuelle < TOTAL_ETAPES) {
      afficherEtape(etapeActuelle + 1);
    } else {
      document.getElementById('reservation-form').requestSubmit();
    }
  });

  btnPrev.addEventListener('click', () => {
    if (etapeActuelle > 1) afficherEtape(etapeActuelle - 1);
  });

  afficherEtape(1);

  // --- Écran de résultat plein page (succès / erreur) ---
  function afficherEcranResultat({ succes, titre, sousTitre }) {
    document.querySelector('.form-steps-container').style.display = 'none';
    document.getElementById('form-progress').style.display = 'none';
    document.querySelector('.form-submit-bar').style.display = 'none';

    const icone = succes ? `
      <svg class="result-checkmark" viewBox="0 0 52 52">
        <circle class="result-checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
        <path class="result-checkmark__check" fill="none" d="M14 27l8 8 16-16"/>
      </svg>` : `
      <svg class="result-cross" viewBox="0 0 52 52">
        <circle class="result-cross__circle" cx="26" cy="26" r="25" fill="none"/>
        <path class="result-cross__line" fill="none" d="M16 16l20 20"/>
        <path class="result-cross__line" fill="none" d="M36 16l-20 20"/>
      </svg>`;

    const ecran = document.createElement('div');
    ecran.className = `result-screen result-screen--${succes ? 'success' : 'error'}`;
    ecran.id = 'result-screen';
    ecran.innerHTML = `
      <div class="result-screen__icon">${icone}</div>
      <h2 class="result-screen__title">${titre}</h2>
      <p class="result-screen__subtitle">${sousTitre}</p>
      <button class="btn btn--primary btn--full" id="btn-result-home">Retour au tableau de bord</button>
    `;
    // Inséré dans .page-content (déjà centré verticalement par .form-page)
    document.querySelector('.page-content').appendChild(ecran);

    document.getElementById('btn-result-home').addEventListener('click', () => {
      window.location.hash = '#/host/dashboard';
    });
  }

  // --- Custom selects ---
  initCustomSelect('select-plateforme', (val) => {
    document.getElementById('plateforme-autre-group').style.display = val === 'Autre' ? '' : 'none';
    if (val !== 'Autre') document.getElementById('input-plateforme-autre').value = '';
    if (val) effacerErreur(document.getElementById('select-plateforme'), document.getElementById('select-plateforme').closest('.form-group'), true);
  });

  initCustomSelect('select-logement', (val) => {
    const logement = (window._logements || []).find(l => l.id === val);
    const codeGroup = document.getElementById('code-acces-group');
    const codeInput = document.getElementById('input-code-acces');
    if (logement?.code_acces) {
      codeInput.value = logement.code_acces;
      codeGroup.style.display = '';
    } else {
      codeInput.value = '';
      codeGroup.style.display = 'none';
    }

    const alarmeGroup = document.getElementById('code-alarme-group');
    const alarmeInput = document.getElementById('input-code-alarme');
    const codeAlarme  = logement?.codeAlarme ?? '';
    if (codeAlarme) {
      alarmeInput.value = codeAlarme;
      alarmeGroup.style.display = '';
    } else {
      alarmeInput.value = '';
      alarmeGroup.style.display = 'none';
    }

    if (val) effacerErreur(document.getElementById('select-logement'), document.getElementById('select-logement').closest('.form-group'), true);
  });

  initCustomSelect('select-agent', (val) => {
    if (val) effacerErreur(document.getElementById('select-agent'), document.getElementById('select-agent').closest('.form-group'), true);
  });

  // --- Chargement logements ---
  try {
    const resLog = await getLogements();
    window._logements = resLog?.logements || [];
    populateCustomSelect('select-logement',
      window._logements.map(l => ({ value: l.id, label: l.nom })),
      window._logements.length ? '— Choisir —' : 'Aucun logement'
    );
  } catch {
    populateCustomSelect('select-logement', [], 'Erreur de chargement');
  }

  // --- Chargement agents ---
  try {
    const resAg = await getAgents();
    const agents = resAg?.agents || [];
    populateCustomSelect('select-agent',
      agents.map(a => ({ value: a.userId, label: a.nom })),
      agents.length ? '— Choisir un agent —' : 'Aucun agent'
    );
  } catch {
    populateCustomSelect('select-agent', [], 'Erreur de chargement');
  }

  // --- Stepper animaux (boutons +/-) ---
  const steppers = [
    { id: 'animaux', min: 1, max: 20 },
  ];
  const counts = { adultes: 1, enfants: 0, bebes: 0, animaux: 1 };

  function updateTotal() {
    const total = counts.adultes + counts.enfants + counts.bebes;
    document.getElementById('recap-voyageurs').textContent = total + (total > 1 ? ' voyageurs' : ' voyageur');
  }

  steppers.forEach(({ id, min, max }) => {
    const minusBtn = document.getElementById(`step-${id}-minus`);
    const plusBtn  = document.getElementById(`step-${id}-plus`);
    const valueEl  = document.getElementById(`step-${id}-value`);

    function sync() {
      valueEl.textContent  = counts[id];
      minusBtn.disabled    = counts[id] <= min;
      plusBtn.disabled     = counts[id] >= max;
      updateTotal();
    }
    minusBtn.addEventListener('click', () => { if (counts[id] > min) { counts[id]--; sync(); } });
    plusBtn.addEventListener( 'click', () => { if (counts[id] < max) { counts[id]++; sync(); } });
    sync();
  });

  // --- Inputs texte adultes / enfants / bébés ---
  function initInputVoyageur(id, min) {
    const input  = document.getElementById(`input-${id}`);
    const hidden = document.getElementById(`step-${id}-value`);
    input.addEventListener('input', () => {
      let valeur = parseInt(input.value, 10);
      if (isNaN(valeur) || valeur < min) valeur = min;
      counts[id] = valeur;
      hidden.textContent = valeur;
      updateTotal();
    });
  }

  initInputVoyageur('adultes', 1);
  initInputVoyageur('enfants', 0);
  initInputVoyageur('bebes',   0);

  // --- Toggle animaux ---
  document.getElementById('toggle-animaux').addEventListener('change', (e) => {
    const grp = document.getElementById('nb-animaux-group');
    grp.style.display = e.target.checked ? '' : 'none';
    if (!e.target.checked) {
      counts.animaux = 1;
      document.getElementById('step-animaux-value').textContent = '1';
      document.getElementById('step-animaux-minus').disabled = true;
    }
  });

  // --- Calcul nuits ---
  const inputArrivee = document.getElementById('input-arrivee');
  const inputDepart  = document.getElementById('input-depart');
  const dateSummary  = document.getElementById('date-summary');

  function updateNuits() {
    const a = inputArrivee.dataset.iso;
    const d = inputDepart.dataset.iso;
    if (!a || !d || new Date(d) <= new Date(a)) { dateSummary.style.display = 'none'; return; }
    const nuits = calcNuits(a, d);
    dateSummary.textContent = nuits + (nuits > 1 ? ' nuits' : ' nuit');
    dateSummary.style.display = 'block';
  }

  inputArrivee.addEventListener('change', () => {
    if (inputDepart.dataset.iso && inputDepart.dataset.iso <= inputArrivee.dataset.iso) {
      inputDepart.value = '';
      delete inputDepart.dataset.iso;
    }
    if (inputArrivee.dataset.iso) effacerErreur(inputArrivee, inputArrivee.closest('.form-group'), false);
    updateNuits();
  });
  inputDepart.addEventListener('change', () => {
    if (inputDepart.dataset.iso) effacerErreur(inputDepart, inputDepart.closest('.form-group'), false);
    updateNuits();
  });
  inputDepart.addEventListener('change', () => {
    const interventionEl = document.getElementById('input-date-intervention');
    if (inputDepart.dataset.iso) {
      interventionEl.dataset.iso = inputDepart.dataset.iso;
      interventionEl.value = formatDateFr(inputDepart.dataset.iso);
    }
  });

  // --- Date pickers personnalisés (arrivée / départ / date d'intervention) ---
  initDatePicker(inputArrivee, { minDate: () => isoAujourdhui() });
  initDatePicker(inputDepart,  { minDate: () => inputArrivee.dataset.iso ? isoLendemain(inputArrivee.dataset.iso) : isoAujourdhui() });
  initDatePicker(document.getElementById('input-date-intervention'), { minDate: () => isoAujourdhui() });

  // --- Champs heure avec auto-formatage HH:MM ---
  initChampHeure(document.getElementById('input-heure-arrivee'));
  initChampHeure(document.getElementById('input-heure-depart'));
  initChampHeure(document.getElementById('input-heure-debut'));
  initChampHeure(document.getElementById('input-heure-fin'));

  // --- Soumission ---
  document.getElementById('reservation-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const logement_id   = getCustomSelectValue('select-logement');
    const plateforme_raw = getCustomSelectValue('select-plateforme');
    const plateforme_autre = document.getElementById('input-plateforme-autre').value.trim();
    const plateforme    = plateforme_raw === 'Autre' ? plateforme_autre : plateforme_raw;
    const ref_reservation = document.getElementById('input-ref').value.trim();
    const client_nom    = document.getElementById('input-client-nom').value.trim();
    const date_arrivee  = inputArrivee.dataset.iso || '';
    const heure_arrivee = document.getElementById('input-heure-arrivee').value;
    const date_depart   = inputDepart.dataset.iso || '';
    const heure_depart  = document.getElementById('input-heure-depart').value;
    const agent_id      = getCustomSelectValue('select-agent');
    const date_intervention = document.getElementById('input-date-intervention').dataset.iso || date_depart;
    const heure_debut   = document.getElementById('input-heure-debut').value;
    const heure_fin     = document.getElementById('input-heure-fin').value;
    const remarques     = document.getElementById('input-remarques').value.trim();
    const lit_bebe      = document.getElementById('toggle-lit-bebe').checked;
    const animauxChecked = document.getElementById('toggle-animaux').checked;
    const nb_animaux    = animauxChecked ? counts.animaux : 0;
    const nb_adultes    = counts.adultes;
    const nb_enfants    = counts.enfants;
    const nb_bebes      = counts.bebes;

    const linge = {
      draps:      parseInt(document.getElementById('linge-draps').value)      || 0,
      housses:    parseInt(document.getElementById('linge-housses').value)    || 0,
      taies:      parseInt(document.getElementById('linge-taies').value)      || 0,
      serv_bain:  parseInt(document.getElementById('linge-serv-bain').value)  || 0,
      serv_mains: parseInt(document.getElementById('linge-serv-mains').value) || 0,
      tapis:      parseInt(document.getElementById('linge-tapis').value)      || 0,
      torchons:   parseInt(document.getElementById('linge-torchons').value)   || 0,
    };

    const gi = id => parseInt(document.getElementById(id)?.value) || 0;
    const consommables = {
      gel_douche:        gi('conso-gel-douche'),
      shampoing:         gi('conso-shampoing'),
      apres_shampoing:   gi('conso-apres-shampoing'),
      savon:             gi('conso-savon'),
      kit_hygiene:       gi('conso-kit-hygiene'),
      brosse_dents:      gi('conso-brosse-dents'),
      boules_quies:      gi('conso-boules-quies'),
      cafe:              gi('conso-cafe'),
      the:               gi('conso-the'),
      sucre:             gi('conso-sucre'),
      sel_poivre:        gi('conso-sel-poivre'),
      huile_olive:       gi('conso-huile-olive'),
      liquide_vaisselle: gi('conso-liquide-vaisselle'),
      eponge:            gi('conso-eponge'),
      sacs_poubelle:     gi('conso-sacs-poubelle'),
      essuie_tout:       gi('conso-essuie-tout'),
      eau:               gi('conso-eau'),
      autre:             document.getElementById('conso-autre')?.value.trim() || '',
    };

    const btn = document.getElementById('btn-next');
    btn.disabled    = true;
    btn.textContent = modeEdition ? 'Enregistrement en cours…' : 'Création en cours…';

    const payload = {
      logement_id, plateforme, ref_reservation,
      client_nom, nb_adultes, nb_enfants, nb_bebes, nb_animaux, lit_bebe,
      date_arrivee, heure_arrivee, date_depart, heure_depart,
      agent_id, date_intervention, heure_debut, heure_fin,
      linge, consommables, remarques,
    };

    try {
      const res = modeEdition
        ? await gasRequest('modifierReservation', { ...payload, reservation_id: editData.reservation_id, intervention_id: editData.id })
        : await creerReservation(payload);

      if (res?.success) {
        afficherEcranResultat({
          succes: true,
          titre: modeEdition ? 'Réservation modifiée' : 'Réservation créée',
          sousTitre: `${client_nom} · Intervention le ${formatDate(date_intervention)}`,
        });
      } else {
        afficherEcranResultat({
          succes: false,
          titre: 'Une erreur est survenue',
          sousTitre: res?.error || (modeEdition ? 'Erreur lors de la modification.' : 'Erreur lors de la création.'),
        });
      }
    } catch {
      afficherEcranResultat({
        succes: false,
        titre: 'Une erreur est survenue',
        sousTitre: 'Erreur réseau. Réessayez.',
      });
    }
  });

  // --- Mode édition : pré-remplissage des champs depuis la réservation existante ---
  function selectionnerOption(selectId, valeur) {
    const opt = document.querySelector(`#${selectId} .custom-select__option[data-value="${valeur}"]`);
    if (opt) opt.click();
  }

  function definirDate(input, iso) {
    if (!iso) return;
    input.dataset.iso = iso;
    input.value = formatDateFr(iso);
    input.dispatchEvent(new Event('change'));
  }

  function preremplirFormulaire(d) {
    selectionnerOption('select-logement', d.logement_id);

    const plateformesConnues = ['Airbnb', 'Booking', 'Direct'];
    if (plateformesConnues.includes(d.plateforme)) {
      selectionnerOption('select-plateforme', d.plateforme);
    } else if (d.plateforme) {
      selectionnerOption('select-plateforme', 'Autre');
      document.getElementById('input-plateforme-autre').value = d.plateforme;
    }
    document.getElementById('input-ref').value = d.ref_reservation || '';

    document.getElementById('input-client-nom').value = d.client_nom || '';

    document.getElementById('input-adultes').value = d.nb_adultes || 1;
    document.getElementById('input-adultes').dispatchEvent(new Event('input'));
    document.getElementById('input-enfants').value = d.nb_enfants || 0;
    document.getElementById('input-enfants').dispatchEvent(new Event('input'));
    document.getElementById('input-bebes').value = d.nb_bebes || 0;
    document.getElementById('input-bebes').dispatchEvent(new Event('input'));

    if (d.nb_animaux > 0) {
      document.getElementById('toggle-animaux').checked = true;
      document.getElementById('toggle-animaux').dispatchEvent(new Event('change'));
      counts.animaux = d.nb_animaux;
      document.getElementById('step-animaux-value').textContent = d.nb_animaux;
      document.getElementById('step-animaux-minus').disabled = d.nb_animaux <= 1;
    }
    if (d.lit_bebe) document.getElementById('toggle-lit-bebe').checked = true;

    definirDate(inputArrivee, d.date_arrivee);
    definirDate(inputDepart,  d.date_depart);
    definirDate(document.getElementById('input-date-intervention'), d.date_intervention);

    document.getElementById('input-heure-arrivee').value = d.heure_arrivee || '';
    document.getElementById('input-heure-depart').value  = d.heure_depart  || '';
    document.getElementById('input-heure-debut').value   = d.heure_debut   || '';
    document.getElementById('input-heure-fin').value     = d.heure_fin     || '';

    document.getElementById('input-remarques').value = d.remarques || '';

    const linge = d.linge || {};
    document.getElementById('linge-draps').value      = linge.draps      || 0;
    document.getElementById('linge-housses').value    = linge.housses    || 0;
    document.getElementById('linge-taies').value       = linge.taies      || 0;
    document.getElementById('linge-serv-bain').value  = linge.serv_bain  || 0;
    document.getElementById('linge-serv-mains').value = linge.serv_mains || 0;
    document.getElementById('linge-tapis').value      = linge.tapis     || 0;
    document.getElementById('linge-torchons').value   = linge.torchons  || 0;

    selectionnerOption('select-agent', d.agent_id);
  }

  if (modeEdition) {
    preremplirFormulaire(editData);
    session.remove('edit_reservation');
  }
};

/* ---------------------------------------------------------- */
/*  Utilitaires partagés : hero + linge (détail hôte/agent)   */
/* ---------------------------------------------------------- */
function buildDetailHero(item) {
  const nuits = calcNuits(item.date_arrivee, item.date_depart);
  return `
    <div class="intervention-hero">
      <div class="intervention-hero__logement">${item.client_nom || '—'}</div>
      <div class="intervention-hero__meta">
        <span>${formatDate(item.date_arrivee)} → ${formatDate(item.date_depart)}</span>
        <span>${pluriel(nuits, 'nuit', 'nuits')}</span>
      </div>
      <div class="intervention-hero__badge">${statutBadge(item.statut)}</div>
    </div>
  `;
}

const LINGE_LABELS = {
  draps: 'Draps', housses: 'Housses', taies: 'Taies',
  serv_bain: 'Serv. bain', serv_mains: 'Serv. mains',
  tapis: 'Tapis de bain', torchons: 'Torchons',
};
function buildLingeItems(linge) {
  return Object.entries(LINGE_LABELS)
    .filter(([k]) => (linge?.[k] || 0) > 0)
    .map(([k, label]) => `${label} : ${linge[k]}`);
}

/* ---------------------------------------------------------- */
/*  Détail réservation Hôte                                   */
/* ---------------------------------------------------------- */
window.initHostDetail = async function () {
  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.hash = '#/host/dashboard';
  });

  const id = window._currentId;
  if (!id || id === 'reservation') { window.location.hash = '#/host/dashboard'; return; }

  try {
    const res  = await getIntervention(id);
    const item = res?.intervention;
    if (!item) throw new Error('Intervention non trouvée');

    setHTML('#header-badge', statutBadge(item.statut));

    const nuits    = calcNuits(item.date_arrivee, item.date_depart);
    const estClose = item.statut === 'terminee' || item.statut === 'annulee';

    const nb_adultes = item.nb_adultes || 0;
    const nb_enfants = item.nb_enfants || 0;
    const nb_bebes   = item.nb_bebes   || 0;
    const nb_animaux = item.nb_animaux || 0;
    const voyageursParts = [];
    if (nb_adultes > 0) voyageursParts.push(pluriel(nb_adultes, 'adulte', 'adultes'));
    if (nb_enfants > 0) voyageursParts.push(pluriel(nb_enfants, 'enfant', 'enfants'));
    if (nb_bebes   > 0) voyageursParts.push(pluriel(nb_bebes,   'bébé',   'bébés'));
    const voyageursStr = voyageursParts.join(', ') || '—';

    const lingeItems = buildLingeItems(item.linge);

    document.getElementById('detail-content').innerHTML = `
      ${buildDetailHero(item)}

      <div class="info-block">
        <div class="info-block__title">Réservation</div>
        <div class="info-block__body">
          ${item.plateforme ? `<div class="detail-row"><span class="detail-label">Plateforme</span><span class="detail-value">${item.plateforme}${item.ref_reservation ? ' · #' + item.ref_reservation : ''}</span></div>` : ''}
          <div class="detail-row"><span class="detail-label">Arrivée</span><span class="detail-value">${formatDate(item.date_arrivee)} à ${formatHeure(item.heure_arrivee)}</span></div>
          <div class="detail-row"><span class="detail-label">Départ</span><span class="detail-value">${formatDate(item.date_depart)} à ${formatHeure(item.heure_depart)}</span></div>
          <div class="detail-row"><span class="detail-label">Durée</span><span class="detail-value">${pluriel(nuits, 'nuit', 'nuits')}</span></div>
          <div class="detail-row"><span class="detail-label">Voyageurs</span><span class="detail-value">${voyageursStr}</span></div>
          ${nb_animaux > 0 ? `<div class="detail-row"><span class="detail-label">Animaux</span><span class="detail-value">${pluriel(nb_animaux, 'animal', 'animaux')}</span></div>` : ''}
          ${item.lit_bebe ? `<div class="detail-row"><span class="detail-label">Lit bébé</span><span class="detail-value">Oui</span></div>` : ''}
        </div>
      </div>

      <div class="info-block">
        <div class="info-block__title">Intervention</div>
        <div class="info-block__body">
          <div class="detail-row"><span class="detail-label">Agent</span><span class="detail-value">${item.agentName || 'Non assigné'}</span></div>
          <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formatDate(item.date_intervention)}</span></div>
          <div class="detail-row"><span class="detail-label">Horaires</span><span class="detail-value">${formatHeure(item.heure_debut)} – ${formatHeure(item.heure_fin)}</span></div>
          ${item.remarques ? `<div class="detail-row"><span class="detail-label">Remarques</span><span class="detail-value" style="white-space:pre-line;">${item.remarques}</span></div>` : ''}
        </div>
      </div>

      ${lingeItems.length ? `
      <div class="info-block">
        <div class="info-block__title">Linge</div>
        <div class="info-block__body">
          <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.6;">${lingeItems.join(' · ')}</p>
        </div>
      </div>` : ''}

      ${item.cloture ? `
      <div class="compte-rendu-block">
        <div class="compte-rendu-block__header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Compte-rendu de l'agent
        </div>
        ${item.cloture.photos?.length ? `
        <div class="compte-rendu-photos">
          ${item.cloture.photos.slice(0, 6).map(url => `<img class="compte-rendu-photo" src="${url}" alt="Photo de clôture" loading="lazy">`).join('')}
        </div>` : ''}
        ${item.cloture.remarque ? `<div class="compte-rendu-note">${item.cloture.remarque}</div>` : ''}
        ${item.cloture.signalements?.length ? `
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
          ${item.cloture.signalements.map(s => `<span class="badge badge--warning">${s}</span>`).join('')}
        </div>` : ''}
      </div>` : ''}

      ${!estClose ? `
      <div class="form-submit-bar">
        <button class="btn btn--secondary" id="btn-edit">Modifier</button>
        <button class="btn btn--danger" id="btn-cancel">Annuler</button>
      </div>` : item.statut === 'terminee' ? `
      <div class="action-bar">
        <button class="btn btn--primary btn--full btn--lg" id="btn-rapport">Consulter le rapport</button>
      </div>` : ''}
    `;

    document.getElementById('btn-edit')?.addEventListener('click', () => {
      // L'objet intervention complet (reservation_id, agent_id, tous les champs) sert au pré-remplissage du formulaire
      session.set('edit_reservation', item);
      window.location.hash = '#/host/reservation/new';
    });

    // Route du rapport détaillé pas encore implémentée : la redirection suffit pour l'instant
    document.getElementById('btn-rapport')?.addEventListener('click', () => {
      window.location.hash = '#/host/reservation/' + id + '/rapport';
    });

    // --- Écran plein page après tentative d'annulation (succès / erreur) ---
    function afficherEcranAnnulation(succes, messageErreur) {
      const classeNeutre = succes ? ' result-cross--neutral' : '';
      const icone = `
        <svg class="result-cross${classeNeutre}" viewBox="0 0 52 52">
          <circle class="result-cross__circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="result-cross__line" fill="none" d="M16 16l20 20"/>
          <path class="result-cross__line" fill="none" d="M36 16l-20 20"/>
        </svg>`;

      const titre      = succes ? 'Réservation annulée' : 'Impossible d\'annuler';
      const sousTitre   = succes ? 'L\'intervention a été retirée du planning.' : (messageErreur || 'Erreur réseau.');
      const labelBouton = succes ? 'Retour au tableau de bord' : 'Retour';

      const conteneur = document.getElementById('detail-content');
      conteneur.style.padding = '0';
      conteneur.innerHTML = `
        <div class="result-screen result-screen--cancelled">
          <div class="result-screen__icon">${icone}</div>
          <h2 class="result-screen__title">${titre}</h2>
          <p class="result-screen__subtitle">${sousTitre}</p>
          <button class="btn btn--primary btn--full" id="btn-result-annulation">${labelBouton}</button>
        </div>
      `;

      document.getElementById('btn-result-annulation').addEventListener('click', () => {
        if (succes) window.location.hash = '#/host/dashboard';
        else history.back();
      });
    }

    document.getElementById('btn-cancel')?.addEventListener('click', async () => {
      const ok = await confirmerAction({
        titre: 'Annuler la réservation ?',
        message: 'Cette action est irréversible. L\'intervention sera retirée du planning de l\'agent.',
        labelOui: 'Oui, annuler',
        labelNon: 'Non, garder',
        danger: true,
      });
      if (!ok) return;
      try {
        const r = await cancelReservation(id);
        if (r?.success) {
          afficherEcranAnnulation(true);
        } else {
          afficherEcranAnnulation(false, r?.error);
        }
      } catch {
        afficherEcranAnnulation(false, 'Erreur réseau.');
      }
    });

  } catch {
    document.getElementById('detail-content').innerHTML =
      '<div class="error-state"><p>Réservation introuvable.</p></div>';
  }
};

/* ---------------------------------------------------------- */
/*  Détail intervention Agent                                 */
/* ---------------------------------------------------------- */
window.initAgentDetail = async function () {
  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.hash = '#/agent/dashboard';
  });

  const id = window._currentId;
  if (!id || id === 'intervention') { window.location.hash = '#/agent/dashboard'; return; }

  let photosBase64 = []; // Réutilisé par la future checklist interactive de clôture

  try {
    const res  = await getIntervention(id);
    const item = res?.intervention;
    if (!item) throw new Error('Introuvable');

    setHTML('#header-badge', statutBadge(item.statut));

    const estClose   = item.statut === 'terminee' || item.statut === 'annulee';
    const nb_animaux = item.nb_animaux || 0;
    const lingeItems = buildLingeItems(item.linge);

    document.getElementById('detail-content').innerHTML = `
      ${buildDetailHero(item)}

      <div class="info-block">
        <div class="info-block__title">Infos pratiques</div>
        <div class="info-block__body">
          <div class="detail-row"><span class="detail-label">Départ client</span><span class="detail-value" style="font-weight:600;color:var(--accent);">${formatHeure(item.heure_depart)}</span></div>
          <div class="detail-row"><span class="detail-label">Début intervention</span><span class="detail-value">${formatHeure(item.heure_debut)}</span></div>
          <div class="detail-row"><span class="detail-label">Fin intervention</span><span class="detail-value">${formatHeure(item.heure_fin)}</span></div>
        </div>
      </div>

      ${nb_animaux > 0 || item.lit_bebe ? `
      <div class="info-block">
        <div class="info-block__title">Voyageurs</div>
        <div class="info-block__body">
          ${nb_animaux > 0 ? `<div class="detail-row"><span class="detail-label">Animaux</span><span class="detail-value">${pluriel(nb_animaux, 'animal', 'animaux')}</span></div>` : ''}
          ${item.lit_bebe ? `<div class="detail-row"><span class="detail-label">Lit bébé</span><span class="detail-value">Oui</span></div>` : ''}
        </div>
      </div>` : ''}

      ${item.remarques ? `
      <div class="info-block">
        <div class="info-block__title">Instructions</div>
        <div class="info-block__body">
          <p style="color:var(--text-primary);font-size:0.9375rem;line-height:1.6;white-space:pre-line;">${item.remarques}</p>
        </div>
      </div>` : ''}

      ${lingeItems.length ? `
      <div class="info-block">
        <div class="info-block__title">Linge à préparer</div>
        <div class="info-block__body">
          <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.6;">${lingeItems.join(' · ')}</p>
        </div>
      </div>` : ''}

      ${estClose && item.cloture ? `
      <div class="compte-rendu-block">
        <div class="compte-rendu-block__header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Intervention clôturée
        </div>
        ${item.cloture.photos?.length ? `
        <div class="compte-rendu-photos">
          ${item.cloture.photos.slice(0, 6).map(url => `<img class="compte-rendu-photo" src="${url}" alt="" loading="lazy">`).join('')}
        </div>` : ''}
        ${item.cloture.remarque ? `<div class="compte-rendu-note">${item.cloture.remarque}</div>` : ''}
        ${item.cloture.signalements?.length ? `
        <div style="margin-top:10px;">
          <p style="font-size:0.75rem;font-weight:600;color:var(--warning);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Signalements</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${item.cloture.signalements.map(s => `<span class="badge badge--warning">${s}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>` : ''}

      ${!estClose ? `
      <div class="action-bar">
        <button class="btn btn--primary btn--full btn--lg" id="btn-start">Débuter l'intervention</button>
      </div>` : ''}
    `;

    // Workflow de clôture pas encore défini : message d'attente en lieu et place de la checklist
    document.getElementById('btn-start')?.addEventListener('click', () => {
      confirmerAction({
        titre: 'Fonctionnalité à venir',
        message: 'La checklist interactive sera disponible prochainement.',
        labelOui: 'OK',
        labelNon: '',
        danger: false,
      });
    });

  } catch {
    document.getElementById('detail-content').innerHTML =
      '<div class="error-state"><p>Intervention introuvable.</p></div>';
  }
};
