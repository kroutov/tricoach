# Déploiement

## Backend

Node.js/Express standard — n'importe quel hébergeur qui prend un process Node + PostgreSQL managé convient (Railway, Render, Fly.io). Pas de dépendance à une plateforme spécifique dans le code.

### 1. Base de données

Provisionner une instance PostgreSQL managée (Railway/Render/Fly ont toutes une offre intégrée ; Neon/Supabase fonctionnent aussi). Récupérer la chaîne de connexion — la plupart exigent `?sslmode=require` en production.

### 2. Variables d'environnement

`JWT_SECRET`/`DATABASE_URL` obligatoires — le process refuse de démarrer si l'un manque (`src/config/index.ts`, voir Phase 5 : plus de valeur par défaut silencieuse). Les autres sont optionnelles mais nécessaires pour que la fonctionnalité correspondante marche :

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | fourni par la plateforme d'hébergement en général (`process.env.PORT`) |
| `DATABASE_URL` | **obligatoire.** Chaîne de connexion Postgres managée |
| `JWT_SECRET` | **obligatoire.** Secret aléatoire long (`openssl rand -base64 32`) — **jamais** la valeur de `.env.example`/dev. Dérive aussi la clé de chiffrement des tokens Strava (`src/lib/crypto.ts`), donc double impact si compromis ou faible |
| `JWT_EXPIRES_IN` | ex. `30d` |
| `APPLE_BUNDLE_ID` | `com.tricoach.ai` (doit correspondre à l'identity token vérifié côté `POST /auth/apple` — dormant côté web) |
| `GOOGLE_CLIENT_ID` | Optionnel — sans lui, `POST /auth/google` répond 503 `google_oauth_not_configured` (le reste de l'API fonctionne normalement). OAuth Client ID créé sur [Google Cloud Console](https://console.cloud.google.com/) (type "Web application"), même valeur que `VITE_GOOGLE_CLIENT_ID` côté frontend |
| `CORS_ORIGINS` | Liste d'origines web autorisées, séparées par des virgules (ex. `https://app.tricoach.ai`). Vide par défaut = aucune origine autorisée (le frontend ne pourra pas appeler l'API) |
| `BACKEND_PUBLIC_URL` | URL publique du backend déployé (ex. `https://api.tricoach.ai`) — sert à construire `strava.redirectUri` |
| `WEB_PUBLIC_URL` | URL publique du client web déployé (ex. `https://app.tricoach.ai`) — le callback Strava y redirige le navigateur une fois la connexion terminée |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | app Strava sur [developers.strava.com](https://developers.strava.com), "Authorization Callback Domain" réglé sur le domaine du backend déployé |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | valeur arbitraire que tu choisis, utilisée dans le handshake de souscription |

Garmin (Phase web 4) n'a pas de variable d'environnement dédiée : l'intégration utilise les identifiants Garmin propres à chaque athlète (saisis dans l'app, chiffrés en base comme les tokens Strava), pas de clé d'API globale — voir `src/modules/integrations/garminClient.ts` pour le détail du tradeoff (accès non-officiel, Garmin peut le bloquer sans préavis).

### 3. Build & démarrage

```bash
npm ci
npx prisma migrate deploy   # PAS `migrate dev` — non-interactif, n'accepte que des migrations déjà commitées
npm run build                # tsc -> dist/
npm start                    # node dist/server.js
```

`npx prisma migrate deploy` doit tourner à chaque déploiement après un changement de schéma (généralement une étape de build/release de la plateforme d'hébergement, pas manuelle).

### 4. Après le premier déploiement

- **Vérifier** : `GET https://<host>/health` → `{"status":"ok"}`.
- **Enregistrer le webhook Strava** (une fois, maintenant que l'URL est publique) :
  ```bash
  curl -X POST https://www.strava.com/api/v3/push_subscriptions \
    -F client_id=$STRAVA_CLIENT_ID -F client_secret=$STRAVA_CLIENT_SECRET \
    -F callback_url=https://<host>/api/v1/webhooks/strava \
    -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
  ```
  Strava appelle immédiatement `GET .../webhooks/strava` pour le handshake — doit réussir avant que la souscription soit confirmée.
- **CORS** : allowlist explicite via `CORS_ORIGINS` (voir tableau ci-dessus) — inclure l'origine exacte du frontend déployé (ex. `https://app.tricoach.ai`), jamais `*`.

## Web (`tricoach-web/`)

SPA statique (Vite build → `dist/`) — **Vercel** recommandé (détection zéro-config, previews par branche). Netlify fonctionne aussi bien, choix interchangeable.

1. `npm run build` produit `dist/` — pas de serveur Node nécessaire côté frontend, tout passe par l'API existante.
2. Variables d'environnement (build-time, préfixe `VITE_` obligatoire pour être exposées au bundle) :
   - `VITE_API_BASE_URL` — URL du backend déployé + `/api/v1` (ex. `https://api.tricoach.ai/api/v1`).
   - `VITE_GOOGLE_CLIENT_ID` — même valeur que `GOOGLE_CLIENT_ID` côté backend (l'ID client Google n'est pas un secret, seul le client *secret* l'est, et il n'est jamais utilisé côté web).
3. Une fois l'URL de production connue, ajouter cette origine à `CORS_ORIGINS` sur le backend **avant** de pouvoir tester le frontend déployé — sinon toutes les requêtes échouent silencieusement (bloquées par CORS, pas d'erreur HTTP explicite).

## App iOS

### Backend URL

`TriCoachAI/Core/Networking/APIConfig.swift` pointe vers `localhost:3000` en Debug et vers un **placeholder qui plante volontairement** en Release (`fatalError` si non modifié). Avant d'archiver une build : remplacer `releaseBaseURLString` par l'URL du backend déployé (`https://<host>/api/v1`).

### Signature & distribution

Le projet est actuellement signé avec un **Personal Team gratuit** (`DEVELOPMENT_TEAM` dans `project.yml`) — suffisant pour développer/tester (Simulateur + appareil physique), mais **insuffisant pour distribuer sur l'App Store** : ça nécessite un compte Apple Developer Program payant (99$/an). À faire avant toute soumission :
1. Créer/rejoindre un compte Apple Developer Program.
2. Régénérer le provisioning (Xcode → Signing & Capabilities → sélectionner la nouvelle équipe), mettre à jour `DEVELOPMENT_TEAM` dans `project.yml`.
3. Vérifier que `PrivacyInfo.xcprivacy` (Phase 5, `TriCoachAI/Resources/`) est à jour si de nouvelles APIs/données sont ajoutées — App Store Connect rejette la soumission sinon.
4. Remplir la "Privacy Nutrition Label" dans App Store Connect (les entrées de `PrivacyInfo.xcprivacy` en sont la base, mais le formulaire App Store Connect reste à compléter séparément).

### Notifications push distantes (APNs)

Non implémenté (Phase 5, stretch) — nécessite un certificat/clé APNs généré depuis le compte Developer Program payant. `POST /me/push-token` est le seul bout côté API déjà prévu pour ça (non construit).

## CI

`.github/workflows/` (Phase 5) — voir directement les fichiers pour le détail. Ne tournera qu'une fois ce dossier poussé sur un dépôt GitHub avec Actions activé (aucun dépôt git n'existe encore localement à ce stade).
