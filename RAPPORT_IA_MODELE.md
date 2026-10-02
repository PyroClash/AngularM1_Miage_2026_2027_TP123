# Rapport d'usage de l'IA — TP1 et TP2

## Mission 0 — Cartographie de l'application

- Modèle : GPT-5.6.
- Aide apportée : repérage des composants, routes, services et modèles ; explication du trajet d'une requête de connexion.
- Fichiers concernés : `main.ts`, `routes.ts`, `auth.service.ts`, `auth.interceptor.ts`, `backend/src/app.js` et `backend/src/models/User.js`.
- Notions expliquées : composant → service → HttpClient → API → MongoDB ; routes publiques et protégées ; ajout du JWT par l'intercepteur.
- Preuve : [schéma annoté du flux de connexion](docs/mission-0/MISSION0_FLUX_CONNEXION.html).

## Mission 1 — Inscription, connexion et profil

- Modèle : GPT-5.6.
- Aide apportée : validation des formulaires, déconnexion, chargement et modification du profil, gestion des erreurs 401.
- Fichiers concernés : composants de connexion, inscription, navigation et profil ; `auth.service.ts` et `auth.interceptor.ts`.
- Notions expliquées : formulaires réactifs, appels API, JWT, Signals, localStorage et redirections.
- Vérifications : compilation frontend réussie ; dans Chrome, connexion `200` avec redirection, connexion refusée `401`, profil `200` et déconnexion avec suppression du token après un `401` protégé.
- Preuves : [relevé HTTP](livrable/tp1/preuves-http.md) et [explication Signal / localStorage](livrable/tp1/explications-techniques.md).
- Captures Network : [Headers — POST /api/auth/login, statut 200](livrable/tp1/captures/network-api-login-headers.png) et [Payload — email et mot de passe de démonstration](livrable/tp1/captures/network-api-login-payload.png).

## Mission 2 — Bibliothèque paginée

- Modèle : GPT-5.6.
- Aide apportée : affichage des pistes et des états de chargement, pagination serveur et intégration du MatPaginator avec ses libellés en français.
- Fichiers concernés : composant de bibliothèque (TypeScript, HTML et CSS), `track.service.ts`, configuration et dépendances Angular Material.
- Notions expliquées : Signals, `@for`, `@empty`, `@if`, paramètres `page` et `limit`, conversion de l'index du paginator vers le numéro de page de l'API.
- Vérifications dans Chrome : nouvelles requêtes des pages 1 et 2 avec `limit=5`, cinq puis quatre pistes sur neuf ; boutons désactivés aux bornes.
- Preuves : [relevé HTTP](livrable/tp2/preuves-reseau.md), [capture Network](livrable/tp2/captures/network-api-tracks.png) et [explications techniques](livrable/tp2/explications-techniques.md).

Captures : [page 1](livrable/tp2/captures/pagination-page-1.png), [page 2](livrable/tp2/captures/pagination-page-2.png), [cards sur mobile](livrable/tp2/captures/bibliotheque-mobile.png).

## Mission 3 — Upload et lecture audio

- Modèle : GPT-5.6.
- Aide apportée : validation du format et de la taille avant l'envoi, messages de chargement, d'erreur et de succès, correction du nouvel envoi après erreur, cards responsives et vérification de la lecture authentifiée.
- Fichiers concernés : composant de bibliothèque (TypeScript, HTML et CSS), `track.service.ts`, `app.css`, `styles.css` et livrables TP2.
- Notions expliquées : FormData avec `audio` et `title`, validation frontend et backend, intercepteur JWT, Blob, création et révocation des ObjectURL, mémoire, buffering et streaming.
- Vérifications dans Chrome : lecture audio authentifiée `200` et progression du lecteur ; format invalide bloqué avant l’envoi ; refus réel `400` du serveur affiché dans l’interface. Nouvel envoi possible après erreur sans resélection du fichier ; accès à la piste refusé au deuxième compte (`404`) ; cards sans débordement à 320, 390, 768 et 1 440 px.
- Preuves : [relevé HTTP](livrable/tp2/preuves-reseau.md), [démonstration de lecture](livrable/tp2/demonstration-lecture.md) et [explications techniques](livrable/tp2/explications-techniques.md).
- Captures de l’upload : [Headers — POST /api/tracks, statut 201 et multipart/form-data](livrable/tp2/captures/network-api-upload-headers.png) et [Payload — champs audio et title](livrable/tp2/captures/network-api-upload-payload.png).
