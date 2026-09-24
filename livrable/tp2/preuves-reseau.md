# Relevé HTTP — pagination et validation

Vérifications effectuées le 24 septembre 2026 contre le frontend local `http://localhost:4200`, via son proxy `/api` vers le backend. Le compte de démonstration a servi à obtenir un JWT, conservé seulement en mémoire pendant les requêtes. Sa valeur et le mot de passe ne figurent pas ici.

| Requête | Statut | Résultat observé |
|---|---:|---|
| `GET /api/tracks?page=1&limit=5` | 200 | `page=1`, `limit=5`, `total=2`, `pages=1`, 2 pistes |
| `GET /api/tracks?page=2&limit=5` | 200 | `page=2`, `limit=5`, `total=2`, `pages=1`, 0 piste |
| `GET /api/tracks/:id/audio` pour une piste du compte connecté | 200 | `Content-Type: audio/mpeg`, `Content-Length: 6405141` |
| `POST /api/tracks` avec `README.md` dans le champ multipart `audio` | 400 | `Format audio non accepté` ; le fichier a été rejeté |
