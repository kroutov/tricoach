# Déploiement

## Déploiement réel actuel

- **Backend** : Render (Web Service + PostgreSQL managé, plans gratuits) — `https://tricoach-9ob8.onrender.com`. ⚠️ Le Postgres gratuit de Render expire après 30 jours ; il faudra upgrader ou reprovisionner + remigrer avant l'expiration.
- **Web** : Vercel — `https://tricoach-ten.vercel.app`.
- **Dépôt** : `https://github.com/kroutov/tricoach` (branche `main`).
- Vérifié de bout en bout dans un vrai navigateur contre les deux services réels : inscription → onboarding complet → génération réelle d'un plan 12 semaines → dashboard/calendrier/profil, CORS entre les deux domaines confirmé, flux ICS calendrier généré avec le vrai token.

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
| `CORS_ORIGINS` | Liste d'origines web autorisées, séparées par des virgules (ex. `https://app.tricoach.ai`). Vide par défaut = aucune origine autorisée (le frontend ne pourra pas appeler l'API) |
| `BACKEND_PUBLIC_URL` | URL publique du backend déployé (ex. `https://api.tricoach.ai`) — sert à construire `strava.redirectUri` |
| `WEB_PUBLIC_URL` | URL publique du client web déployé (ex. `https://app.tricoach.ai`) — le callback Strava y redirige le navigateur une fois la connexion terminée |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | app Strava sur [developers.strava.com](https://developers.strava.com), "Authorization Callback Domain" réglé sur le domaine du backend déployé |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | valeur arbitraire que tu choisis, utilisée dans le handshake de souscription |
| `CRON_SECRET` | valeur arbitraire longue (`openssl rand -base64 32`) — protège `POST /internal/nutrition/propose-week`, voir "Proposition hebdomadaire automatique" ci-dessous |

Garmin (Phase web 4) n'a pas de variable d'environnement dédiée : l'intégration utilise les identifiants Garmin propres à chaque athlète (saisis dans l'app, chiffrés en base comme les tokens Strava), pas de clé d'API globale — voir `src/modules/integrations/garminClient.ts` pour le détail du tradeoff (accès non-officiel, Garmin peut le bloquer sans préavis).

La météo (adaptation des propositions de menu à la ville de l'utilisateur, `src/modules/integrations/weatherClient.ts`) n'a elle non plus aucune variable d'environnement : [Open-Meteo](https://open-meteo.com) est gratuit et ne nécessite aucune clé API.

### 3. Build & démarrage

```bash
npm ci
npx prisma migrate deploy   # PAS `migrate dev` — non-interactif, n'accepte que des migrations déjà commitées
npm run build                # tsc -> dist/
npm start                    # node dist/server.js
```

`npx prisma migrate deploy` doit tourner à chaque déploiement après un changement de schéma (généralement une étape de build/release de la plateforme d'hébergement, pas manuelle).

⚠️ **Piège `NODE_ENV=production`** (rencontré en déployant sur Render) : de nombreux hébergeurs (Render inclus) sautent l'installation des `devDependencies` quand `NODE_ENV=production` est réglé — or `typescript` et le CLI `prisma` sont tous les deux en devDependencies. Sans eux, `npm run build`/`npx prisma migrate deploy` retombent sur des binaires non épinglés (npx allant chercher une version "latest" fraîche au lieu de celle du lockfile), ce qui a cassé un build avec des erreurs de dépréciation TS5107/TS5101 propres à TypeScript 6.0 — alors que la version 5.9.3 épinglée dans `package-lock.json` compile sans le moindre avertissement. **Build/Start Command réels utilisés sur Render** :
```
Build Command: npm ci --include=dev && npm run build
Start Command: ./node_modules/.bin/prisma migrate deploy && npm start
```
Le `--include=dev` force l'installation malgré `NODE_ENV=production` ; référencer `./node_modules/.bin/prisma` directement (plutôt que `npx prisma`) évite tout risque de récupération d'une version CLI non épinglée au démarrage.

### 4. Après le premier déploiement

- **Vérifier** : `GET https://<host>/health` → `{"status":"ok"}`.
- **`DATABASE_URL` malformée** : si Prisma refuse de démarrer avec `Error validating datasource` / `P1012` (l'URL ne commence pas par `postgresql://`), la variable d'environnement est vide ou mal collée — sur Render, copier l'**Internal Database URL** depuis l'onglet Connect de l'instance Postgres (pas l'External, qui exige `sslmode=require` en plus).
- **Enregistrer le webhook Strava** (une fois, maintenant que l'URL est publique) :
  ```bash
  curl -X POST https://www.strava.com/api/v3/push_subscriptions \
    -F client_id=$STRAVA_CLIENT_ID -F client_secret=$STRAVA_CLIENT_SECRET \
    -F callback_url=https://<host>/api/v1/webhooks/strava \
    -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
  ```
  Strava appelle immédiatement `GET .../webhooks/strava` pour le handshake — doit réussir avant que la souscription soit confirmée.
- **CORS** : allowlist explicite via `CORS_ORIGINS` (voir tableau ci-dessus) — inclure l'origine exacte du frontend déployé (ex. `https://app.tricoach.ai`), jamais `*`.

### 5. Proposition hebdomadaire automatique du menu

Chaque samedi, `.github/workflows/propose-weekly-menu.yml` (cron GitHub Actions, `0 8 * * 6` = samedi 8h UTC) appelle `POST /internal/nutrition/propose-week` sur le backend déployé pour pré-remplir le menu (déjeuner + dîner) de la semaine suivante de tous les utilisateurs ayant déjà utilisé la fonctionnalité nutrition. Il n'existe pas de notification pour prévenir l'utilisateur — la proposition est juste prête la prochaine fois qu'il ouvre la page Menu.

Cette route n'utilise pas l'authentification JWT habituelle (c'est un appel système, pas un utilisateur) — elle est protégée par un secret partagé à configurer une fois :
1. Générer une valeur secrète : `openssl rand -base64 32`.
2. L'ajouter comme variable d'environnement `CRON_SECRET` sur le service Render du backend (voir tableau ci-dessus).
3. L'ajouter comme secret de repo GitHub — `Settings → Secrets and variables → Actions → New repository secret`, nom `CRON_SECRET`, même valeur.

Pour tester sans attendre samedi : onglet **Actions** du repo GitHub → "Propose weekly menu" → **Run workflow** (déclenchement manuel via `workflow_dispatch`).

## Web (`tricoach-web/`)

SPA statique (Vite build → `dist/`) — **Vercel** recommandé (détection zéro-config, previews par branche). Netlify fonctionne aussi bien, choix interchangeable.

1. `npm run build` produit `dist/` — pas de serveur Node nécessaire côté frontend, tout passe par l'API existante.
2. Variables d'environnement (build-time, préfixe `VITE_` obligatoire pour être exposées au bundle) :
   - `VITE_API_BASE_URL` — URL du backend déployé + `/api/v1` (ex. `https://api.tricoach.ai/api/v1`).
3. `tricoach-web/vercel.json` — règle de réécriture (`/(.*) → /index.html`) indispensable pour React Router : sans elle, un rafraîchissement ou un lien direct vers une route comme `/calendar` renvoie un 404 (aucune route serveur ne correspond, tout doit retomber sur `index.html` pour que le routage côté client prenne le relais).
4. Une fois l'URL de production connue, ajouter cette origine à `CORS_ORIGINS` sur le backend **avant** de pouvoir tester le frontend déployé — sinon toutes les requêtes échouent silencieusement (bloquées par CORS, pas d'erreur HTTP explicite).

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

`.github/workflows/` (Phase 5) — voir directement les fichiers pour le détail. Le dépôt git a été initialisé et poussé sur `https://github.com/kroutov/tricoach` (Web Phase 5) ; à vérifier sur un vrai run GitHub Actions (nom du simulateur iOS/version Xcode potentiellement à réajuster au premier passage, jamais exécuté en conditions réelles jusqu'ici).
