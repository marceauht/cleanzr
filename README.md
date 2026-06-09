# Cleanzr

Web app SaaS de gestion d'interventions de ménage pour locations courte durée.

## Stack

- HTML / CSS / JS vanilla — aucun framework, aucun bundler
- Backend : Google Apps Script (GAS) sur Google Sheets
- Notifications push : Firebase Cloud Messaging
- Hébergement : GitHub Pages
- PWA installable sur iOS et Android

## Rôles

| Rôle | Accès |
|------|-------|
| **Hôte** | Créer des réservations, suivre les interventions, consulter les comptes-rendus |
| **Agent** | Voir ses interventions assignées, clôturer avec photos et remarques |

L'authentification est par code PIN à 4 chiffres. Le PIN détermine le rôle après vérification côté GAS.

## Structure

```
cleanzr/
├── index.html              Écran de connexion PIN
├── manifest.json           PWA manifest
├── service-worker.js       Notifications push FCM
├── firebase-config.js      Clés Firebase (ignoré par git — à créer)
├── assets/icons/           Icônes PWA (192px, 512px)
├── css/                    Feuilles de style par module
├── js/                     Logique applicative
└── pages/                  Fragments HTML injectés par le routeur
```

## Démarrage

### 1. Firebase

1. Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activez **Cloud Messaging**
3. Copiez `firebase-config.js` depuis le template et renseignez vos clés
4. Ajoutez la clé VAPID dans `window.FIREBASE_VAPID_KEY`

### 2. Google Apps Script

1. Créez un Google Sheet avec les onglets : `Users`, `Interventions`, `FCMTokens`
2. Déployez le script GAS comme **Web App** (accès : Tout le monde)
3. Copiez l'URL du déploiement dans `js/api.js` → constante `GAS_URL`

### 3. Icônes PWA

Placez `icon-192.png` et `icon-512.png` dans `assets/icons/`.

### 4. Hébergement GitHub Pages

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

Activez GitHub Pages sur la branche `main` depuis les Settings du repo.

## Structure des données GAS attendue

### Onglet `Users`
| userId | pinHash | role | name |
|--------|---------|------|------|

### Onglet `Interventions`
| id | logement | voyageur | dateArrivee | dateDepart | nbVoyageurs | agentId | statut | notes | compteRendu | photos | dateCreation |

### Actions GAS (`action` param)
- `verifyPin` — vérifie le hash PIN, retourne `{ success, role, name, userId }`
- `getInterventions` — liste selon le rôle et userId en session
- `getIntervention` — détail d'une intervention
- `createReservation` — crée une nouvelle intervention
- `closeIntervention` — clôture avec compte-rendu
- `saveFcmToken` — enregistre le token FCM de l'appareil
