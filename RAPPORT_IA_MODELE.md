# Rapport d'usage de l'IA - TP1

## Mission 1 — Inscription, connexion et profil

- Modèle : GPT-5.6.
- Aide apportée : validation des formulaires, déconnexion, chargement et modification du profil, gestion des erreurs 401.
- Fichiers modifiés : composants de connexion, inscription, navigation et profil, ainsi que l'intercepteur d'authentification.
- Notions expliquées : formulaires réactifs, appels API, JWT, Signals et redirections.
- Vérifications : première compilation réussie ; vérifications Network effectuées

## Mission 2 — Bibliothèque paginée

- Modèle : GPT-5.6.
- Aide apportée : affichage des pistes et des états de chargement, pagination côté serveur, puis intégration du `MatPaginator` avec ses libellés en français.
- Fichiers modifiés : composant de bibliothèque (TypeScript, template et styles), configuration et dépendances Angular Material, ainsi que les explications techniques du TP2.
- Notions expliquées : Signals, `@for`, `@empty`, paramètres `page` et `limit`, pagination serveur et conversion entre l'index de page du paginator (à partir de 0) et celui de l'API (à partir de 1).
- Vérifications : relevé HTTP consigné pour les pages 1 et 2 (`GET /api/tracks?page=...&limit=5`) ; capture Network de la liste.

## Mission 3 — Upload et lecture audio

- Modèle : GPT-5.6.
- Aide apportée : validation du format et de la taille du fichier avant l'envoi, messages de chargement, d'erreur et de succès, présentation des pistes en cards et analyse de la lecture authentifiée.
- Fichiers modifiés : composant de bibliothèque (TypeScript, template et styles) et livrables TP2 sur le flux technique, les preuves réseau et la démonstration de lecture.
- Notions expliquées : `FormData` avec les champs `audio` et `title`, validation frontend et backend, intercepteur JWT, récupération d'un `Blob`, création et révocation d'une `ObjectURL`, buffering et streaming.
- Vérifications : démonstration de lecture et réponse audio `200` consignées ; rejet `400` d'un fichier non audio relevé dans les preuves réseau.
