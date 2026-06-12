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
        if (list) list.innerHTML = '<div class="empty-state"><p>Impossible de charger les interventions.</p></div>';
        toast('Erreur de chargement', 'error');
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
      const emptyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" opacity="0.35" viewBox="0 0 256 256"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z"/></svg>`;
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
                <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.8rem;color:var(--text-secondary);margin-top:1px;">${formatDateShort(item.date_arrivee)} → ${formatDateShort(item.date_depart)} · ${item.nb_voyageurs || 1} voyageur${(item.nb_voyageurs || 1) > 1 ? 's' : ''}</div>
              </div>
              ` : `
              ${today ? '<div class="today-label">Aujourd\'hui</div>' : ''}
              <div class="intervention-card__logement">${item.client_nom || '—'}</div>
              <div class="intervention-card__meta">
                ${item.heure_debut ? `<span>${hDebut}–${hFin}</span>` : ''}
                ${item.date_depart ? `<span>·</span><span>séjour jusqu'au ${formatDateShort(item.date_depart)}</span>` : ''}
              </div>
              `}
            </div>
            <div class="date-badge">
              <span class="date-badge__day">${day}</span>
              <span>${month}</span>
            </div>
          </div>
          <div class="intervention-card__bottom" style="flex-direction:column;align-items:flex-start;gap:6px;">
            ${role === 'host'
              ? `<div style="width:100%;display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;">
                  <div style="display:inline-flex;align-items:center;gap:4px;font-size:0.8125rem;color:var(--accent);font-weight:500;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    ${item.agentName || 'Non assigné'}
                  </div>
                  ${statutBadge(item.statut)}
                </div>`
              : `<div class="intervention-card__agent">
                  ${hDepart !== '—' ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>Départ client : <strong>${hDepart}</strong></span>` : '<span style="opacity:0.4;">Heure de départ non renseignée</span>'}
                </div>
                ${statutBadge(item.statut)}`
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
    .custom-select__trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-radius:var(--radius-sm);background:var(--glass-bg);border:1px solid var(--glass-border);cursor:pointer;user-select:none;transition:border-color var(--transition);}
    .custom-select__trigger:hover,.custom-select[aria-expanded="true"] .custom-select__trigger{border-color:var(--accent);}
    .custom-select__label{font-size:0.9375rem;color:var(--text-primary);flex:1;}
    .custom-select__label.placeholder{color:var(--text-secondary);}
    .custom-select__dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:9999;border-radius:var(--radius-sm);overflow:hidden;box-shadow:var(--shadow-lg);}
    .custom-select__option{padding:12px 14px;font-size:0.9375rem;cursor:pointer;background:var(--glass-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--glass-border);transition:background var(--transition),color var(--transition);}
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
/*  Nouvelle réservation Hôte                                 */
/* ---------------------------------------------------------- */
window.initHostNewReservation = async function () {
  document.getElementById('btn-back')?.addEventListener('click', () => history.back());

  // --- Custom selects ---
  initCustomSelect('select-plateforme', (val) => {
    document.getElementById('plateforme-autre-group').style.display = val === 'Autre' ? '' : 'none';
    if (val !== 'Autre') document.getElementById('input-plateforme-autre').value = '';
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
  });

  initCustomSelect('select-agent');

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

  // --- Steppers adultes / enfants / bébés / animaux ---
  const steppers = [
    { id: 'adultes', min: 1, max: 20 },
    { id: 'enfants', min: 0, max: 20 },
    { id: 'bebes',   min: 0, max: 20 },
    { id: 'animaux', min: 1, max: 20 },
  ];
  const counts = { adultes: 1, enfants: 0, bebes: 0, animaux: 1 };

  function updateTotal() {
    const total = counts.adultes + counts.enfants + counts.bebes;
    document.getElementById('voyageurs-total').textContent =
      total + (total > 1 ? ' voyageurs' : ' voyageur');
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
  const dateNuits    = document.getElementById('date-nuits');

  function updateNuits() {
    const a = inputArrivee.value;
    const d = inputDepart.value;
    if (!a || !d || new Date(d) <= new Date(a)) { dateSummary.style.display = 'none'; return; }
    dateNuits.textContent = pluriel(calcNuits(a, d), 'nuit', 'nuits');
    dateSummary.style.display = 'flex';
  }

  inputArrivee.addEventListener('change', () => {
    if (inputDepart.value && inputDepart.value <= inputArrivee.value) inputDepart.value = '';
    updateNuits();
  });
  inputDepart.addEventListener('change', updateNuits);
  inputDepart.addEventListener('change', () => {
    const fpInst = document.getElementById('input-date-intervention')?._flatpickr;
    if (fpInst && inputDepart.value) fpInst.setDate(inputDepart.value);
  });

  // --- Flatpickr ---
  const fpOptions = { locale: 'fr', disableMobile: true };
  flatpickr('#input-arrivee',           { ...fpOptions, dateFormat: 'Y-m-d', minDate: 'today', onChange: ([d]) => { inputArrivee.value = d ? d.toISOString().split('T')[0] : ''; inputArrivee.dispatchEvent(new Event('change')); }});
  flatpickr('#input-depart',            { ...fpOptions, dateFormat: 'Y-m-d', minDate: 'today', onChange: ([d]) => { inputDepart.value  = d ? d.toISOString().split('T')[0] : ''; inputDepart.dispatchEvent(new Event('change')); }});
  flatpickr('#input-date-intervention', { ...fpOptions, dateFormat: 'Y-m-d', minDate: 'today' });
  flatpickr('#input-heure-arrivee',     { ...fpOptions, enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true });
  flatpickr('#input-heure-depart',      { ...fpOptions, enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true });
  flatpickr('#input-heure-debut',       { ...fpOptions, enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true });
  flatpickr('#input-heure-fin',         { ...fpOptions, enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true });

  // --- Soumission ---
  document.getElementById('reservation-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const logement_id   = getCustomSelectValue('select-logement');
    const plateforme_raw = getCustomSelectValue('select-plateforme');
    const plateforme_autre = document.getElementById('input-plateforme-autre').value.trim();
    const plateforme    = plateforme_raw === 'Autre' ? plateforme_autre : plateforme_raw;
    const ref_reservation = document.getElementById('input-ref').value.trim();
    const client_nom    = document.getElementById('input-client-nom').value.trim();
    const date_arrivee  = inputArrivee.value;
    const heure_arrivee = document.getElementById('input-heure-arrivee').value;
    const date_depart   = inputDepart.value;
    const heure_depart  = document.getElementById('input-heure-depart').value;
    const agent_id      = getCustomSelectValue('select-agent');
    const date_intervention = document.getElementById('input-date-intervention').value || date_depart;
    const heure_debut   = document.getElementById('input-heure-debut').value;
    const heure_fin     = document.getElementById('input-heure-fin').value;
    const remarques     = document.getElementById('input-remarques').value.trim();
    const lit_bebe      = document.getElementById('toggle-lit-bebe').checked;
    const animauxChecked = document.getElementById('toggle-animaux').checked;
    const nb_animaux    = animauxChecked ? counts.animaux : 0;
    const nb_adultes    = counts.adultes;
    const nb_enfants    = counts.enfants;
    const nb_bebes      = counts.bebes;

    if (!logement_id) { toast('Veuillez sélectionner un logement.', 'error'); return; }
    if (!plateforme_raw) { toast('Veuillez sélectionner une plateforme.', 'error'); return; }
    if (plateforme_raw === 'Autre' && !plateforme_autre) { toast('Veuillez préciser la plateforme.', 'error'); return; }
    if (!client_nom) { toast('Veuillez saisir le nom du voyageur.', 'error'); return; }
    if (!date_arrivee || !date_depart) { toast('Veuillez renseigner les dates de séjour.', 'error'); return; }
    if (new Date(date_depart) <= new Date(date_arrivee)) { toast('La date de départ doit être après l\'arrivée.', 'error'); return; }
    if (!agent_id) { toast('Veuillez sélectionner un agent.', 'error'); return; }
    if (animauxChecked && nb_animaux < 1) { toast('Veuillez indiquer le nombre d\'animaux.', 'error'); return; }

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

    const btn = document.getElementById('btn-submit');
    btn.disabled    = true;
    btn.textContent = 'Création en cours…';

    try {
      const res = await creerReservation({
        logement_id, plateforme, ref_reservation,
        client_nom, nb_adultes, nb_enfants, nb_bebes, nb_animaux, lit_bebe,
        date_arrivee, heure_arrivee, date_depart, heure_depart,
        agent_id, date_intervention, heure_debut, heure_fin,
        linge, consommables, remarques,
      });
      if (res?.success) {
        toast('Réservation créée avec succès !', 'success');
        setTimeout(() => { window.location.hash = '#/host/dashboard'; }, 800);
      } else {
        toast(res?.error || 'Erreur lors de la création.', 'error');
        btn.disabled = false; btn.textContent = 'Créer la réservation';
      }
    } catch {
      toast('Erreur réseau. Réessayez.', 'error');
      btn.disabled = false; btn.textContent = 'Créer la réservation';
    }
  });
};

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
    const animauxStr   = nb_animaux > 0 ? ` · ${pluriel(nb_animaux, 'animal', 'animaux')}` : '';
    const litBebeStr   = item.lit_bebe ? ' · Lit bébé' : '';

    const consoLabels = {
      gel_douche:        'Gel douche',
      shampoing:         'Shampoing',
      apres_shampoing:   'Après-shampoing',
      savon:             'Savon',
      kit_hygiene:       "Kit d'hygiène",
      brosse_dents:      'Brosse à dents jetable',
      boules_quies:      'Boules quies',
      cafe:              'Café',
      the:               'Thé',
      sucre:             'Sucre',
      sel_poivre:        'Sel & poivre',
      huile_olive:       "Huile d'olive",
      liquide_vaisselle: 'Liquide vaisselle',
      eponge:            'Éponge',
      sacs_poubelle:     'Sacs poubelle',
      essuie_tout:       'Papier essuie-tout',
      eau:               "Bouteille d'eau",
    };
    const consoItems = Object.entries(consoLabels)
      .filter(([k]) => (item.consommables?.[k] || 0) > 0)
      .map(([k, label]) => `${label} : ${item.consommables[k]}`);
    if (item.consommables?.autre) consoItems.push(`Autre : ${item.consommables.autre}`);
    const consoDisplay = consoItems.length ? consoItems.join(' · ') : null;

    document.getElementById('detail-content').innerHTML = `
      <div class="info-block" style="margin-bottom:16px;">
        <div class="info-block__title">Réservation</div>
        <div class="info-block__body">
          <div class="detail-row"><span class="detail-label">Voyageur</span><span class="detail-value">${item.client_nom || '—'}</span></div>
          ${item.plateforme ? `<div class="detail-row"><span class="detail-label">Plateforme</span><span class="detail-value">${item.plateforme}${item.ref_reservation ? ' · ' + item.ref_reservation : ''}</span></div>` : ''}
          <div class="detail-row"><span class="detail-label">Arrivée</span><span class="detail-value">${formatDate(item.date_arrivee)} à ${formatHeure(item.heure_arrivee)}</span></div>
          <div class="detail-row"><span class="detail-label">Départ</span><span class="detail-value">${formatDate(item.date_depart)} à ${formatHeure(item.heure_depart)}</span></div>
          <div class="detail-row"><span class="detail-label">Durée</span><span class="detail-value">${pluriel(nuits, 'nuit', 'nuits')}</span></div>
          <div class="detail-row"><span class="detail-label">Voyageurs</span><span class="detail-value">${voyageursStr}${animauxStr}${litBebeStr}</span></div>
        </div>
      </div>

      <div class="info-block" style="margin-bottom:16px;">
        <div class="info-block__title">Intervention</div>
        <div class="info-block__body">
          <div class="detail-row"><span class="detail-label">Agent</span><span class="detail-value">${item.agentName || 'Non assigné'}</span></div>
          <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formatDate(item.date_intervention)}</span></div>
          <div class="detail-row"><span class="detail-label">Horaires</span><span class="detail-value">${formatHeure(item.heure_debut)} – ${formatHeure(item.heure_fin)}</span></div>
          ${item.remarques ? `<div class="detail-row"><span class="detail-label">Remarques</span><span class="detail-value" style="white-space:pre-line;">${item.remarques}</span></div>` : ''}
        </div>
      </div>

      ${consoDisplay ? `
      <div class="info-block" style="margin-bottom:16px;">
        <div class="info-block__title">Consommables</div>
        <div class="info-block__body">
          <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.6;">${consoDisplay}</p>
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
      <button class="btn btn--danger btn--full" id="btn-cancel" style="margin-top:8px;">
        Annuler la réservation
      </button>` : ''}
    `;

    document.getElementById('btn-cancel')?.addEventListener('click', async () => {
      if (!confirm('Annuler cette réservation ?')) return;
      try {
        const r = await cancelReservation(id);
        if (r?.success) {
          toast('Réservation annulée.', 'info');
          setTimeout(() => { window.location.hash = '#/host/dashboard'; }, 800);
        } else {
          toast(r?.error || 'Impossible d\'annuler.', 'error');
        }
      } catch {
        toast('Erreur réseau.', 'error');
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

  let photosBase64 = [];

  try {
    const res  = await getIntervention(id);
    const item = res?.intervention;
    if (!item) throw new Error('Introuvable');

    setHTML('#header-badge', statutBadge(item.statut));

    const nuits    = calcNuits(item.date_arrivee, item.date_depart);
    const estClose = item.statut === 'terminee' || item.statut === 'annulee';
    const typeLabel = { standard: 'Standard', grand_menage: 'Grand ménage', controle: 'Contrôle' }[item.type] || item.type;

    const lingeItems = [];
    const lingeLabels = { draps: 'Draps', housses: 'Housses', taies: 'Taies', serv_bain: 'Serv. bain', serv_mains: 'Serv. mains', tapis: 'Tapis', torchons: 'Torchons' };
    Object.entries(lingeLabels).forEach(([k, label]) => {
      if (item.linge?.[k] > 0) lingeItems.push(`${label} : ${item.linge[k]}`);
    });
    if (item.linge?.autres) lingeItems.push(item.linge.autres);
    const lingeDisplay = lingeItems.length ? lingeItems.join(' · ') : 'Aucun linge spécifié';

    document.getElementById('detail-content').innerHTML = `
      <div class="intervention-hero">
        <div class="intervention-hero__logement">${item.client_nom || '—'}</div>
        <div class="intervention-hero__meta">
          <span>${formatDate(item.date_arrivee)}</span>
          <span>→</span>
          <span>${formatDate(item.date_depart)}</span>
        </div>
        <div class="intervention-hero__meta" style="margin-top:4px;">
          ${pluriel(nuits, 'nuit', 'nuits')} · ${pluriel(item.nb_voyageurs || 1, 'voyageur', 'voyageurs')}
          ${item.animaux ? ' · 🐾 Animaux' : ''}${item.lit_bebe ? ' · 🍼 Lit bébé' : ''}
        </div>
        <span class="intervention-hero__badge">${statutLabel(item.statut)}</span>
      </div>

      <div class="info-block">
        <div class="info-block__title">Intervention du ${formatDate(item.date_intervention)}</div>
        <div class="info-block__body">
          <div class="detail-row"><span class="detail-label">Horaires</span><span class="detail-value" style="font-weight:600;color:var(--accent);">${formatHeure(item.heure_debut)} – ${formatHeure(item.heure_fin)}</span></div>
          <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${typeLabel}</span></div>
          <div class="detail-row"><span class="detail-label">Départ client</span><span class="detail-value" style="font-weight:600;">${formatHeure(item.heure_depart)}</span></div>
          ${item.remarques ? `<div class="detail-row"><span class="detail-label">Instructions</span><span class="detail-value" style="white-space:pre-line;">${item.remarques}</span></div>` : ''}
        </div>
      </div>

      ${lingeItems.length ? `
      <div class="info-block" style="margin-top:12px;">
        <div class="info-block__title">Linge à préparer</div>
        <div class="info-block__body">
          <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.6;">${lingeDisplay}</p>
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
      <div class="closure-block" id="closure-block">
        <div class="closure-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
          Clôturer l'intervention
        </div>
        <div class="closure-block__body">
          <div class="photo-upload-area">
            <span class="photo-upload-label">Photos (optionnel)</span>
            <div class="photo-drop-zone" id="drop-zone">
              <div class="photo-drop-zone__icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z"/></svg></div>
              <div class="photo-drop-zone__text">Ajouter des photos</div>
              <div class="photo-drop-zone__hint">JPG, PNG · max 5 photos</div>
              <input type="file" id="photo-input" accept="image/*" multiple>
            </div>
            <div class="photo-preview-grid" id="photo-preview" style="display:none;"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="input-remarque">Remarque</label>
            <textarea class="textarea" id="input-remarque" placeholder="État général du logement, observations…" rows="3"></textarea>
          </div>
          <div class="form-group">
            <span class="form-label">Signalements</span>
            <div class="signalement-grid">
              ${['Dommage matériel','Linge manquant','Produits vides','Problème électroménager','Serrure / accès','Nuisibles','Odeurs','Autre']
                .map(s => `<label class="signalement-item"><input type="checkbox" name="signalement" value="${s}"><span class="signalement-check"></span>${s}</label>`)
                .join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="action-bar">
        <button class="btn btn--primary btn--full btn--lg" id="btn-close">Confirmer la clôture</button>
      </div>` : ''}
    `;

    document.getElementById('photo-input')?.addEventListener('change', async () => {
      const photoInput   = document.getElementById('photo-input');
      const photoPreview = document.getElementById('photo-preview');
      const files        = [...photoInput.files].slice(0, 5);
      photosBase64       = [];
      photoPreview.innerHTML = '';
      photoPreview.style.display = files.length ? 'grid' : 'none';
      for (const file of files) {
        const b64 = await toBase64(file);
        photosBase64.push(b64);
        const img = document.createElement('img');
        img.src = b64; img.className = 'photo-thumb'; img.alt = '';
        photoPreview.appendChild(img);
      }
    });

    document.getElementById('btn-close')?.addEventListener('click', async () => {
      const remarque     = document.getElementById('input-remarque')?.value.trim() || '';
      const signalements = [...document.querySelectorAll('input[name="signalement"]:checked')].map(c => c.value);
      const btn          = document.getElementById('btn-close');
      btn.disabled = true; btn.textContent = 'Envoi en cours…';
      try {
        const r = await cloturerIntervention(id, { remarque, signalements, photos: photosBase64 });
        if (r?.success) {
          toast('Intervention clôturée avec succès !', 'success');
          setTimeout(() => { window.location.hash = '#/agent/dashboard'; }, 900);
        } else {
          toast(r?.error || 'Erreur lors de la clôture.', 'error');
          btn.disabled = false; btn.textContent = 'Confirmer la clôture';
        }
      } catch {
        toast('Erreur réseau. Réessayez.', 'error');
        btn.disabled = false; btn.textContent = 'Confirmer la clôture';
      }
    });

  } catch {
    document.getElementById('detail-content').innerHTML =
      '<div class="error-state"><p>Intervention introuvable.</p></div>';
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
