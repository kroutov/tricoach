# TriCoach AI — Backend

API Node.js/Express/TypeScript + PostgreSQL (Prisma). Voir `docs/API.md` pour le détail des endpoints et `prisma/schema.prisma` pour le schéma.

## Statut (Phase 3 — fait)

- Auth : vérification Apple identity token (JWKS) + JWT, endpoint dev-only `/auth/dev-login` (miroir du mode démo iOS).
- `me` : profil athlète, disponibilités, objectifs (CRUD), check-ins de contraintes.
- `plans` : port TypeScript complet du moteur de plan (`src/modules/plans/engine/`, miroir de `TriCoachAI/Core/PlanEngine`) — génération, persistence relationnelle (macro/méso/microcycles/séances), lecture.
- `workouts` : complétion de séance → moteur d'adaptation server-side → mise à jour de la charge de la semaine suivante + `AdaptationEvent` ; `PATCH /:id/calendar-event` pour la sync Calendrier Apple ; `PATCH /:id` pour le repositionnement drag & drop (voir Phase 4 ci-dessous).
- `integrations/healthkit` : ingestion batch (séances + métriques santé) poussée par le client, matching aux séances planifiées, déclenche l'adaptation.
- `integrations/strava` : OAuth complet (backend détient le secret client — `auth-url`/`callback`/`status`/`DELETE`), tokens chiffrés (AES-256-GCM), synchronisation manuelle des 30 derniers jours.
- `webhooks/strava` : validation de souscription + réception d'événements temps réel (voir limite ci-dessous).
- `dashboard` : résumé de la semaine en cours (`/summary`) + analytique complète (`/analytics`, Phase 4 ci-dessous).
- 80 tests (unitaires moteur + intégration Supertest contre une vraie base Postgres de test, y compris Strava/HealthKit/webhooks avec l'API Strava simulée via mock de `fetch`).

**Phase 4 (fait)** :
- `PATCH /workouts/:id` — repositionnement drag & drop d'une séance. Contrainte dure : la nouvelle date doit rester dans la semaine (microcycle) de la séance — rejeté en 400 `date_outside_week` sinon, car la charge planifiée par microcycle suppose que chaque séance y reste. Conflits non-bloquants renvoyés (jour de repos obligatoire, une autre séance déjà ce jour-là — les bricks légitiment le partage d'un jour) : le déplacement est appliqué quand même, à charge pour le client de le signaler. Prend un jour `yyyy-MM-dd` (pas un instant complet) — voir la note sur les dates `@db.Date` ci-dessous, ce endpoint aurait silencieusement décalé la date d'un jour pour tout athlète à l'est de UTC sinon (bug détecté et corrigé via un aller-retour réel avant la mise en test).
- `GET /dashboard/analytics` (`src/modules/dashboard/analytics.ts`) — remplace les `/load-trends`/`/predictions` initialement prévus séparément par un seul endpoint consolidé : charge hebdomadaire planifiée/réalisée par microcycle, charge chronique/aiguë et forme (CTL/ATL/TSB, moyennes mobiles exponentielles sur 42/7 jours à partir des séances réalisées), distribution par zone d'intensité, tendance VO2max (`HealthMetricDaily`). Prédictions de performance non implémentées (nécessiteraient un modèle dédié, hors scope de cette passe).
- `POST /plans/generate` archive désormais le plan `ACTIVE` précédent (`ARCHIVED`) avant d'en créer un nouveau — sinon une régénération suite à un changement d'objectif laissait plusieurs plans `ACTIVE` en base.

**Phase 5 (fait — durcissement)** :
- **Sécurité** : `JWT_SECRET`/`DATABASE_URL` n'ont plus de valeur par défaut silencieuse (`src/config/index.ts` plante au démarrage si absents — `JWT_SECRET` dérive aussi la clé de chiffrement des tokens Strava, donc double impact si un déploiement l'oublie). Rate limiting (`express-rate-limit`, `src/middleware/rateLimit.ts`) : 20 req/15 min sur `/auth/apple` et `/auth/refresh`, 200/15 min sur `/webhooks/strava`. CORS fermé par défaut (`cors({ origin: false })` — aucun client web n'existe, l'app iOS utilise un Bearer token, pas de cookies). `npm audit` : 0 vulnérabilité.
- **Performance** : ajout d'index sur toutes les clés étrangères de la chaîne plan→macro→méso→micro→séances et sur `training_plans(user_id, status)` (la requête la plus chaude de l'app — voir `prisma/schema.prisma`, migration `add_performance_indexes`). Postgres n'indexe jamais les FK automatiquement ; vérifié via `EXPLAIN` qu'à échelle réaliste (50k lignes synthétiques) la requête passe bien d'un `Seq Scan` à un `Index Scan`. Test de charge basique : plan Ironman 48 semaines/7 séances par semaine (336 séances, borne haute réaliste) → `GET /plans/:id` ~65-75ms (payload ~360 KB), `GET /dashboard/analytics` ~60-90ms.
- **App Store** : `PrivacyInfo.xcprivacy` ajouté côté iOS (voir `TriCoachAI/README.md`).
- **CI** : `.github/workflows/ci.yml` — backend (Postgres en service container) + iOS (Postgres/backend démarrés à la main sur le runner macOS, pas de service containers disponibles hors Linux). Non exécuté (aucun dépôt git local pour l'instant) — à valider au premier push.
- `POST /me/push-token` + notifications push distantes (APNs) : toujours non construit, nécessite un certificat/clé Apple (compte Developer Program payant).

**Limite webhook Strava** : l'enregistrement d'une souscription (`POST https://www.strava.com/api/v3/push_subscriptions`) exige que Strava puisse joindre `callback_url` publiquement — impossible avec `localhost` sans tunnel (ngrok) ou déploiement public. Le récepteur (`GET`/`POST /webhooks/strava`) est fonctionnel et testé (validation de handshake + traitement d'événement, tests avec `fetch` simulé) ; seul l'enregistrement auprès de Strava est une étape de déploiement, pas de développement local.

## Démarrer

```bash
# Postgres local (une fois)
brew install postgresql@16 && brew services start postgresql@16
createdb tricoach && createdb tricoach_test

cp .env.example .env   # ajuster DATABASE_URL/TEST_DATABASE_URL, ajouter STRAVA_CLIENT_ID/SECRET/WEBHOOK_VERIFY_TOKEN
npm install
npx prisma migrate dev
npm run dev      # démarre le serveur sur :3000
npm test         # tests unitaires/intégration (jest + supertest, DB de test dédiée)
```

Pour Strava : créer une app sur [developers.strava.com](https://developers.strava.com), régler "Authorization Callback Domain" sur `localhost` pour le développement local.

## Notes d'implémentation

- **Mapping d'enums** (`src/lib/enumMapping.ts`) : les enums Prisma (`SCREAMING_SNAKE_CASE`) sont traduits vers/depuis les valeurs brutes exactes attendues par les enums `Codable` Swift (camelCase, ex. `triathlonOlympic`, `run10k`). Toute sérialisation API passe par ce mapping.
- **Dates `@db.Date`** (`src/lib/dateOnly.ts`) : `Date.toISOString()` de Node tronque en UTC — un minuit local (fuseaux positifs) peut glisser d'un jour lors du stockage. `toDateOnly()` normalise avant chaque écriture dans une colonne `@db.Date`. `PATCH /workouts/:id` (Phase 4) applique le même principe autrement : plutôt que de recevoir un instant potentiellement ambigu du client puis le normaliser, il prend directement un jour `yyyy-MM-dd` et construit lui-même le minuit UTC correspondant — évite la classe de bug à la source côté client plutôt que de la corriger côté serveur.
- **UUIDs insensibles à la casse** : Swift (`UUID().uuidString`) génère des UUID majuscules, Node (`crypto.randomUUID()`, utilisé par Prisma) des UUID minuscules. Les colonnes `id` sont du texte simple (comparaison sensible à la casse) — tout id reçu du client est normalisé en minuscules (`src/lib/zodHelpers.ts` + `.toLowerCase()` sur les params de route) avant toute requête Prisma.
- **Chiffrement des tokens Strava** (`src/lib/crypto.ts`) : AES-256-GCM, clé dérivée de `JWT_SECRET` via `scrypt`. Suffisant pour cette étape ; à remplacer par une clé dédiée gérée par un KMS avant de manipuler de vrais tokens utilisateurs en production.
- **Ingestion partagée** (`src/modules/integrations/activityIngestion.ts`) : HealthKit sync, Strava sync manuel et webhooks Strava passent tous par la même fonction `ingestActivities` (dédoublonnage par `source`+`externalId`, matching à la séance planifiée du jour, déclenchement de l'adaptation) — un seul endroit à faire évoluer si la logique de matching change.
