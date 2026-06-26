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
              ${today ? '<div class="today-label">Aujourd\'hui</div>' : ''}
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
                <div style="width:100%;display:flex;justify-content:space-between;align-items:flex-end;margin-top:2px;">
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
function confirmerAction({ titre, message, labelOui = 'Confirmer', labelNon = 'Annuler', danger = true, icone }) {
  return new Promise((resolve) => {
    const iconeDefaut = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>`;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-backdrop"></div>
      <div class="confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirm-sheet-titre">
        <div class="confirm-sheet__icon${danger ? '' : ' confirm-sheet__icon--accent'}">
          ${icone || iconeDefaut}
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
  // Lire ET supprimer immédiatement — évite la persistance du flag
  // si l'utilisateur quitte le formulaire avant la fin de l'init
  const editData    = session.get('edit_reservation');
  session.remove('edit_reservation');
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
      <div class="intervention-hero__dates">${formatDate(item.date_arrivee)} → ${formatDate(item.date_depart)}</div>
      <div class="intervention-hero__nuits">${pluriel(nuits, 'nuit', 'nuits')}</div>
      <div class="intervention-hero__badge">${statutBadge(item.statut)}</div>
    </div>
  `;
}

function buildVoyageursChips(item) {
  const nb_adultes = item.nb_adultes || 0;
  const nb_enfants = item.nb_enfants || 0;
  const nb_bebes   = item.nb_bebes   || 0;
  const chips = [];
  if (nb_adultes > 0) chips.push(`
    <span class="voyageur-chip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      ${pluriel(nb_adultes, 'adulte', 'adultes')}
    </span>`);
  if (nb_enfants > 0) chips.push(`
    <span class="voyageur-chip">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="3.5"/>
        <path d="M5 21c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
        <path d="M12 10.5v3"/>
      </svg>
      ${pluriel(nb_enfants, 'enfant', 'enfants')}
    </span>`);
  if (nb_bebes > 0) chips.push(`
    <span class="voyageur-chip">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h2l3 9h8l2-6H8"/>
        <circle cx="10" cy="19" r="1.5"/>
        <circle cx="17" cy="19" r="1.5"/>
        <path d="M5 6L4 3"/>
      </svg>
      ${pluriel(nb_bebes, 'bébé', 'bébés')}
    </span>`);
  if (!chips.length) return '';
  return `
    <div class="info-row-voyageurs">
      <span class="detail-label">Voyageurs</span>
      <div class="voyageur-chips">${chips.join('')}</div>
    </div>`;
}

const LINGE_LABELS = {
  draps: 'Draps', housses: 'Housses', taies: 'Taies',
  serv_bain: 'Serv. bain', serv_mains: 'Serv. mains',
  tapis: 'Tapis de bain', torchons: 'Torchons',
};
// Accorde un label de linge au singulier/pluriel selon la quantité (ex: "Drap" / "Draps")
function pluraliserLabel(label, count) {
  const base = label.endsWith('s') ? label.slice(0, -1) : label;
  return count > 1 ? base + 's' : base;
}

function buildLingeHTML(linge, cochesFilter = null) {
  const items = Object.entries(LINGE_LABELS)
    .filter(([k]) => (linge?.[k] || 0) > 0 && (cochesFilter === null || cochesFilter.includes(k)))
    .map(([k, label]) => ({ label: pluraliserLabel(label, linge[k]), count: linge[k] }));
  if (!items.length) return '';

  const isImpair     = items.length % 2 === 1;
  const lastRowStart = isImpair ? items.length - 1 : items.length - 2;

  return items.map(({ label, count }, i) => {
    const noBorderBottom = i >= lastRowStart;
    return `<div class="linge-cell${noBorderBottom ? ' linge-cell--no-bottom' : ''}">
      <span class="linge-cell__label">${label}</span>
      <span class="linge-cell__count">${count}</span>
    </div>`;
  }).join('');
}

// Une ligne de checklist linge cochable (item standard ou « Lit bébé installé »)
function buildLingeCheckRowHTML({ key, label, count, spanFull, checked }) {
  return `
    <label class="linge-check-row${spanFull ? ' linge-check-row--full' : ''}">
      <input type="checkbox" class="linge-check-input" data-linge-check="${key}"${checked ? ' checked' : ''}>
      <span class="linge-check-box">
        <svg class="linge-check-box-mark" viewBox="0 0 12 10" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 5.5 4.5 9 11 1"/>
        </svg>
      </span>
      <span class="linge-check-label">${label}</span>
      <span class="linge-spacer"></span>
      <span class="linge-check-count">${count}</span>
    </label>`;
}

// Bloc Linge complet (clôture agent) : items cochables + lit bébé + toggle « Linge manquant ».
// Renvoie '' si aucun article > 0 (bloc absent, traité comme valide ailleurs).
function buildLingeBlocHTML(linge, litBebe, draft) {
  const items = Object.entries(LINGE_LABELS)
    .filter(([k]) => (linge?.[k] || 0) > 0)
    .map(([k, label]) => ({ key: k, label, count: linge[k] }));
  if (!items.length) return '';

  const lingeCoches = draft?.lingeCoches || [];
  const isOdd = items.length % 2 === 1;

  const rows = items.map(({ key, label, count }, i) => buildLingeCheckRowHTML({
    key, label, count,
    spanFull: isOdd && i === items.length - 1,
    checked: lingeCoches.includes(key),
  })).join('');

  const manquantActif = !!draft?.lingeManquantActif;
  const bebeActif = lingeCoches.includes('lit_bebe');

  return `
    <div class="linge-checklist">${rows}</div>
    <div class="linge-manquant">
      <label class="toggle-label">
        <span>Linge manquant</span>
        <input type="checkbox" class="toggle-input" id="toggle-linge-manquant"${manquantActif ? ' checked' : ''}>
      </label>
      <div class="slide-down${manquantActif ? ' is-open' : ''}" id="linge-manquant-slide">
        <div class="slide-down__inner">
          <textarea class="input" id="linge-manquant-texte" rows="2" placeholder="Précisez...">${draft?.lingeManquantTexte || ''}</textarea>
        </div>
      </div>
      ${litBebe ? `
      <label class="toggle-label">
        <span>Lit bébé installé</span>
        <input type="checkbox" class="toggle-input" data-linge-check="lit_bebe"${bebeActif ? ' checked' : ''}>
      </label>` : ''}
    </div>`;
}

// 7 signalements standards + RAS (exclusif). Les 3 marqués texteRequis ouvrent un champ obligatoire.
const SIGNALEMENTS_OPTIONS = [
  { type: 'Mobilier abîmé' },
  { type: 'Tâche(s) tenace(s)' },
  { type: 'Literie détériorée' },
  { type: 'Casse(s) / bris' },
  { type: 'Manque de stock', texteRequis: true, placeholder: 'Précisez…' },
  { type: 'Autre(s) problème(s)', texteRequis: true, placeholder: 'Précisez...' },
  { type: 'Vol', texteRequis: true, placeholder: 'Précisez…' },
];

function buildSignalementsHTML(draft) {
  const etats = draft?.signalements || {};

  const items = SIGNALEMENTS_OPTIONS.map(opt => {
    const etat    = etats[opt.type] || {};
    const checked = !!etat.checked;
    const champHTML = opt.texteRequis ? `
      <div class="slide-down${checked ? ' is-open' : ''}" data-signalement-slide="${opt.type}">
        <div class="slide-down__inner">
          <textarea class="input" data-signalement-texte="${opt.type}" rows="2" placeholder="${opt.placeholder}">${etat.texte || ''}</textarea>
        </div>
      </div>` : '';
    return `
      <div class="signalement-col">
        <label class="signalement-item">
          <input type="checkbox" data-signalement="${opt.type}"${checked ? ' checked' : ''}>
          <span class="signalement-check"></span>
          <span>${opt.type}</span>
        </label>
        ${champHTML}
      </div>`;
  }).join('');

  const rasHTML = `
    <label class="signalement-item signalement-item--ras">
      <input type="checkbox" id="signalement-ras"${draft?.signalementRAS ? ' checked' : ''}>
      <span class="signalement-check"></span>
      <span>Rien à signaler</span>
    </label>`;

  return `<div class="signalement-grid" id="signalement-grid">${items}${rasHTML}</div>`;
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

    setText('#header-title-main', item.client_nom || '—');

    const fmtCourt = iso => {
      const d = new Date(iso);
      return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    setText('#header-title-sub', `${fmtCourt(item.date_arrivee)} → ${fmtCourt(item.date_depart)}`);

    const estClose = item.statut === 'terminee' || item.statut === 'annulee';
    const nb_animaux = item.nb_animaux || 0;

    const colsAnimauxLitBebe = [];
    if (nb_animaux > 0) colsAnimauxLitBebe.push(`
      <div class="detail-row-2col__col">
        <span class="detail-label">Animaux</span>
        <span class="detail-value">${pluriel(nb_animaux, 'animal', 'animaux')}</span>
      </div>`);
    if (item.lit_bebe) colsAnimauxLitBebe.push(`
      <div class="detail-row-2col__col">
        <span class="detail-label">Lit bébé</span>
        <span class="detail-value">Oui</span>
      </div>`);
    const animauxLitBebeHTML = colsAnimauxLitBebe.length
      ? `<div class="detail-row-2col">${colsAnimauxLitBebe.length === 1 ? `${colsAnimauxLitBebe[0]}<div class="detail-row-2col__col"></div>` : colsAnimauxLitBebe.join('')}</div>`
      : '';

    const lingeHTML = buildLingeHTML(item.linge);

    document.getElementById('detail-content').innerHTML = `
      ${buildDetailHero(item)}

      <div class="info-block">
        <div class="info-block__title">Réservation</div>
        <div class="info-block__body">
          ${item.plateforme ? `<div class="detail-row"><span class="detail-label">Plateforme</span><span class="detail-value">${item.plateforme}${item.ref_reservation ? ' · #' + item.ref_reservation : ''}</span></div>` : ''}
          <div class="detail-row-2col">
            <div class="detail-row-2col__col">
              <span class="detail-label">Arrivée</span>
              <span class="detail-value">${formatDate(item.date_arrivee)}</span>
              <span class="detail-value--accent" style="font-size:0.8125rem;">${formatHeure(item.heure_arrivee)}</span>
            </div>
            <div class="detail-row-2col__col">
              <span class="detail-label">Départ</span>
              <span class="detail-value">${formatDate(item.date_depart)}</span>
              <span class="detail-value--accent" style="font-size:0.8125rem;">${formatHeure(item.heure_depart)}</span>
            </div>
          </div>
          ${buildVoyageursChips(item)}
          ${animauxLitBebeHTML}
        </div>
      </div>

      <div class="info-block">
        <div class="info-block__title">Intervention</div>
        <div class="info-block__body">
          <div class="detail-row"><span class="detail-label">Agent</span><span class="detail-value">${item.agentName || 'Non assigné'}</span></div>
          <div class="detail-row-2col">
            <div class="detail-row-2col__col">
              <span class="detail-label">Date</span>
              <span class="detail-value">${formatDate(item.date_intervention)}</span>
            </div>
            <div class="detail-row-2col__col">
              <span class="detail-label">Horaires</span>
              <span class="detail-value--accent">${formatHeure(item.heure_debut)} – ${formatHeure(item.heure_fin)}</span>
            </div>
          </div>
          ${item.remarques ? `<div class="detail-row"><span class="detail-label">Remarques</span><span class="detail-value" style="white-space:pre-line;padding-bottom:4px;display:block;">${item.remarques}</span></div>` : ''}
        </div>
      </div>

      ${lingeHTML ? `
      <div class="info-block">
        <div class="info-block__title">Linge</div>
        <div class="info-block__body">
          <div class="linge-grid">${lingeHTML}</div>
        </div>
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

    document.getElementById('btn-rapport')?.addEventListener('click', () => {
      window.location.hash = '#/rapport/' + id;
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

// Calcule la durée entre deux heures HH:MM et retourne "X h" ou "X h MM"
function duree(debut, fin) {
  if (!debut || !fin) return '';
  const [h1, m1] = debut.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMin <= 0) return '';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

window.initAgentDetail = async function () {
  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.hash = '#/agent/dashboard';
  });

  const id = window._currentId;
  if (!id || id === 'intervention') { window.location.hash = '#/agent/dashboard'; return; }

  try {
    const res  = await getIntervention(id);
    const item = res?.intervention;
    if (!item) throw new Error('Introuvable');

    setText('#header-title-main', 'Mon intervention');

    const dInter      = new Date(item.date_intervention);
    const labelInter  = isNaN(dInter) ? '' : dInter.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    setText('#header-title-sub', labelInter);

    const estClose   = item.statut === 'terminee' || item.statut === 'annulee';
    const nb_animaux = item.nb_animaux || 0;
    const lingeHTML  = buildLingeHTML(item.linge);

    const colsAnimauxLitBebe = [];
    if (nb_animaux > 0) colsAnimauxLitBebe.push(`
      <div class="detail-row-2col__col">
        <span class="detail-label">Animaux</span>
        <span class="detail-value">${pluriel(nb_animaux, 'animal', 'animaux')}</span>
      </div>`);
    if (item.lit_bebe) colsAnimauxLitBebe.push(`
      <div class="detail-row-2col__col">
        <span class="detail-label">Lit bébé</span>
        <span class="detail-value">Oui</span>
      </div>`);
    const animauxLitBebeHTML = colsAnimauxLitBebe.length
      ? `<div class="detail-row-2col">${colsAnimauxLitBebe.length === 1 ? `${colsAnimauxLitBebe[0]}<div class="detail-row-2col__col"></div>` : colsAnimauxLitBebe.join('')}</div>`
      : '';

    const voyageursChipsHTML = buildVoyageursChips(item);

    document.getElementById('detail-content').innerHTML = `
      ${buildDetailHero(item)}

      <div class="info-block">
        <div class="info-block__title">Infos pratiques</div>
        <div class="info-block__body" style="padding:0;">
          <div class="plage-intervention">
            <div class="plage-intervention__row">
              <span class="plage-intervention__time">${formatHeure(item.heure_debut)}</span>
              <span class="plage-intervention__badge">${duree(item.heure_debut, item.heure_fin)}</span>
              <span class="plage-intervention__time">${formatHeure(item.heure_fin)}</span>
            </div>
            <span class="plage-intervention__label">Plage d'intervention</span>
          </div>
        </div>
      </div>

      ${voyageursChipsHTML || animauxLitBebeHTML ? `
      <div class="info-block">
        <div class="info-block__title">Voyageurs</div>
        <div class="info-block__body">
          ${voyageursChipsHTML}
          ${animauxLitBebeHTML}
        </div>
      </div>` : ''}

      ${item.remarques ? `
      <div class="info-block">
        <div class="info-block__title">Instructions</div>
        <div class="info-block__body">
          <p style="padding:14px 0;color:var(--text-primary);font-size:0.9375rem;line-height:1.6;white-space:pre-line;">${item.remarques}</p>
        </div>
      </div>` : ''}

      ${lingeHTML ? `
      <div class="info-block">
        <div class="info-block__title">Linge à préparer</div>
        <div class="info-block__body">
          <div class="linge-grid">${lingeHTML}</div>
        </div>
      </div>` : ''}

      ${!estClose ? `
      <div class="action-bar">
        <button class="btn btn--primary btn--full btn--lg" id="btn-start">${item.statut === 'en_cours' ? "Reprendre l'intervention" : "Débuter l'intervention"}</button>
      </div>` : item.statut === 'terminee' ? `
      <div class="action-bar">
        <button class="btn btn--primary btn--full btn--lg" id="btn-rapport">Mon rapport</button>
      </div>` : ''}
    `;

    document.getElementById('btn-start')?.addEventListener('click', async () => {
      if (item.statut === 'en_cours') {
        window.location.hash = '#/agent/cloture/' + id;
        return;
      }

      const btn = document.getElementById('btn-start');
      btn.disabled    = true;
      btn.textContent = 'Démarrage…';
      try {
        const r = await debuterIntervention(id);
        if (r?.success) {
          window.location.hash = '#/agent/cloture/' + id;
        } else {
          toast(r?.error || 'Erreur lors du démarrage.', 'error');
          btn.disabled    = false;
          btn.textContent = "Débuter l'intervention";
        }
      } catch {
        toast('Erreur réseau.', 'error');
        btn.disabled    = false;
        btn.textContent = "Débuter l'intervention";
      }
    });

    // Route du rapport détaillé pas encore implémentée
    document.getElementById('btn-rapport')?.addEventListener('click', () => {
      session.set('rapport_intervention_id', item.id);
      window.location.hash = '#/rapport/' + item.id;
    });

  } catch {
    document.getElementById('detail-content').innerHTML =
      '<div class="error-state"><p>Intervention introuvable.</p></div>';
  }
};

/* ---------------------------------------------------------- */
/*  Clôture intervention Agent                                */
/* ---------------------------------------------------------- */

// Styles propres à la page de clôture, injectés une seule fois (même principe que initCustomSelect)
function injectClotureStyles() {
  if (document.getElementById('cloture-style')) return;
  const css = `
    .photo-preview-item{position:relative;}
    .photo-preview-remove{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--danger);color:#fff;font-size:0.75rem;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.25);}
    .conso-stepper-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color);}
    .conso-row--no-bottom{border-bottom:none;}
    .conso-row__label{font-size:0.875rem;color:var(--text-primary);}
    .conso-row__control{display:flex;align-items:center;gap:8px;flex-shrink:0;}
    .stepper--sm{height:34px;}
    .stepper--sm .stepper__btn{width:34px;height:34px;font-size:1.0625rem;}
    .stepper--sm .stepper__value{height:34px;width:30px;padding:0;font-size:0.875rem;}
    .conso-separator{height:1px;background:var(--border-color);margin:4px 0 8px;}
    .conso-check-group{display:flex;flex-direction:column;gap:8px;}
    .linge-checklist{display:grid;grid-template-columns:1fr 1fr;}
    .linge-check-row{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border-color);cursor:pointer;transition:background var(--transition);-webkit-tap-highlight-color:transparent;user-select:none;}
    .linge-check-row:nth-child(odd){border-right:1px solid var(--border-color);}
    .linge-check-row:last-child,.linge-check-row:nth-last-child(2):nth-child(odd){border-bottom:none;}
    .linge-check-row.linge-check-row--full{grid-column:1 / -1;border-right:none;border-bottom:none;}
    .linge-check-row:active{background:var(--bg-primary);}
    .linge-check-input{position:absolute;opacity:0;width:0;height:0;}
    .linge-check-box{width:18px;min-width:18px;height:18px;border:2px solid var(--border-color);border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background var(--transition),border-color var(--transition);}
    .linge-check-box-mark{width:10px;height:8px;opacity:0;transform:scale(0.5);transition:opacity var(--transition-spring),transform var(--transition-spring);}
    .linge-check-row:has(.linge-check-input:checked) .linge-check-box{background:var(--accent);border-color:var(--accent);}
    .linge-check-row:has(.linge-check-input:checked) .linge-check-box-mark{opacity:1;transform:scale(1);}
    .linge-check-label{font-size:0.875rem;color:var(--text-primary);position:relative;}
    .linge-check-label::after{content:'';position:absolute;left:0;top:50%;width:100%;height:1.5px;background:var(--text-secondary);opacity:0.5;transform:translateY(-50%) scaleX(0);transform-origin:left;transition:transform 0.3s ease;}
    .linge-check-row:has(.linge-check-input:checked) .linge-check-label::after{transform:translateY(-50%) scaleX(1);}
    .linge-spacer{flex:1;}
    .linge-check-count{font-size:0.875rem;font-weight:600;color:var(--accent);flex-shrink:0;}
    .linge-manquant{display:flex;flex-direction:column;gap:10px;padding:12px 16px 16px;border-top:1px solid var(--border-color);}

    /* Catégories parentes (indicateur de validité dérivé, jamais cliquable) */
    .cloture-category{margin-bottom:16px;}
    .cloture-category__header{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 10px;}
    .cloture-category__title{font-size:0.8125rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;}
    .cloture-category__check{width:22px;height:22px;border-radius:5px;border:2px solid var(--border-color);background:var(--bg-surface);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background var(--transition),border-color var(--transition);}
    .cloture-category__check svg{width:14px;height:14px;color:#fff;opacity:0;transform:scale(0.5);transition:opacity var(--transition-spring),transform var(--transition-spring);}
    .cloture-category__check.is-checked{background:var(--success);border-color:var(--success);}
    .cloture-category__check.is-checked svg{opacity:1;transform:scale(1);}

    /* Slide-down générique (champs texte conditionnels) */
    .slide-down{display:grid;grid-template-rows:0fr;transition:grid-template-rows 0.3s ease;}
    .slide-down.is-open{grid-template-rows:1fr;}
    .slide-down__inner{overflow:hidden;min-height:0;}
    .slide-down.is-open .slide-down__inner{padding-top:8px;}

    /* Signalements : colonne checkbox + champ texte, et style RAS distinct */
    .signalement-col{display:flex;flex-direction:column;gap:4px;}
    .signalement-item{flex:1;}
    .signalement-item--ras{background:var(--bg-glass);}
    .signalement-item--ras:has(input:checked){background:var(--success-bg);border-color:var(--success);}
    .signalement-item--ras:has(input:checked) .signalement-check{background:var(--success);border-color:var(--success);}

    /* Linge manquant : thème orange*/
    #toggle-linge-manquant:checked{background:var(--warning);}
    .toggle-label:has(#toggle-linge-manquant:checked){background:var(--warning-bg);border-color:var(--warning);}

    /* Champ texte linge manquant : orange */
    #linge-manquant-slide.is-open .input{border-color:var(--warning);box-shadow:0 0 0 3px rgba(245,158,11,0.15);}

    /* Champs texte signalements détaillés : orange */
    [data-signalement-slide].is-open .input{border-color:var(--warning);box-shadow:0 0 0 3px rgba(245,158,11,0.15);}
  `;
  const s = document.createElement('style');
  s.id = 'cloture-style';
  s.textContent = css;
  document.head.appendChild(s);
}

// Compresse une image vers un data URL JPEG (1200px max, qualité 0.8)
function compresserImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildConsommablesHTML(config) {
  const steppers = config.filter(c => c.type === 'stepper');
  const checks   = config.filter(c => c.type === 'check');

  const stepperRows = steppers.map((c, i) => `
    <div class="conso-stepper-row${i === steppers.length - 1 ? ' conso-row--no-bottom' : ''}">
      <span class="conso-row__label">${c.label}</span>
      <div class="conso-row__control">
        <div class="stepper stepper--sm" role="group" aria-label="${c.label}">
          <button type="button" class="stepper__btn" data-conso-minus="${c.id}" aria-label="Diminuer" disabled>−</button>
          <div class="stepper__value" data-conso-value="${c.id}" aria-live="polite">0</div>
          <button type="button" class="stepper__btn" data-conso-plus="${c.id}" aria-label="Augmenter">+</button>
        </div>
      </div>
    </div>`).join('');

  const checkRows = checks.map(c => `
    <label class="toggle-label">
      <span>${c.label}</span>
      <input type="checkbox" class="toggle-input" data-conso-check="${c.id}">
    </label>`).join('');

  return `
    <div>${stepperRows}</div>
    ${checks.length ? `<div class="conso-separator"></div><div class="conso-check-group">${checkRows}</div>` : ''}
  `;
}

// Icône check (cercle) réutilisée par les indicateurs de catégorie
const ICONE_CHECK_CATEGORIE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

window.initAgentCloture = async function () {
  injectClotureStyles();

  const id = window._currentId;
  if (!id || id === 'cloture') { window.location.hash = '#/agent/dashboard'; return; }

  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.hash = '#/agent/intervention/' + id;
  });

  let item;
  try {
    const res = await getIntervention(id);
    item = res?.intervention;
    if (!item) throw new Error('Introuvable');
  } catch {
    document.getElementById('cloture-content').innerHTML =
      '<div class="error-state"><p>Intervention introuvable.</p></div>';
    return;
  }

  if (item.statut === 'terminee') {
    window.location.hash = '#/rapport/' + id;
    return;
  }
  if (item.statut === 'en_attente') {
    window.location.hash = '#/agent/intervention/' + id;
    return;
  }

  const nbVoyageurs = (item.nb_adultes || 0) + (item.nb_enfants || 0) + (item.nb_bebes || 0);
  setText('#header-title-sub', `${item.client_nom || '—'} · ${pluriel(nbVoyageurs, 'voyageur', 'voyageurs')} · ${formatDateShort(item.date_intervention)}`);

  // --- Brouillon de clôture (sessionStorage) : données textuelles uniquement, photos exclues ---
  const draftKey = 'cloture_draft_' + id;
  const draft    = session.get(draftKey);

  const lingeBlocHTML = buildLingeBlocHTML(item.linge, item.lit_bebe, draft);
  const config         = item.consommables_config || [];

  document.getElementById('cloture-content').innerHTML = `
    <div class="closure-block">
      <div class="closure-block__header">
        <span class="cloture-category__check" data-category-check="linge_conso">${ICONE_CHECK_CATEGORIE}</span>
        <span>Linge &amp; consommables</span>
      </div>
      <div class="closure-block__body">

        ${lingeBlocHTML ? `
        <div class="info-block">
          <div class="info-block__title">Linge à préparer</div>
          <div class="info-block__body" style="padding:0;">
            ${lingeBlocHTML}
          </div>
        </div>` : ''}

        <div class="info-block">
          <div class="info-block__title">Consommables</div>
            <div class="info-block__body" style="padding:0 16px 14px;">
            ${buildConsommablesHTML(config)}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="closure-block">
      <div class="closure-block__header">
        <span class="cloture-category__check" data-category-check="signalements_photos">${ICONE_CHECK_CATEGORIE}</span>
        <span>Signalements &amp; remarques</span>
      </div>
      <div class="closure-block__body">

        <div class="info-block">
          <div class="info-block__title">Signalements</div>
          <div class="info-block__body" style="padding:12px 16px 16px;">
            ${buildSignalementsHTML(draft)}
          </div>
        </div>

        <div class="info-block">
          <div class="info-block__title">Remarque</div>
          <div class="info-block__body" style="padding:12px 16px 16px;">
            <textarea class="input" id="cloture-remarque" rows="3" placeholder="Un message pour l'hôte ? (optionnel)">${draft?.remarque || ''}</textarea>
          </div>
        </div>

        <div class="info-block">
          <div class="info-block__title">Photos (<span id="photo-count">0</span>)</div>
          <div class="info-block__body" style="padding:12px 16px 16px; display:flex; flex-direction:column; gap:10px;">
            <div class="photo-drop-zone" id="photo-drop-zone">
              <input type="file" id="photo-input" accept="image/*" multiple>
              <svg class="photo-drop-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>
              <div class="photo-drop-zone__text">Ajouter des photos</div>
              <div class="photo-drop-zone__hint">Appuie pour choisir une ou plusieurs photos</div>
            </div>
            <div class="photo-preview-grid" id="photo-preview-grid"></div>
          </div>
        </div>

      </div>
    </div>
  `;

  // --- Indicateur de catégorie : coche avec animation spring, décoche sans animation ---
  function setCategoryCheck(name, valide) {
    const el = document.querySelector(`[data-category-check="${name}"]`);
    if (!el) return;
    const dejaCoche = el.classList.contains('is-checked');
    if (valide && !dejaCoche) {
      el.classList.add('is-checked');
    } else if (!valide && dejaCoche) {
      el.style.transition = 'none';
      el.classList.remove('is-checked');
      requestAnimationFrame(() => { el.style.transition = ''; });
    }
  }

  // --- Slide-down générique (champs texte conditionnels) ---
  function setSlideOpen(el, ouvert) {
    el?.classList.toggle('is-open', ouvert);
  }

  // --- Photos ---
  const photosBase64 = [];

  function renderPhotos() {
    const grid = document.getElementById('photo-preview-grid');
    if (!grid) return;
    grid.innerHTML = photosBase64.map((b64, i) => `
      <div class="photo-preview-item">
        <img class="photo-thumb" src="${b64}" alt="Photo ${i + 1}">
        <button type="button" class="photo-preview-remove" data-remove="${i}" aria-label="Supprimer la photo">×</button>
      </div>`).join('');
    setText('#photo-count', String(photosBase64.length));
    grid.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        photosBase64.splice(parseInt(btn.dataset.remove, 10), 1);
        renderPhotos();
        recalcValidite();
      });
    });
  }

  document.getElementById('photo-input')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    try {
      const compressees = await Promise.all(files.map(compresserImage));
      photosBase64.push(...compressees);
      renderPhotos();
      recalcValidite();
    } catch {
      toast('Erreur lors du traitement des photos.', 'error');
    }
  });

  renderPhotos();

  // --- Consommables ---
  const stepperValues = {};
  const checkValues   = {};

  // Lit l'état courant des signalements depuis le DOM (RAS + 7 options standards)
  function lireEtatSignalements() {
    const ras   = !!document.getElementById('signalement-ras')?.checked;
    const items = SIGNALEMENTS_OPTIONS.map(opt => ({
      ...opt,
      checked: document.querySelector(`[data-signalement="${opt.type}"]`)?.checked || false,
      texte:   document.querySelector(`[data-signalement-texte="${opt.type}"]`)?.value.trim() || '',
    }));
    return { ras, items };
  }

  function signalementsValides({ ras, items }) {
    if (ras) return true;
    const coches = items.filter(i => i.checked);
    if (!coches.length) return false;
    return coches.every(i => !i.texteRequis || i.texte.length > 0);
  }

  // Construit le tableau mixte (chaînes + objets {type, detail}) attendu par le GAS
  function construireSignalementsPayload({ ras, items }) {
    if (ras) return ['RAS'];
    return items.filter(i => i.checked).map(i => i.texteRequis ? { type: i.type, detail: i.texte } : i.type);
  }

  // Sauvegarde immédiate du brouillon (hors photos) à chaque modification
  function saveDraft() {
    const remarque = document.getElementById('cloture-remarque')?.value || '';

    const lingeCoches = Array.from(document.querySelectorAll('[data-linge-check]:checked')).map(cb => cb.dataset.lingeCheck);
    const lingeManquantActif  = !!document.getElementById('toggle-linge-manquant')?.checked;
    const lingeManquantTexte  = document.getElementById('linge-manquant-texte')?.value || '';

    const { ras, items } = lireEtatSignalements();
    const signalements = {};
    items.forEach(i => { signalements[i.type] = { checked: i.checked, texte: i.texte }; });

    session.set(draftKey, {
      stepperValues, checkValues,
      lingeCoches, lingeManquantActif, lingeManquantTexte,
      signalements, signalementRAS: ras,
      remarque,
    });
  }

  // --- Recalcul unique de validité : met à jour les catégories + le bouton Clôturer ---
  function recalcValidite() {
    const lingeRows          = Array.from(document.querySelectorAll('[data-linge-check]'));
    const lingeManquantInput = document.getElementById('toggle-linge-manquant');
    const lingeManquantTexte = document.getElementById('linge-manquant-texte')?.value.trim() || '';
    const lingeManquantActif = !!lingeManquantInput?.checked;
    const lingeManquantOk    = !lingeManquantActif || lingeManquantTexte.length > 0;
    const litBebeRow      = document.querySelector('[data-linge-check="lit_bebe"]');
    const litBebeOk       = !litBebeRow || litBebeRow.checked;
    const lingeStandardOk = lingeRows.filter(cb => cb.dataset.lingeCheck !== 'lit_bebe').every(cb => cb.checked);
    // Cas 1 : tout coché. Cas 2 : anomalie signalée. Lit bébé toujours requis indépendamment.
    const lingeValide     = (lingeStandardOk && litBebeOk) || (lingeManquantActif && lingeManquantOk && litBebeOk);

    const etatSignalements  = lireEtatSignalements();
    const signalementsValide = signalementsValides(etatSignalements);

    const photosValide = photosBase64.length > 0;

    setCategoryCheck('linge_conso', lingeValide);
    setCategoryCheck('signalements_photos', signalementsValide && photosValide);

    const btn = document.getElementById('btn-cloture');
    if (btn) btn.disabled = !(lingeValide && signalementsValide && photosValide);
  }

  document.querySelectorAll('[data-linge-check]').forEach(cb => {
    cb.addEventListener('change', () => { saveDraft(); recalcValidite(); });
  });

  const toggleLingeManquant = document.getElementById('toggle-linge-manquant');
  toggleLingeManquant?.addEventListener('change', () => {
    setSlideOpen(document.getElementById('linge-manquant-slide'), toggleLingeManquant.checked);
    saveDraft();
    recalcValidite();
  });
  document.getElementById('linge-manquant-texte')?.addEventListener('input', () => { saveDraft(); recalcValidite(); });

  config.filter(c => c.type === 'stepper').forEach(c => {
    stepperValues[c.id] = draft?.stepperValues?.[c.id] ?? 0;
    const minus = document.querySelector(`[data-conso-minus="${c.id}"]`);
    const plus  = document.querySelector(`[data-conso-plus="${c.id}"]`);
    const val   = document.querySelector(`[data-conso-value="${c.id}"]`);
    val.textContent = stepperValues[c.id];
    minus.disabled  = stepperValues[c.id] <= 0;
    minus.addEventListener('click', () => {
      if (stepperValues[c.id] > 0) {
        stepperValues[c.id]--;
        val.textContent = stepperValues[c.id];
        minus.disabled = stepperValues[c.id] <= 0;
        saveDraft();
        recalcValidite();
      }
    });
    plus.addEventListener('click', () => {
      stepperValues[c.id]++;
      val.textContent = stepperValues[c.id];
      minus.disabled = false;
      saveDraft();
      recalcValidite();
    });
  });

  config.filter(c => c.type === 'check').forEach(c => {
    checkValues[c.id] = draft?.checkValues?.[c.id] ?? false;
    const input = document.querySelector(`[data-conso-check="${c.id}"]`);
    input.checked = checkValues[c.id];
    input.addEventListener('change', () => {
      checkValues[c.id] = input.checked;
      saveDraft();
      recalcValidite();
    });
  });

  document.getElementById('cloture-remarque')?.addEventListener('input', () => { saveDraft(); recalcValidite(); });

  // Signalements standards (4 sans texte + 3 avec texte) : exclusivité avec RAS, slide-down du champ texte
  SIGNALEMENTS_OPTIONS.forEach(opt => {
    const cb = document.querySelector(`[data-signalement="${opt.type}"]`);
    cb?.addEventListener('change', () => {
      if (opt.texteRequis) {
        const slide = document.querySelector(`[data-signalement-slide="${opt.type}"]`);
        setSlideOpen(slide, cb.checked);
        if (!cb.checked) {
          const ta = document.querySelector(`[data-signalement-texte="${opt.type}"]`);
          if (ta) ta.value = '';
        }
      }
      if (cb.checked) {
        const ras = document.getElementById('signalement-ras');
        if (ras) ras.checked = false;
      }
      saveDraft();
      recalcValidite();
    });
    if (opt.texteRequis) {
      document.querySelector(`[data-signalement-texte="${opt.type}"]`)?.addEventListener('input', () => { saveDraft(); recalcValidite(); });
    }
  });

  // RAS : exclusivité bidirectionnelle — cocher RAS décoche et efface tous les autres signalements
  document.getElementById('signalement-ras')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      SIGNALEMENTS_OPTIONS.forEach(opt => {
        const cb = document.querySelector(`[data-signalement="${opt.type}"]`);
        if (cb) cb.checked = false;
        if (opt.texteRequis) {
          const ta = document.querySelector(`[data-signalement-texte="${opt.type}"]`);
          if (ta) ta.value = '';
          setSlideOpen(document.querySelector(`[data-signalement-slide="${opt.type}"]`), false);
        }
      });
    }
    saveDraft();
    recalcValidite();
  });

  recalcValidite();

  // --- Écran de résultat plein page (succès / erreur) ---
  function afficherEcranResultatCloture({ succes, titre, sousTitre }) {
    const actionBar = document.getElementById('cloture-action-bar');
    if (actionBar) actionBar.style.display = 'none';

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

    document.getElementById('cloture-content').innerHTML = `
      <div class="result-screen result-screen--${succes ? 'success' : 'error'}">
        <div class="result-screen__icon">${icone}</div>
        <h2 class="result-screen__title">${titre}</h2>
        <p class="result-screen__subtitle">${sousTitre}</p>
        ${succes ? `
          <button class="btn btn--primary btn--full" id="btn-result-rapport">Voir mon rapport</button>
          <button class="btn btn--secondary btn--full" id="btn-result-dashboard">Retour au tableau de bord</button>
        ` : `
          <button class="btn btn--primary btn--full" id="btn-result-retry">Réessayer</button>
        `}
      </div>`;

    document.getElementById('btn-result-rapport')?.addEventListener('click', () => {
      window.location.hash = '#/rapport/' + id;
    });
    document.getElementById('btn-result-dashboard')?.addEventListener('click', () => {
      window.location.hash = '#/agent/dashboard';
    });
    document.getElementById('btn-result-retry')?.addEventListener('click', () => {
      // Le hash ne change pas (on y est déjà) : un Router.navigate explicite force la réinitialisation
      // de la page, qui restaurera automatiquement le brouillon depuis sessionStorage.
      Router.navigate('#/agent/cloture/' + id);
    });
  }

  // --- Soumission ---
  document.getElementById('btn-cloture')?.addEventListener('click', async () => {
    const ok = await confirmerAction({
      titre: 'Clôturer l\'intervention ?',
      message: 'Ton rapport sera envoyé à l\'hôte. Cette action est définitive.',
      labelOui: 'Oui, clôturer',
      labelNon: 'Annuler',
      danger: false,
      icone: `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.8"/>
        </svg>`,
    });
    if (!ok) return;

    const btn = document.getElementById('btn-cloture');
    btn.disabled    = true;
    btn.textContent = 'Clôture en cours…';

    const remarque  = document.getElementById('cloture-remarque')?.value.trim() || '';
    const etatSignalements = lireEtatSignalements();
    const signalements      = construireSignalementsPayload(etatSignalements);
    const lingeManquantActif = !!document.getElementById('toggle-linge-manquant')?.checked;
    const lingeManquantTexte = document.getElementById('linge-manquant-texte')?.value.trim() || '';
    const consommables = { ...stepperValues, ...checkValues };
    const linge_coches = Array.from(document.querySelectorAll('[data-linge-check]:checked'))
      .map(cb => cb.dataset.lingeCheck)
      .filter(k => k !== 'lit_bebe');

    try {
      const res = await cloturerIntervention(id, {
        remarque,
        signalements,
        linge_manquant:        lingeManquantActif,
        linge_manquant_detail: lingeManquantActif ? lingeManquantTexte : '',
        consommables,
        photos: photosBase64,
        linge_coches,
      });
      if (res?.success) {
        session.remove(draftKey);
        afficherEcranResultatCloture({
          succes: true,
          titre: 'Intervention clôturée',
          sousTitre: 'Ton rapport a été envoyé à l\'hôte.',
        });
      } else {
        afficherEcranResultatCloture({
          succes: false,
          titre: 'Une erreur est survenue',
          sousTitre: res?.error || 'Erreur lors de la clôture.',
        });
      }
    } catch {
      afficherEcranResultatCloture({
        succes: false,
        titre: 'Une erreur est survenue',
        sousTitre: 'Erreur réseau. Réessayez.',
      });
    }
  });
};

/* ---------------------------------------------------------- */
/*  Rapport de clôture (hôte + agent)                         */
/* ---------------------------------------------------------- */
// Pluralise une unité de consommable (gère les cas irréguliers)
function pluraliserUnite(unite, valeur) {
  if (valeur <= 1) return unite;
  const irregulieres = { rouleau: 'rouleaux', sachet: 'sachets', paire: 'paires', unité: 'unités' };
  return irregulieres[unite] || unite + 's';
}

// Overlay plein écran pour parcourir les photos d'un rapport de clôture
function ouvrirLightbox(photosBase64, startIndex) {
  let index = startIndex;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(0.96);transition:opacity 0.2s ease,transform 0.2s ease;';
  overlay.innerHTML = `
    <a id="lightbox-download" href="data:image/jpeg;base64,${photosBase64[index]}" download="photo_${index + 1}.jpg" aria-label="Télécharger" style="position:absolute;top:16px;left:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;justify-content:center;z-index:1;text-decoration:none;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </a>
    <button type="button" id="lightbox-close" aria-label="Fermer" style="position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;font-size:1.25rem;line-height:1;display:flex;align-items:center;justify-content:center;z-index:1;">×</button>
    <img id="lightbox-img" src="data:image/jpeg;base64,${photosBase64[index]}" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:12px;">
    <div id="lightbox-indicator" style="position:absolute;bottom:20px;left:0;right:0;text-align:center;color:#fff;font-size:0.875rem;"></div>
  `;
  document.body.appendChild(overlay);

  const img       = overlay.querySelector('#lightbox-img');
  const indicator = overlay.querySelector('#lightbox-indicator');

  function majIndicateur() {
    indicator.textContent = `${index + 1} / ${photosBase64.length}`;
  }
  majIndicateur();

  requestAnimationFrame(() => {
    overlay.style.opacity   = '1';
    overlay.style.transform = 'scale(1)';
  });

  function fermer() {
    overlay.style.opacity   = '0';
    overlay.style.transform = 'scale(0.96)';
    setTimeout(() => overlay.remove(), 200);
  }

  function afficher(nouvelIndex, direction) {
    index = nouvelIndex;
    img.style.transition = 'none';
    img.style.transform   = `translateX(${direction === 'next' ? '40px' : '-40px'})`;
    img.style.opacity     = '0';
    requestAnimationFrame(() => {
      img.src = `data:image/jpeg;base64,${photosBase64[index]}`;
      requestAnimationFrame(() => {
        img.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        img.style.transform   = 'translateX(0)';
        img.style.opacity     = '1';
      });
    });
    majIndicateur();
    const dl = overlay.querySelector('#lightbox-download');
    if (dl) {
      dl.href     = `data:image/jpeg;base64,${photosBase64[index]}`;
      dl.download = `photo_${index + 1}.jpg`;
    }
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) fermer(); });
  overlay.querySelector('#lightbox-close').addEventListener('click', fermer);

  let touchStartX = 0;
  overlay.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; });
  overlay.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) <= 50) return;
    if (delta < 0 && index < photosBase64.length - 1) afficher(index + 1, 'next');
    else if (delta > 0 && index > 0) afficher(index - 1, 'prev');
  });
}

window.initRapport = async function () {
  const id = window._currentId;
  if (!id || id === 'rapport') {
    window.location.hash = session.get('role') === 'host' ? '#/host/dashboard' : '#/agent/dashboard';
    return;
  }

  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.hash = session.get('role') === 'host' ? '#/host/dashboard' : '#/agent/dashboard';
  });

  let item, cloture = null;
  try {
    const [resInt, resClo] = await Promise.all([getIntervention(id), getCloture(id)]);
    item = resInt?.intervention;
    if (!item) throw new Error('Introuvable');
    if (resClo?.success) cloture = resClo.cloture;
  } catch {
    document.getElementById('rapport-content').innerHTML =
      '<div class="error-state"><p>Intervention introuvable.</p></div>';
    return;
  }

  setText('#header-title-main', 'Rapport');
  setText('#header-title-sub', item.client_nom || '');

  if (!cloture) {
    document.getElementById('rapport-content').innerHTML = `
      ${buildDetailHero(item)}
      <div class="empty-state"><p>Rapport non disponible — intervention non encore clôturée.</p></div>
    `;
    return;
  }

  const config        = item.consommables_config || [];
  const consoUtilises = config.filter(c => {
    const v = cloture.consommables?.[c.id];
    return c.type === 'stepper' ? v > 0 : !!v;
  });

  const lingeHTML = cloture.linge_coches !== null
    ? buildLingeHTML(item.linge, cloture.linge_coches)
    : buildLingeHTML(item.linge);

  const photosBase64Arr = (cloture.photos || []).filter(p => p.base64).map(p => p.base64);
  const photosHTML = photosBase64Arr
    .map((b64, i) => `<img class="compte-rendu-photo" data-photo-index="${i}" src="data:image/jpeg;base64,${b64}" alt="Photo de clôture" style="cursor:pointer;">`)
    .join('');

  const consoHTML = consoUtilises.map((c, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;${i < consoUtilises.length - 1 ? 'border-bottom:1px solid var(--border-color);' : ''}">
      <span style="font-size:0.875rem;color:var(--text-primary);">${c.label}</span>
      <span class="detail-value--accent">${c.type === 'stepper' ? cloture.consommables[c.id] : 'Oui'}</span>
    </div>`).join('');

  // Tableau mixte (chaînes + objets {type, detail}) : « Linge manquant » est extrait, c'est une info
  // de Catégorie 1 stockée dans signalements pour des raisons de format, pas un vrai signalement.
  const signalementsBrut  = cloture.signalements || [];
  const lingeManquantInfo = signalementsBrut.find(s => typeof s === 'object' && s?.type === 'Linge manquant');
  const signalementsAffiches = signalementsBrut.filter(s => !(typeof s === 'object' && s?.type === 'Linge manquant'));

  const libelleSignalement = (s) => {
    if (typeof s === 'string') return s === 'RAS' ? 'Rien à signaler' : s;
    return `${s.type} → ${s.detail}`;
  };

  const signalementsHTML = signalementsAffiches.length > 0 ? `
    <div style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:10px 0;">
      ${signalementsAffiches.map(s => `
        <div style="display:inline-flex;align-items:center;gap:8px;padding:10px 12px;background:var(--warning-bg);border:1.5px solid var(--warning);border-radius:var(--radius-sm);box-shadow:0 0 0 3px rgba(245,158,11,0.12);">
          <svg style="flex-shrink:0;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
          <span style="font-size:0.875rem;color:var(--text-primary);">${libelleSignalement(s)}</span>
        </div>`).join('')}
    </div>` : '';

  const dCloture = new Date(cloture.created_at);
  const horodatageStr = isNaN(dCloture) ? '' :
    `Clôturé par <span style="color:var(--accent);">${item.agentName || '—'}</span> le ${dCloture.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} à ${String(dCloture.getHours()).padStart(2, '0')}:${String(dCloture.getMinutes()).padStart(2, '0')}`;

  if (horodatageStr) document.getElementById('rapport-content').style.paddingBottom = '56px';

  document.getElementById('rapport-content').innerHTML = `
    ${buildDetailHero(item)}

    ${(lingeHTML || lingeManquantInfo) ? `
    <div class="info-block">
      <div class="info-block__title">Linge préparé</div>
      <div class="info-block__body">
        ${lingeHTML ? `<div class="linge-grid">${lingeHTML}</div>` : ''}
        ${lingeManquantInfo ? `
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin:0 -16px;padding:20px 16px 10px;border-bottom:1px solid var(--border-color);${lingeHTML ? 'border-top:1px solid var(--border-color);' : ''}">Linge manquant</div>
        <div style="margin-top:${lingeHTML ? '10px' : '0'};margin-bottom:10px;padding:11px 14px;background:var(--warning-bg);border:1.5px solid var(--warning);border-radius:var(--radius-sm);box-shadow:0 0 0 3px rgba(245,158,11,0.12);display:inline-flex;align-items:flex-start;gap:10px;">
          <svg style="flex-shrink:0;margin-top:1px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
          <p style="margin:0;font-size:0.875rem;color:var(--text-primary);white-space:pre-line;line-height:1.5;">${lingeManquantInfo.detail}</p>
        </div>` : ''}
      </div>
    </div>` : ''}

    ${photosHTML ? `
    <div class="info-block">
      <div class="info-block__title">Photos</div>
      <div class="info-block__body" style="padding:16px;">
        <div class="compte-rendu-photos" id="rapport-photos">${photosHTML}</div>
      </div>
    </div>` : ''}

    ${consoHTML ? `
    <div class="info-block">
      <div class="info-block__title">Consommables utilisés</div>
      <div class="info-block__body">${consoHTML}</div>
    </div>` : ''}

    ${signalementsHTML ? `
    <div class="info-block">
      <div class="info-block__title">Signalements</div>
      <div class="info-block__body">${signalementsHTML}</div>
    </div>` : ''}

    ${cloture.remarque ? `
    <div class="info-block">
      <div class="info-block__title">Remarque</div>
      <div class="info-block__body">
        <p style="padding:14px 0;color:var(--text-primary);font-size:0.9375rem;line-height:1.6;white-space:pre-line;">${cloture.remarque}</p>
      </div>
    </div>` : ''}

    ${horodatageStr ? `<div style="position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:0.75rem;color:var(--text-secondary);padding:14px 16px;border-top:1px solid var(--border-color);background:var(--bg-card);z-index:10;">${horodatageStr}</div>` : ''}
  `;

  document.querySelectorAll('#rapport-photos img').forEach(img => {
    img.addEventListener('click', () => ouvrirLightbox(photosBase64Arr, parseInt(img.dataset.photoIndex, 10)));
  });
};
