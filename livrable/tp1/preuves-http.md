# Relevé HTTP — TP1

Vérifications dans Chrome le 2 octobre 2026 sur `http://localhost:4200`. Les valeurs envoyées et reçues sont relevées ci-dessous ; le JWT est tronqué.

## Connexion refusée

```json
{
  "methode": "POST",
  "url": "http://localhost:4200/api/auth/login",
  "authorization": "Absent",
  "corps": {
    "email": "demo@example.com",
    "password": "mot-de-passe-incorrect-pour-le-test"
  },
  "statut": 401,
  "reponse": {
    "message": "Identifiants incorrects"
  }
}
```

## Connexion réussie

```json
{
  "methode": "POST",
  "url": "http://localhost:4200/api/auth/login",
  "authorization": "Absent",
  "corps": {
    "email": "demo@example.com",
    "password": "Demo1234!"
  },
  "statut": 200,
  "reponse": {
    "token": "eyJhbGciOiJIUzI1NiIs...hQ3YFd7k",
    "user": {
      "id": "6aabf34bd37748e45a5483b1",
      "name": "PASDEMO",
      "email": "demo@example.com",
      "createdAt": "2026-09-17T14:03:55.766Z"
    }
  }
}
```

Redirection observée vers `/tracks`.

## Lecture du profil

```json
{
  "methode": "GET",
  "url": "http://localhost:4200/api/users/me",
  "authorization": "Bearer eyJhbGciOiJIUzI1NiIs...hQ3YFd7k (tronque)",
  "corps": null,
  "statut": 200,
  "reponse": {
    "id": "6aabf34bd37748e45a5483b1",
    "name": "PASDEMO",
    "email": "demo@example.com",
    "createdAt": "2026-09-17T14:03:55.766Z"
  }
}
```

## Retour à la connexion après un 401

```json
{
  "methode": "GET",
  "url": "http://localhost:4200/api/users/me",
  "authorization": "Bearer jeton-invalide-test",
  "corps": null,
  "statut": 401,
  "reponse": {
    "message": "Jeton invalide ou expiré"
  }
}
```

Redirection observée vers `/login` et suppression du token.

Pour le dernier test, le header `Authorization` a été remplacé par `Bearer jeton-invalide-test` avant transmission. Le backend a réellement répondu `401`.

![Connexion refusée](captures/login-refused-ui.png)

![Profil du compte connecté](captures/profile-ui.png)

![Retour à la connexion après un 401](captures/session-invalide-login-ui.png)

Captures Network : [requête de connexion et statut](captures/network-api-login-headers.png), [valeurs envoyées](captures/network-api-login-payload.png).
