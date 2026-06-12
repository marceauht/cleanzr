# CLAUDE.md — Cleanzr

Fichier de contexte permanent pour Claude Code. À lire au démarrage de chaque session de développement.

---

## 1. Présentation du projet

**Cleanzr** est un outil web de gestion d'interventions de ménage pour locations courte durée (LCD).

- **Porteur** : Marceau — mécanicien aéronautique, à l'aise avec HTML/CSS/JS, Git et Google Apps Script. Pas développeur professionnel.
- **Logement concerné (v1)** : Le Refuge de Saintines (`gite-refugedesaintines.com`)
- **Utilisateurs v1** : 1 hôte (iOS) + 1 agent d'entretien (Android)
- **Statut** : Produit autonome à part entière — pas un script ou une extension de l'existant.

### Ce que fait Cleanzr

1. L'hôte saisit les informations d'une réservation (dates, voyageurs, linge, remarques…)
2. L'agent reçoit automatiquement les détails sur son téléphone avec des rappels (J-3, J-1, jour J)
3. L'agent signale « intervention terminée » via une clôture : photos + remarques
4. L'hôte est notifié en retour par push notification
5. Tableau de bord partagé avec vues calendrier et liste

### Vision long terme

Architecture pensée pour évoluer vers multi-logements / multi-propriétaires / commercialisation — sans refonte majeure. La v1 ne doit pas fermer ces portes.

---

## 2. Stack technique

| Composant | Technologie |
|---|---|
| Frontend | HTML / CSS / JS vanilla |
| Hébergement | GitHub Pages → `cleanzr.gite-refugedesaintines.com` |
| Base de données | Google Sheets (instance dédiée Cleanzr) |
| Backend | Google Apps Script (web app déployée) |
| Push notifications | Firebase Cloud Messaging (FCM) via GAS `UrlFetchApp` |
| Stockage photos | Google Drive via GAS |
| Authentification v1 | PIN individuel par rôle (Hôte / Agent) |
| Coût | 0 €/mois |

---

## 3. Structure de la base de données (Google Sheets)

6 onglets, dans cet ordre :

| # | Onglet | Rôle |
|---|---|---|
| 1 | `Utilisateurs` | Comptes PIN (hôte / agent), tokens FCM |
| 2 | `Logements` | Propriétés gérées (v1 : 1 seul logement) |
| 3 | `Réservations` | Données saisies par l'hôte |
| 4 | `Interventions` | Générées automatiquement à partir des réservations |
| 5 | `Clôtures` | Rapports de fin d'intervention (photos, remarques) |
| 6 | `Notifications` | Log des notifications envoyées |

---

## 4. Structure du dépôt (attendue)

```
cleanzr/
├── CLAUDE.md               ← ce fichier
├── index.html              ← point d'entrée (redirection ou dashboard hôte)
├── css/
│   └── style.css
├── js/
│   └── app.js
├── hote/                   ← interface hôte
│   ├── dashboard.html
│   ├── reservation.html
│   └── cloture-detail.html
├── agent/                  ← interface agent
│   ├── dashboard.html
│   └── cloture.html
└── gas/                    ← scripts Google Apps Script (référence locale)
    ├── Code.gs
    ├── Notifications.gs
    └── Clotures.gs
```

> Le dossier `gas/` est une copie de référence locale. Le code actif est déployé depuis l'éditeur Google Apps Script — ne pas confondre les deux.

---

## 5. Authentification

- **Pas de système de comptes** : authentification par PIN à 4 chiffres
- **Hôte** → interface hôte (saisie réservation, tableau de bord, consultation clôtures)
- **Agent** → interface agent (consultation interventions, soumission clôtures)
- Les deux interfaces sont **strictement cloisonnées** — aucun accès croisé
- Le PIN est vérifié côté GAS (web app), jamais stocké en clair dans le JS frontend

---

## 6. Logique de notifications

| Déclencheur | Destinataire | Contenu |
|---|---|---|
| J-3 avant intervention | Agent | Rappel de l'intervention à venir |
| J-1 avant intervention | Agent | Rappel de l'intervention à venir |
| Jour J (matin) | Agent | Rappel jour J avec détails complets |
| Clôture soumise | Hôte | Notification : intervention terminée |
| Chaque dimanche | Hôte + Agent | Récapitulatif hebdomadaire |

- Les triggers sont des **time-based triggers Google Apps Script**
- Les push sont envoyés via **Firebase Cloud Messaging (FCM)**
- Les tokens FCM sont stockés dans l'onglet `Utilisateurs`

---

## 7. Règles absolues — à ne jamais enfreindre

### Séparation stricte de l'existant
Cleanzr est **totalement indépendant** de l'écosystème existant de Marceau :

- ❌ Ne jamais toucher à la feuille Google Sheets **"Réservations - LRDS"**
- ❌ Ne jamais lier ou modifier le **GAS du site principal** (`gite-refugedesaintines.com`)
- ❌ Ne jamais interférer avec **`guest.gite-refugedesaintines.com`**
- ✅ L'existant peut servir d'inspiration uniquement — jamais de point d'intégration

### Hébergement
- Le domaine est enregistré chez **Infomaniak** (registrar uniquement — pas d'hébergement actif)
- L'hébergement est assuré par **GitHub Pages** exclusivement
- Ne pas confondre les deux

### Google Apps Script
- Le GAS Cleanzr est déployé dans un **projet GAS dédié**, lié uniquement au Google Sheets Cleanzr
- Aucun script partagé avec d'autres projets

---

## 8. Conventions de développement

- **Langage** : JS vanilla uniquement — pas de framework (pas de React, Vue, etc.)
- **CSS** : vanilla, pas de framework UI (pas de Bootstrap, Tailwind, etc.)
- **Commentaires** : en français, concis
- **Nommage** :
  - Fichiers : `kebab-case.html`, `kebab-case.js`
  - Variables JS : `camelCase`
  - IDs / classes CSS : `kebab-case`
- **GAS** : fonctions nommées en `camelCase`, une fonction = une responsabilité claire
- **Pas de dépendances npm** — le projet doit rester déployable sur GitHub Pages sans build step

---

## 9. Déploiement

```bash
# Pousser les modifications sur GitHub (branche main)
git add .
git commit -m "description courte"
git push origin main
# GitHub Pages se met à jour automatiquement
```

Le GAS est déployé manuellement depuis l'éditeur Google Apps Script :
`Extensions > Apps Script > Déployer > Nouvelle version`

---

## 10. Ressources clés

| Ressource | Lien / Info |
|---|---|
| Cahier des charges | Google Docs — ID `1a2i9DfRgIniSEf0YCPcBOz33m1pGPx101BRDYa74TLE` |
| Dépôt GitHub | https://github.com/marceauht/cleanzr |
| Google Sheets Cleanzr | https://docs.google.com/spreadsheets/d/1kdsmVDphwk_YI04FdxmYioYiclnGHUMHacfD5qStD74/edit |
| Projet GAS Cleanzr | https://script.google.com/u/0/home/projects/1uU-opWYOGakqMGw_o126AhIhCCJdrVVI1CIE-SS3mqDyQcbaXSVNIjq7/edit |
| Projet Firebase | https://console.firebase.google.com/project/cleanzr |
| URL de production | `https://cleanzr.gite-refugedesaintines.com` |
