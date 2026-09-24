# Démonstration de lecture authentifiée

Vérification observée le 24 septembre 2026 dans le navigateur sur `http://localhost:4200` :

1. Le formulaire de connexion du compte de démonstration a ouvert `/tracks`.
2. La bibliothèque a affiché deux cards, « SONG 2 » et « SONG 1 ».
3. Un clic sur « Lire » pour « SONG 2 » a fait apparaître « Lecture : SONG 2 » et le lecteur audio. La lecture a progressé dans le lecteur.
4. Une requête HTTP authentifiée vers `GET /api/tracks/:id/audio` pour cette piste a répondu `200`, avec `Content-Type: audio/mpeg` et `Content-Length: 6405141`.

Le frontend récupère le fichier avec `HttpClient`. L'intercepteur ajoute le JWT à cette requête ; le service reçoit un `Blob`, puis le composant crée une `ObjectURL` pour le lecteur.
