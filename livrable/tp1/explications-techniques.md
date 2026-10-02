# Explications techniques — TP1

## Différence entre Signal et localStorage

Un **Signal** contient une valeur utilisée par Angular. Quand cette valeur change, Angular met à jour les parties de l'interface qui la lisent. Par exemple, si le nom dans `currentUser` change, le profil affiche le nouveau nom.

Le **localStorage** est un espace de stockage du navigateur. Il permet de conserver une information après un rechargement de la page ou une fermeture du navigateur. En revanche, modifier le localStorage ne met pas automatiquement l'interface Angular à jour.

| | Signal | localStorage |
|---|---|---|
| Utilité | Mettre à jour l'interface à partir d'un état | Conserver une information dans le navigateur |
| Après un rechargement | Il est recréé avec sa valeur initiale | Les données restent stockées |
| Valeurs stockées | Objets, textes, nombres, etc. | Des chaînes de caractères |

## Utilisation dans notre application

Dans [AuthService](../../frontend-starter/src/app/shared/services/auth.service.ts), nous utilisons les deux :

- `currentUser` est un Signal qui contient le profil de l'utilisateur connecté.
- `token` est un Signal qui contient le JWT utilisé pour les requêtes protégées.
- Le JWT est aussi enregistré dans le localStorage sous la clé `gpc_token` pour le retrouver après un rechargement.

Après une connexion ou une inscription réussie, le service enregistre le JWT dans le localStorage et met à jour les deux Signals.

Quand on recharge la page, le service relit le JWT du localStorage pour initialiser le Signal `token`. Le Signal `currentUser` repart à `null` : le profil est récupéré avec `GET /api/users/me` lorsqu'on ouvre la page de profil.

Quand on modifie son nom, le serveur renvoie le profil mis à jour. Le service place ce profil dans `currentUser`, ce qui actualise l'affichage.

Quand on se déconnecte, le service supprime `gpc_token` du localStorage et remet les deux Signals à `null`.

La présence d'un JWT dans le localStorage ne garantit pas qu'il est encore valide. Le serveur vérifie le JWT à chaque requête protégée. S'il est invalide ou expiré, l'intercepteur reçoit une erreur `401`, nettoie l'état de connexion et redirige vers `/login`.
