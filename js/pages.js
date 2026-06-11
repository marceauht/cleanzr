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
  setText('#greeting-date', formatDay(new Date().toISOString()));

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
    document.getElementById('stats-section')?.removeAttribute('hidden');
    const btnNew = document.getElementById('btn-new');
    if (btnNew) {
      btnNew.removeAttribute('hidden');
      btnNew.addEventListener('click', () => { window.location.hash = '#/host/reservation/new'; });
    }
  }

  let allInterventions = [];
  let activeFilter = role === 'host' ? 'all' : 'avenir';

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
    if (role === 'host') updateStats(allInterventions);
    renderList(filterBy(allInterventions, activeFilter));
    requestNotificationPermission(session.get('userId')).catch(() => null);
  } catch {
    document.getElementById('interventions-list').innerHTML =
      '<div class="empty-state"><p>Impossible de charger les interventions.</p></div>';
    toast('Erreur de chargement', 'error');
  }

  function updateStats(list) {
    setText('#stat-total',     String(list.length));
    setText('#stat-avenir',    String(list.filter(i => ['en_attente','confirmee','en_cours'].includes(i.statut)).length));
    setText('#stat-terminees', String(list.filter(i => i.statut === 'terminee').length));
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
      const typeLabel = { standard: 'Standard', grand_menage: 'Grand ménage', controle: 'Contrôle' }[item.type] || item.type;
      return `
        <article class="glass-card intervention-card animate-fade-in-up stagger-${Math.min(i, 4) + 1}${today ? ' today-card' : ''}" data-id="${item.id}" role="listitem" tabindex="0">
          <div class="intervention-card__top">
            <div class="intervention-card__info">
              ${today ? '<div class="today-label">Aujourd\'hui</div>' : ''}
              <div class="intervention-card__logement">${item.client_nom || '—'}</div>
              <div class="intervention-card__meta">
                ${role === 'host' ? `<span>${typeLabel}</span>` : ''}
                ${item.heure_debut ? `<span>·</span><span>${item.heure_debut}–${item.heure_fin}</span>` : ''}
                ${role === 'agent' && item.date_depart ? `<span>·</span><span>séjour jusqu'au ${formatDateShort(item.date_depart)}</span>` : ''}
              </div>
            </div>
            <div class="date-badge">
              <span class="date-badge__day">${day}</span>
              <span>${month}</span>
            </div>
          </div>
          <div class="intervention-card__bottom">
            ${role === 'host'
              ? `<div class="intervention-card__agent">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  ${item.agentName || 'Non assigné'}
                </div>`
              : `<span class="intervention-card__agent">${item.heure_depart ? `Départ client : ${item.heure_depart}` : ''}</span>`
            }
            ${statutBadge(item.statut)}
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
/*  Nouvelle réservation Hôte                                 */
/* ---------------------------------------------------------- */
window.initHostNewReservation = async function () {
  document.getElementById('btn-back')?.addEventListener('click', () => history.back());

  // Stepper nb_voyageurs
  let nbVoyageurs = 1;
  const stepValue = document.getElementById('step-value');
  const stepMinus = document.getElementById('step-minus');
  const stepPlus  = document.getElementById('step-plus');

  function updateStepper() {
    stepValue.textContent = nbVoyageurs;
    stepMinus.disabled = nbVoyageurs <= 1;
    stepPlus.disabled  = nbVoyageurs >= 20;
  }
  stepMinus.addEventListener('click', () => { if (nbVoyageurs > 1)  { nbVoyageurs--; updateStepper(); } });
  stepPlus.addEventListener( 'click', () => { if (nbVoyageurs < 20) { nbVoyageurs++; updateStepper(); } });

  // Calcul nuits
  const inputArrivee = document.getElementById('input-arrivee');
  const inputDepart  = document.getElementById('input-depart');
  const inputDateInt = document.getElementById('input-date-intervention');
  const dateSummary  = document.getElementById('date-summary');
  const dateNuits    = document.getElementById('date-nuits');

  const today = new Date().toISOString().split('T')[0];
  inputArrivee.min = today;
  inputDepart.min  = today;

  function updateNuits() {
    const a = inputArrivee.value;
    const d = inputDepart.value;
    if (!a || !d || new Date(d) <= new Date(a)) { dateSummary.style.display = 'none'; return; }
    dateNuits.textContent = pluriel(calcNuits(a, d), 'nuit', 'nuits');
    dateSummary.style.display = 'flex';
  }

  inputArrivee.addEventListener('change', () => {
    if (inputDepart.value && inputDepart.value <= inputArrivee.value) inputDepart.value = '';
    inputDepart.min = inputArrivee.value || today;
    updateNuits();
  });

  inputDepart.addEventListener('change', () => {
    updateNuits();
    if (!inputDateInt.value) inputDateInt.value = inputDepart.value;
  });

  // Chargement agents
  try {
    const res    = await getAgents();
    const agents = res?.agents || [];
    const select = document.getElementById('input-agent');
    select.innerHTML = '<option value="">— Choisir un agent —</option>' +
      agents.map(a => `<option value="${a.userId}">${a.nom}</option>`).join('');
  } catch {
    document.getElementById('input-agent').innerHTML = '<option value="">Erreur de chargement</option>';
  }

  // Soumission
  document.getElementById('reservation-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const client_nom           = document.getElementById('input-client-nom').value.trim();
    const client_tel           = document.getElementById('input-client-tel').value.trim();
    const date_arrivee         = inputArrivee.value;
    const heure_arrivee        = document.getElementById('input-heure-arrivee').value;
    const date_depart          = inputDepart.value;
    const heure_depart         = document.getElementById('input-heure-depart').value;
    const agent_id             = document.getElementById('input-agent').value;
    const date_intervention    = inputDateInt.value;
    const heure_debut          = document.getElementById('input-heure-debut').value;
    const heure_fin            = document.getElementById('input-heure-fin').value;
    const type_intervention    = document.getElementById('input-type').value;
    const logement_id          = 'LOGEMENT_1';
    const plateforme           = document.getElementById('input-plateforme').value;
    const ref_reservation      = document.getElementById('input-ref').value.trim();
    const statut_reservation   = document.getElementById('input-statut-resa').value;
    const animaux              = document.getElementById('toggle-animaux').checked;
    const lit_bebe             = document.getElementById('toggle-lit-bebe').checked;
    const remarques            = document.getElementById('input-remarques').value.trim();

    if (!client_nom || !date_arrivee || !date_depart || !agent_id || !date_intervention) {
      toast('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }
    if (new Date(date_depart) <= new Date(date_arrivee)) {
      toast('La date de départ doit être après l\'arrivée.', 'error');
      return;
    }

    const linge = {
      draps:      parseInt(document.getElementById('linge-draps').value)     || 0,
      housses:    parseInt(document.getElementById('linge-housses').value)   || 0,
      taies:      parseInt(document.getElementById('linge-taies').value)     || 0,
      serv_bain:  parseInt(document.getElementById('linge-serv-bain').value) || 0,
      serv_mains: parseInt(document.getElementById('linge-serv-mains').value)|| 0,
      tapis:      parseInt(document.getElementById('linge-tapis').value)     || 0,
      torchons:   parseInt(document.getElementById('linge-torchons').value)  || 0,
      autres:     document.getElementById('linge-autres').value.trim(),
    };

    const btn = document.getElementById('btn-submit');
    btn.disabled    = true;
    btn.textContent = 'Création en cours…';

    try {
      const res = await creerReservation({
        logement_id, plateforme, ref_reservation, statut_reservation,
        client_nom, client_tel, nb_voyageurs: nbVoyageurs, animaux, lit_bebe,
        date_arrivee, heure_arrivee, date_depart, heure_depart,
        agent_id, date_intervention, heure_debut, heure_fin,
        type_intervention, linge, remarques,
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
    const typeLabel = { standard: 'Standard', grand_menage: 'Grand ménage', controle: 'Contrôle' }[item.type] || item.type;

    document.getElementById('detail-content').innerHTML = `
      <div class="info-block" style="margin-bottom:16px;">
        <div class="info-block__title">Réservation</div>
        <div class="info-block__body">
          <div class="detail-row"><span class="detail-label">Voyageur</span><span class="detail-value">${item.client_nom || '—'}</span></div>
          ${item.client_tel ? `<div class="detail-row"><span class="detail-label">Téléphone</span><span class="detail-value">${item.client_tel}</span></div>` : ''}
          ${item.plateforme ? `<div class="detail-row"><span class="detail-label">Plateforme</span><span class="detail-value">${item.plateforme}${item.ref_reservation ? ' · ' + item.ref_reservation : ''}</span></div>` : ''}
          <div class="detail-row"><span class="detail-label">Arrivée</span><span class="detail-value">${formatDate(item.date_arrivee)} à ${item.heure_arrivee || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Départ</span><span class="detail-value">${formatDate(item.date_depart)} à ${item.heure_depart || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Durée</span><span class="detail-value">${pluriel(nuits, 'nuit', 'nuits')}</span></div>
          <div class="detail-row"><span class="detail-label">Voyageurs</span><span class="detail-value">${pluriel(item.nb_voyageurs || 1, 'voyageur', 'voyageurs')}${item.animaux ? ' · Animaux' : ''}${item.lit_bebe ? ' · Lit bébé' : ''}</span></div>
        </div>
      </div>

      <div class="info-block" style="margin-bottom:16px;">
        <div class="info-block__title">Intervention</div>
        <div class="info-block__body">
          <div class="detail-row"><span class="detail-label">Agent</span><span class="detail-value">${item.agentName || 'Non assigné'}</span></div>
          <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formatDate(item.date_intervention)}</span></div>
          <div class="detail-row"><span class="detail-label">Horaires</span><span class="detail-value">${item.heure_debut || '—'} – ${item.heure_fin || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${typeLabel}</span></div>
          ${item.remarques ? `<div class="detail-row"><span class="detail-label">Remarques</span><span class="detail-value" style="white-space:pre-line;">${item.remarques}</span></div>` : ''}
        </div>
      </div>

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
          <div class="detail-row"><span class="detail-label">Horaires</span><span class="detail-value" style="font-weight:600;color:var(--accent);">${item.heure_debut || '—'} – ${item.heure_fin || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${typeLabel}</span></div>
          <div class="detail-row"><span class="detail-label">Départ client</span><span class="detail-value" style="font-weight:600;">${item.heure_depart || '—'}</span></div>
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
