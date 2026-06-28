/* ============================================================
   api.js — Appels vers le Web App Google Apps Script
   ============================================================ */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzB9fyPr7iqpDqFdDlAKbii4iThFgi9T1NpxUoVh6rZ-X3ndOMt6lQwSqg2bqUrMSvpoA/exec';

/* --- GET avec params dans data= (utilisé par l'auth) ------ */
async function gasRequest(action, params = {}) {
  if (GAS_URL === 'REMPLACER') return { success: false, error: 'GAS_URL non configurée' };

  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);

  const userId = session.get('userId');
  if (userId) url.searchParams.set('userId', userId);
  if (Object.keys(params).length > 0) url.searchParams.set('data', JSON.stringify(params));

  const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('Réponse inattendue du serveur (non-JSON)');
  return res.json();
}

/* --- Auth ------------------------------------------------- */
async function verifierPin(pinHash) {
  return gasRequest('verifierPin', { pinHash });
}

async function creerProfil(nom, role, pinHash, recoveryHash) {
  return gasRequest('creerProfil', { nom, role, pinHash, recoveryHash });
}

async function verifierNom(nom) {
  return gasRequest('verifierNom', { nom });
}

// Vérifie nom + mot de récupération avant d'autoriser un nouveau PIN (ne modifie rien)
async function verifierRecuperation(nom, recoveryHash) {
  return gasRequest('verifierRecuperation', { nom, recoveryHash });
}

async function reinitialiserPin(nom, recoveryHash, pinHash) {
  return gasRequest('reinitialiserPin', { nom, recoveryHash, pinHash });
}

/* --- Interventions (GET) ---------------------------------- */
async function getInterventions() {
  return gasRequest('getInterventions');
}

async function getIntervention(id) {
  return gasRequest('getIntervention', { id });
}

async function debuterIntervention(id) {
  return gasRequest('debuterIntervention', { id });
}

async function getCloture(interventionId) {
  return gasRequest('getCloture', { id: interventionId });
}

/* --- Réservation ------------------------------------------ */
async function creerReservation(data) {
  const userId = session.get('userId');
  const url = new URL(GAS_URL);
  url.searchParams.set('action', 'creerReservation');
  url.searchParams.set('userId', userId);
  url.searchParams.set('data', JSON.stringify(data));
  const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  return res.json();
}

/* --- Clôture ---------------------------------------------- */
async function cloturerIntervention(id, data) {
  const res = await fetch(GAS_URL, {
    method:   'POST',
    body:     JSON.stringify({ action: 'cloturerIntervention', userId: session.get('userId'), id, data }),
    redirect: 'follow',
  });
  return res.json();
}

/* --- Annulation (GET simple) ------------------------------ */
async function cancelReservation(id) {
  return gasRequest('cancelReservation', { id });
}

/* --- Logements -------------------------------------------- */
async function getLogements() {
  return gasRequest('getLogements');
}

/* --- Agents ----------------------------------------------- */
async function getAgents() {
  return gasRequest('getAgents');
}

/* --- FCM -------------------------------------------------- */
async function saveFcmToken(token) {
  return gasRequest('saveFcmToken', { token });
}