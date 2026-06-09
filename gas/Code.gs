// ============================================================
//  Code.gs — Google Apps Script pour Cleanzr
//  Structure : 6 onglets
//  Déploiement : Web App, exécuté en tant que Moi, Tout le monde
// ============================================================

const SPREADSHEET_ID      = '1kdsmVDphwk_YI04FdxmYioYiclnGHUMHacfD5qStD74';
const SHEET_UTILISATEURS  = 'Utilisateurs';
const SHEET_LOGEMENTS     = 'Logements';
const SHEET_RESERVATIONS  = 'Reservations';
const SHEET_INTERVENTIONS = 'Interventions';
const SHEET_CLOTURES      = 'Clotures';
const SHEET_NOTIFICATIONS = 'Notifications';
const FCM_SERVER_KEY      = 'BGe7mThsyYutHbdeqjVfRRcLKTvJO3AQVAfj2n-fULIdmDNpKurZMBarKOCttQ5R3jnEspn2pzFb4of_vJcaEow';

// ============================================================
//  POINTS D'ENTRÉE
// ============================================================

function doGet(e) {
  try {
    const p      = e.parameter || {};
    const action = p.action    || '';
    const userId = p.userId    || null;
    const data   = p.data ? JSON.parse(p.data) : {};

    let result;
    switch (action) {
      case 'verifierPin':          result = verifierPin(data);                       break;
      case 'creerProfil':          result = creerProfil(data);                       break;
      case 'verifierNom':          result = verifierNom(data);                       break;
      case 'reinitialiserPin':     result = reinitialiserPin(data);                  break;
      case 'getInterventions':     result = getInterventions(userId);                break;
      case 'getIntervention':      result = getIntervention(data.id || p.id);        break;
      case 'creerReservation':
        const reservationData = p.data ? JSON.parse(p.data) : {};
        result = creerReservation(reservationData, userId);
        break;
      case 'cloturerIntervention': result = cloturerIntervention(data.id || p.id, data); break;
      case 'cancelReservation':    result = cancelReservation(data.id || p.id);      break;
      case 'getAgents':            result = getAgents();                             break;
      case 'saveFcmToken':         result = saveFcmToken(p.token || data.token, userId); break;
      default: result = { success: false, error: 'Action inconnue : ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents || '{}');
    const action = body.action || '';
    const userId = body.userId || null;

    let result;
    switch (action) {
      case 'creerReservation':     result = creerReservation(body.data || {}, userId);           break;
      case 'cloturerIntervention': result = cloturerIntervention(body.id, body.data || {});      break;
      default: result = { success: false, error: 'Action POST inconnue : ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============================================================
//  HELPERS SHEETS
// ============================================================

function getSheet(name) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Onglet introuvable : ' + name);
  return sheet;
}

function getRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function ensureHeaders_(sheetName, headers) {
  const sheet = getSheet(sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
}

function updateRow_(sheetName, keyCol, keyVal, fields) {
  const sheet   = getSheet(sheetName);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const keyIdx  = headers.indexOf(keyCol);
  if (keyIdx === -1) return { success: false, error: 'Colonne clé introuvable : ' + keyCol };
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][keyIdx]) === String(keyVal)) {
      Object.entries(fields).forEach(([col, val]) => {
        const colIdx = headers.indexOf(col);
        if (colIdx !== -1) sheet.getRange(i + 1, colIdx + 1).setValue(val);
      });
      return { success: true };
    }
  }
  return { success: false, error: 'Ligne non trouvée : ' + keyVal };
}

// ============================================================
//  AUTH (fonctions inchangées)
// ============================================================

function verifierPin(data) {
  const { pinHash } = data;
  if (!pinHash) return { success: false, error: 'PIN manquant' };
  const users = getRows(SHEET_UTILISATEURS);
  const user  = users.find(u => String(u.pin_hash) === String(pinHash));
  if (!user || !user.id) return { success: false, error: 'Code incorrect' };
  return { success: true, userId: String(user.id), nom: String(user.nom), role: String(user.role) };
}

function creerProfil(data) {
  const { nom, role, pinHash } = data;
  if (!nom || !role || !pinHash) return { success: false, error: 'Données manquantes' };
  if (!['host', 'agent'].includes(role)) return { success: false, error: 'Rôle invalide' };
  const nomTrimmed = nom.trim();
  if (nomTrimmed.length < 2) return { success: false, error: 'Nom trop court' };
  const users  = getRows(SHEET_UTILISATEURS);
  const exists = users.some(u => String(u.nom).toLowerCase() === nomTrimmed.toLowerCase());
  if (exists) return { success: false, error: 'Ce nom est déjà utilisé. Choisissez un autre prénom ou ajoutez votre initiale.' };
  const id    = 'usr_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  const sheet = getSheet(SHEET_UTILISATEURS);
  ensureHeaders_(SHEET_UTILISATEURS, ['id', 'nom', 'role', 'pin_hash', 'fcm_token', 'date_creation']);
  sheet.appendRow([id, nomTrimmed, role, pinHash, '', new Date().toISOString()]);
  return { success: true, userId: id, nom: nomTrimmed, role };
}

function verifierNom(data) {
  const { nom } = data;
  if (!nom) return { found: false };
  const users = getRows(SHEET_UTILISATEURS);
  const found = users.some(u => String(u.nom).toLowerCase() === nom.trim().toLowerCase());
  return { found };
}

function reinitialiserPin(data) {
  const { nom, pinHash } = data;
  if (!nom || !pinHash) return { success: false, error: 'Données manquantes' };
  const sheet   = getSheet(SHEET_UTILISATEURS);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const nomIdx  = headers.indexOf('nom');
  const hashIdx = headers.indexOf('pin_hash');
  const idIdx   = headers.indexOf('id');
  const roleIdx = headers.indexOf('role');
  if (nomIdx === -1 || hashIdx === -1) return { success: false, error: 'Structure de feuille incorrecte' };
  let userRow = null, rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][nomIdx]).toLowerCase() === nom.trim().toLowerCase()) {
      userRow = rows[i]; rowIndex = i + 1; break;
    }
  }
  if (!userRow) return { success: false, error: 'Utilisateur non trouvé' };
  sheet.getRange(rowIndex, hashIdx + 1).setValue(pinHash);
  return { success: true, userId: String(userRow[idIdx]), nom: String(userRow[nomIdx]), role: String(userRow[roleIdx]) };
}

// ============================================================
//  MÉTIER — LISTE INTERVENTIONS
// ============================================================

function getInterventions(userId) {
  if (!userId) return { success: false, error: 'userId manquant' };

  const users = getRows(SHEET_UTILISATEURS);
  const user  = users.find(u => String(u.id) === String(userId));
  if (!user) return { success: false, error: 'Utilisateur non trouvé' };

  const interventions = getRows(SHEET_INTERVENTIONS);
  const reservations  = getRows(SHEET_RESERVATIONS);

  let filtered = user.role === 'host'
    ? interventions
    : interventions.filter(i => String(i.agent_id) === String(userId));

  const result = filtered.map(i => {
    const res   = reservations.find(r => String(r.id) === String(i.reservation_id)) || {};
    const agent = users.find(u => String(u.id) === String(i.agent_id));
    return {
      id:                String(i.id),
      statut:            String(i.statut            || 'en_attente'),
      date_intervention: String(i.date_intervention || ''),
      heure_debut:       String(i.heure_debut       || ''),
      heure_fin:         String(i.heure_fin         || ''),
      type:              String(i.type              || 'standard'),
      client_nom:        String(res.client_nom      || '—'),
      date_arrivee:      String(res.date_arrivee    || ''),
      date_depart:       String(res.date_depart     || ''),
      heure_depart:      String(res.heure_depart    || ''),
      agentName:         agent ? String(agent.nom) : 'Non assigné',
    };
  });

  result.sort((a, b) => new Date(a.date_intervention) - new Date(b.date_intervention));
  return { success: true, interventions: result };
}

// ============================================================
//  MÉTIER — DÉTAIL INTERVENTION
// ============================================================

function getIntervention(id) {
  if (!id) return { success: false, error: 'ID manquant' };

  const interventions = getRows(SHEET_INTERVENTIONS);
  const item = interventions.find(i => String(i.id) === String(id));
  if (!item) return { success: false, error: 'Intervention non trouvée' };

  const reservations = getRows(SHEET_RESERVATIONS);
  const res = reservations.find(r => String(r.id) === String(item.reservation_id)) || {};

  const logements = getRows(SHEET_LOGEMENTS);
  const logement  = logements.find(l => String(l.id) === String(res.logement_id));

  const clotures = getRows(SHEET_CLOTURES);
  const cloture  = clotures.find(c => String(c.intervention_id) === String(id));

  const users = getRows(SHEET_UTILISATEURS);
  const agent = users.find(u => String(u.id) === String(item.agent_id));

  let linge = {};
  try { linge = JSON.parse(item.linge || '{}'); } catch { linge = {}; }

  const result = {
    id:                 String(item.id),
    statut:             String(item.statut             || 'en_attente'),
    date_intervention:  String(item.date_intervention  || ''),
    heure_debut:        String(item.heure_debut        || ''),
    heure_fin:          String(item.heure_fin          || ''),
    type:               String(item.type               || 'standard'),
    remarques:          String(item.remarques          || ''),
    horodatage_cloture: String(item.horodatage_cloture || ''),
    agentName:          agent ? String(agent.nom) : 'Non assigné',
    linge,
    reservation_id:     String(res.id                  || ''),
    logement_id:        String(res.logement_id         || ''),
    logement_nom:       logement ? String(logement.nom) : String(res.logement_id || '—'),
    plateforme:         String(res.plateforme          || ''),
    ref_reservation:    String(res.ref_reservation     || ''),
    statut_reservation: String(res.statut_reservation  || ''),
    client_nom:         String(res.client_nom          || '—'),
    client_tel:         String(res.client_tel          || ''),
    nb_voyageurs:       Number(res.nb_voyageurs)       || 1,
    animaux:            res.animaux  === 'true' || res.animaux  === true,
    lit_bebe:           res.lit_bebe === 'true' || res.lit_bebe === true,
    date_arrivee:       String(res.date_arrivee        || ''),
    heure_arrivee:      String(res.heure_arrivee       || ''),
    date_depart:        String(res.date_depart         || ''),
    heure_depart:       String(res.heure_depart        || ''),
  };

  if (cloture) {
    const clo = {
      id:         String(cloture.id        || ''),
      remarque:   String(cloture.remarque  || ''),
      created_at: String(cloture.created_at|| ''),
    };
    try { clo.signalements = JSON.parse(cloture.signalements || '[]'); } catch { clo.signalements = []; }
    try { clo.photos       = JSON.parse(cloture.photos       || '[]'); } catch { clo.photos       = []; }
    result.cloture = clo;
  }

  return { success: true, intervention: result };
}

// ============================================================
//  MÉTIER — CRÉER RÉSERVATION + INTERVENTION
// ============================================================

function creerReservation(data, userId) {
  const {
    logement_id, plateforme, ref_reservation, statut_reservation,
    client_nom, client_tel, nb_voyageurs, animaux, lit_bebe,
    date_arrivee, heure_arrivee, date_depart, heure_depart,
    agent_id, date_intervention, heure_debut, heure_fin,
    type_intervention, linge, remarques,
  } = data || {};

  if (!client_nom || !date_arrivee || !date_depart || !agent_id || !date_intervention) {
    return { success: false, error: 'Champs obligatoires manquants' };
  }

  const resId    = 'res_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  const resSheet = getSheet(SHEET_RESERVATIONS);
  ensureHeaders_(SHEET_RESERVATIONS, [
    'id', 'logement_id', 'plateforme', 'ref_reservation', 'statut_reservation',
    'client_nom', 'client_tel', 'nb_voyageurs', 'animaux', 'lit_bebe',
    'date_arrivee', 'heure_arrivee', 'date_depart', 'heure_depart', 'created_at',
  ]);
  resSheet.appendRow([
    resId, logement_id || 'LOGEMENT_1', plateforme || '', ref_reservation || '',
    statut_reservation || 'confirmee', client_nom, client_tel || '',
    nb_voyageurs || 1, animaux ? 'true' : 'false', lit_bebe ? 'true' : 'false',
    date_arrivee, heure_arrivee || '16:00', date_depart, heure_depart || '11:00',
    new Date().toISOString(),
  ]);

  const intId    = 'int_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  const intSheet = getSheet(SHEET_INTERVENTIONS);
  ensureHeaders_(SHEET_INTERVENTIONS, [
    'id', 'reservation_id', 'agent_id', 'date_intervention',
    'heure_debut', 'heure_fin', 'type', 'statut', 'linge',
    'remarques', 'horodatage_consultation', 'horodatage_cloture', 'created_at',
  ]);
  intSheet.appendRow([
    intId, resId, agent_id, date_intervention,
    heure_debut || '11:00', heure_fin || '15:00',
    type_intervention || 'standard', 'en_attente',
    JSON.stringify(linge || {}), remarques || '', '', '',
    new Date().toISOString(),
  ]);

  sendNotificationToAgent_(agent_id, {
    title: '📋 Nouvelle intervention',
    body:  client_nom + ' — ménage le ' + date_intervention,
  });

  return { success: true, id: intId, reservation_id: resId };
}

// ============================================================
//  MÉTIER — CLÔTURER INTERVENTION
// ============================================================

function cloturerIntervention(id, data) {
  if (!id) return { success: false, error: 'ID manquant' };

  const { remarque, signalements, photos } = data || {};

  const clotureId = 'clo_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  const clSheet   = getSheet(SHEET_CLOTURES);
  ensureHeaders_(SHEET_CLOTURES, ['id', 'intervention_id', 'remarque', 'signalements', 'photos', 'created_at']);
  clSheet.appendRow([
    clotureId, id, remarque || '',
    JSON.stringify(signalements || []),
    JSON.stringify((photos || []).map((_, i) => 'photo_' + id + '_' + (i + 1))),
    new Date().toISOString(),
  ]);

  const upd = updateRow_(SHEET_INTERVENTIONS, 'id', id, {
    statut:             'terminee',
    horodatage_cloture: new Date().toISOString(),
  });
  if (!upd.success) return upd;

  const intervention = getRows(SHEET_INTERVENTIONS).find(i => String(i.id) === String(id));
  if (intervention) {
    const reservations = getRows(SHEET_RESERVATIONS);
    const res          = reservations.find(r => String(r.id) === String(intervention.reservation_id));
    const users        = getRows(SHEET_UTILISATEURS);
    users.filter(u => String(u.role) === 'host' && u.fcm_token).forEach(host => {
      sendNotificationToUser_(String(host.fcm_token), {
        title: '✅ Intervention terminée',
        body:  (res ? String(res.client_nom) : '') + ' — ménage clôturé',
      });
    });
  }

  return { success: true };
}

function cancelReservation(id) {
  if (!id) return { success: false, error: 'ID manquant' };
  return updateRow_(SHEET_INTERVENTIONS, 'id', id, { statut: 'annulee' });
}

// ============================================================
//  UTILITAIRES
// ============================================================

function getAgents() {
  const users  = getRows(SHEET_UTILISATEURS);
  const agents = users
    .filter(u => String(u.role) === 'agent')
    .map(u => ({ userId: String(u.id), nom: String(u.nom) }));
  return { success: true, agents };
}

function saveFcmToken(token, userId) {
  if (!token || !userId) return { success: false, error: 'Paramètres manquants' };
  return updateRow_(SHEET_UTILISATEURS, 'id', userId, { fcm_token: token });
}

// ============================================================
//  NOTIFICATIONS FCM
// ============================================================

function sendNotificationToAgent_(agentId, notification) {
  const users = getRows(SHEET_UTILISATEURS);
  const agent = users.find(u => String(u.id) === String(agentId));
  if (!agent || !agent.fcm_token) return;
  sendNotificationToUser_(String(agent.fcm_token), notification);
}

function sendNotificationToUser_(fcmToken, notification) {
  if (!fcmToken || FCM_SERVER_KEY === 'REMPLACER') return;
  UrlFetchApp.fetch('https://fcm.googleapis.com/fcm/send', {
    method:  'post',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'key=' + FCM_SERVER_KEY,
    },
    payload: JSON.stringify({
      to:           fcmToken,
      notification: { title: notification.title, body: notification.body },
      data:         { url: '/#/agent/dashboard' },
    }),
    muteHttpExceptions: true,
  });
}

// ============================================================
//  INITIALISATION (à exécuter une fois manuellement)
// ============================================================

function initialiserSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const config = [
    {
      name: SHEET_UTILISATEURS,
      headers: ['id', 'nom', 'role', 'pin_hash', 'fcm_token', 'date_creation'],
    },
    {
      name: SHEET_LOGEMENTS,
      headers: ['id', 'nom', 'adresse'],
    },
    {
      name: SHEET_RESERVATIONS,
      headers: [
        'id', 'logement_id', 'plateforme', 'ref_reservation', 'statut_reservation',
        'client_nom', 'client_tel', 'nb_voyageurs', 'animaux', 'lit_bebe',
        'date_arrivee', 'heure_arrivee', 'date_depart', 'heure_depart', 'created_at',
      ],
    },
    {
      name: SHEET_INTERVENTIONS,
      headers: [
        'id', 'reservation_id', 'agent_id', 'date_intervention',
        'heure_debut', 'heure_fin', 'type', 'statut', 'linge',
        'remarques', 'horodatage_consultation', 'horodatage_cloture', 'created_at',
      ],
    },
    {
      name: SHEET_CLOTURES,
      headers: ['id', 'intervention_id', 'remarque', 'signalements', 'photos', 'created_at'],
    },
    {
      name: SHEET_NOTIFICATIONS,
      headers: ['id', 'utilisateur_id', 'intervention_id', 'type', 'envoyee_at', 'lue'],
    },
  ];

  config.forEach(({ name, headers }) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  });

  // Logement par défaut
  const logSheet  = ss.getSheetByName(SHEET_LOGEMENTS);
  const logRows   = logSheet.getDataRange().getValues();
  const hasLogmt  = logRows.slice(1).some(r => String(r[0]) === 'LOGEMENT_1');
  if (!hasLogmt) {
    logSheet.appendRow(['LOGEMENT_1', 'Le Refuge de Saintines', 'Saintines, France']);
  }

  Logger.log('Sheets initialisées avec succès.');
}

// ============================================================
//  NOTIFICATIONS — HÔTE
// ============================================================

function sendNotificationToHost_(notification) {
  const users = getRows(SHEET_UTILISATEURS);
  users
    .filter(u => String(u.role) === 'host' && u.fcm_token)
    .forEach(host => sendNotificationToUser_(String(host.fcm_token), notification));
}

// ============================================================
//  TRIGGERS — RAPPELS ET RÉCAP
// ============================================================

function envoyerRappels() {
  const interventions = getRows(SHEET_INTERVENTIONS);
  const reservations  = getRows(SHEET_RESERVATIONS);
  const today         = new Date();
  today.setHours(0, 0, 0, 0);

  interventions
    .filter(i => String(i.statut) === 'en_attente')
    .forEach(i => {
      const dateInt = new Date(i.date_intervention);
      if (isNaN(dateInt)) return;
      dateInt.setHours(0, 0, 0, 0);

      const diffMs   = dateInt - today;
      const diffDays = Math.round(diffMs / 86400000);

      let message = null;
      if (diffDays === 3) message = 'Rappel J-3 : intervention dans 3 jours';
      if (diffDays === 1) message = 'Rappel J-1 : intervention demain';
      if (diffDays === 0) message = 'Rappel J0 : intervention aujourd\'hui';
      if (!message) return;

      const res       = reservations.find(r => String(r.id) === String(i.reservation_id)) || {};
      const clientNom = String(res.client_nom || '');

      sendNotificationToAgent_(String(i.agent_id), {
        title: '🔔 ' + message,
        body:  clientNom ? message + ' — ' + clientNom : message,
      });

      Logger.log('[Rappel] J' + diffDays + ' → agent ' + i.agent_id + ' / ' + (clientNom || i.id));
    });
}

function envoyerRecapHebdo() {
  const interventions = getRows(SHEET_INTERVENTIONS);
  const reservations  = getRows(SHEET_RESERVATIONS);
  const users         = getRows(SHEET_UTILISATEURS);
  const today         = new Date();
  today.setHours(0, 0, 0, 0);

  const avenir = interventions
    .filter(i => {
      if (String(i.statut) !== 'en_attente') return false;
      const d = new Date(i.date_intervention);
      return !isNaN(d) && d >= today;
    })
    .sort((a, b) => new Date(a.date_intervention) - new Date(b.date_intervention));

  const count     = avenir.length;
  const prochaine = avenir[0];
  const bodyHost  = count === 0
    ? 'Aucune intervention à venir cette semaine.'
    : pluriel_(count, 'intervention à venir', 'interventions à venir') +
      (prochaine ? '. Prochaine : ' + prochaine.date_intervention : '');

  sendNotificationToHost_({ title: '📅 Récap hebdo Cleanzr', body: bodyHost });
  Logger.log('[Récap hôte] ' + bodyHost);

  // Récap par agent
  const agentIds = [...new Set(avenir.map(i => String(i.agent_id)))];
  agentIds.forEach(agentId => {
    const interventionsAgent = avenir.filter(i => String(i.agent_id) === agentId);
    const n      = interventionsAgent.length;
    const first  = interventionsAgent[0];
    const res    = reservations.find(r => String(r.id) === String(first.reservation_id)) || {};
    const body   = pluriel_(n, 'intervention à venir', 'interventions à venir') +
      '. Prochaine : ' + first.date_intervention + (res.client_nom ? ' — ' + res.client_nom : '');

    sendNotificationToAgent_(agentId, { title: '📅 Récap hebdo Cleanzr', body });
    Logger.log('[Récap agent ' + agentId + '] ' + body);
  });
}

function pluriel_(n, singular, plural) {
  return n === 1 ? n + ' ' + singular : n + ' ' + plural;
}

function installerTriggers() {
  // Supprime tous les triggers existants
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Trigger quotidien : envoyerRappels() à 8h
  ScriptApp.newTrigger('envoyerRappels')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  // Trigger hebdomadaire : envoyerRecapHebdo() dimanche à 19h
  ScriptApp.newTrigger('envoyerRecapHebdo')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(19)
    .create();

  Logger.log('Triggers installés : rappels quotidiens 8h + récap dimanche 19h');
}