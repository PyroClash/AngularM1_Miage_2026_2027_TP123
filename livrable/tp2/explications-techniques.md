# Explications techniques — TP2

## Pagination serveur

Dans `src/app/components/tracks-page/tracks-page.ts`, le composant conserve `tracks`, `page`, `pages`, `total`, `loading` et `loadError` dans des Signals. Le `MatPaginator` d'Angular Material affiche le total et émet un événement `page`. Son index commence à 0 ; `go($event.pageIndex + 1)` le convertit en numéro de page de l'API, qui commence à 1. `go(page)` appelle ensuite `load()`, puis `TrackService.list(this.page(), 5)`. Dans `src/app/shared/services/track.service.ts`, `HttpClient` transmet les deux paramètres à `GET /api/tracks`.

Le backend applique `skip((page - 1) * limit)` et `limit(limit)` dans `backend/src/app.js`. Angular reçoit uniquement les métadonnées de la page demandée et ne découpe pas localement la liste complète.

## Upload : du formulaire à l'API

1. L'élément `<input type="file">` du template appelle `choose(event)`, qui lit `event.target.files?.[0]`.
2. `validateFile()` contrôle la présence du fichier, son type MIME et sa taille maximale de 25 Mo. Le composant affiche immédiatement l'erreur et bloque l'envoi si nécessaire.
3. `upload()` appelle `TrackService.upload(file, title)`. Le service construit un `FormData` avec exactement deux champs : `audio` pour le fichier et `title` pour le texte, puis envoie `POST /api/tracks` avec `HttpClient`.
4. Dans `backend/src/app.js`, le middleware `upload.single("audio")` et le `fileFilter` de Multer vérifient le fichier ; `limits.fileSize` impose 25 Mo. La route lit `req.body.title`.
5. En cas de succès, le composant affiche un message, vide le titre et le sélecteur de fichier, revient à la page 1 et recharge la liste. Pendant la requête, `uploading` désactive le bouton et bloque une deuxième soumission.

La validation frontend améliore l'expérience en signalant l'erreur avant le transfert. Elle ne protège pas le serveur à elle seule : un autre client HTTP peut appeler l'API sans passer par Angular. La validation backend reste donc obligatoire.

## Lecture : de l'API au lecteur

Dans `src/app/shared/services/track.service.ts`, `audio(id)` fait un `GET /api/tracks/:id/audio` avec `responseType: 'blob'`. Dans `src/app/components/tracks-page/tracks-page.ts`, `play(track)` reçoit ce `Blob`, crée une URL locale avec `URL.createObjectURL(blob)`, puis renseigne `audioUrl`. Le template lie cette URL à `<audio [src]="audioUrl()" controls>`.

Le code révoque l'ancienne URL lorsqu'une nouvelle piste est chargée, puis révoque la dernière URL à la destruction du composant. Cela libère la référence aux données du `Blob` qui n'est plus nécessaire. L'interface affiche le titre du morceau courant et les erreurs de chargement ou de décodage.

L'intercepteur `src/app/shared/interceptors/auth.interceptor.ts`, enregistré dans `src/main.ts`, ajoute `Authorization: Bearer <token>` aux requêtes privées de `HttpClient`, y compris la requête audio. Si l'on plaçait directement `/api/tracks/:id/audio` dans le `src` du lecteur, le navigateur émettrait lui-même la requête : elle ne passerait pas par l'intercepteur Angular et ne recevrait pas automatiquement ce header.

## Mémoire, buffering et streaming

1. **Le backend charge-t-il tout le fichier en mémoire ?** La route appelle `res.sendFile(audioPath)` sur un fichier stocké sur disque. Express peut transférer son contenu progressivement ; le code ne lit pas explicitement tout le fichier dans un tampon avant l'envoi.
2. **Quand le composant reçoit-il le `Blob` ?** Avec `HttpClient` et `responseType: 'blob'`, le callback `next` reçoit généralement le `Blob` une fois la réponse téléchargée en entier. Le lecteur peut ensuite mettre en tampon des parties de ce `Blob` local pour la lecture.
3. **Cent morceaux affichés chargent-ils cent fichiers audio ?** Non. La liste appelle seulement `GET /api/tracks`, qui renvoie des métadonnées paginées. `GET /api/tracks/:id/audio` n'est appelé que lorsque l'utilisateur clique sur « Lire ».
4. **Qu'en serait-il de cent lecteurs `<audio>` avec des URL HTTP ?** Le navigateur pourrait déclencher des requêtes ou préchargements pour plusieurs lecteurs, selon `preload` et son comportement. Le volume transféré et la mémoire dépendraient alors du navigateur. Dans l'interface actuelle, un seul lecteur est affiché.
5. **Pourquoi révoquer `ObjectURL` ?** L'URL conserve une référence au `Blob`. `URL.revokeObjectURL` permet de libérer cette ressource lorsque le lecteur utilise une autre piste ou que le composant disparaît.

Le streaming côté serveur désigne l'envoi progressif des octets depuis le disque. Le téléchargement du `Blob` par `HttpClient` et le buffering du lecteur sont deux étapes distinctes côté navigateur.
