# API TriCoach AI (`/api/v1`)

Légende : ✅ implémenté · ⏳ non construit (phase future).

| Domaine | Endpoint | Description | Statut |
|---|---|---|---|
| Auth | `POST /auth/apple` | Vérifie l'identity token Apple, upsert user, retourne JWT | ✅ (dormant côté web, toujours utilisé si l'app iOS revient) |
| Auth | `POST /auth/register` | `{ email, password (min 8), fullName? }` → 201 `{ token, user }`. 409 `email_taken` si l'email existe déjà | ✅ (web, Phase web 1) |
| Auth | `POST /auth/login` | `{ email, password }` → 200 `{ token, user }`. 401 `invalid_credentials` (message générique identique pour email inconnu, mauvais mot de passe, ou compte sans mot de passe — anti-énumération) | ✅ (web, Phase web 1) |
| Auth | `POST /auth/google` | `{ idToken }` (ID token Google Identity Services) → 200 `{ token, user }`. Lie à un compte existant par email vérifié si trouvé, sinon crée. 503 `google_oauth_not_configured` si `GOOGLE_CLIENT_ID` absent, 401 `invalid_google_token` si le token est invalide | ✅ (web, Phase web 1) |
| Auth | `POST /auth/dev-login` | Bypass dev-only (non-production), miroir du "mode démo" iOS | ✅ |
| Auth | `POST /auth/refresh` | Ré-émet un JWT à partir d'un token valide | ✅ |
| Utilisateur | `GET /me`, `PUT /me` | Enregistrement utilisateur (nom, `hasCompletedOnboarding`) | ✅ |
| Profil | `GET/PUT /me/profile` | Profil athlète (âge, FC max/repos, FTP, allure seuil, CSS...) | ✅ |
| Disponibilités | `GET/PUT /me/availability` | Séances/semaine, durée max, jours, repos obligatoires | ✅ |
| Objectifs | `GET/POST/PUT/DELETE /me/goals[/:id]` | Objectifs sportifs multiples avec date/priorité/temps visé | ✅ |
| Contraintes | `GET/POST /me/constraints` | Check-in (blessures, fatigue, stress, sommeil) + historique récent | ✅ |
| Plans | `POST /plans/generate` | Génère un plan périodisé depuis un objectif (moteur TS, voir `src/modules/plans/engine/`) | ✅ |
| Plans | `GET /plans`, `GET /plans/:id` | Liste / détail plan complet (macro→méso→micro→séances) | ✅ |
| Plans | `GET /plans/:id/adaptation-events` | Historique des adaptations du plan | ✅ |
| Plans | *(régénération)* | Pas d'endpoint dédié : ré-appeler `POST /plans/generate` avec un nouvel objectif — archive automatiquement le plan `ACTIVE` précédent (`ARCHIVED`) avant d'en créer un nouveau | ✅ |
| Séances | `POST /workouts/:id/complete` | Feedback post-séance (RPE, durée réalisée) → déclenche l'adaptation server-side, ajuste la semaine suivante | ✅ |
| Séances | `PATCH /workouts/:id/calendar-event` | Associe/dissocie l'id d'événement EventKit local pour la sync Calendrier Apple | ✅ |
| Séances | `PATCH /workouts/:id` | Déplacement drag & drop (`{ date: "yyyy-MM-dd" }`, pas un instant complet — voir note dates ci-dessous). Contrainte dure : reste dans la semaine (microcycle) de la séance, sinon 400 `date_outside_week`. Conflits non-bloquants renvoyés dans `conflicts[]` (jour de repos obligatoire, séance déjà présente ce jour-là) — appliqué quand même | ✅ |
| Dashboard | `GET /dashboard/summary` | Semaine en cours : charge réalisée/planifiée, phase, séances à venir | ✅ |
| Dashboard | `GET /dashboard/analytics` | Charge hebdomadaire planifiée/réalisée par microcycle, charge chronique/aiguë et forme (CTL/ATL/TSB), distribution par zone d'intensité, tendance VO2max (`HealthMetricDaily`). Remplace les `/load-trends`/`/predictions` initialement prévus séparément — un seul endpoint consolidé. Prédictions de performance non implémentées | ✅ |
| Intégrations | `POST /integrations/healthkit/sync` | Ingestion batch (séances + métriques santé) poussée par le client, matching aux séances planifiées, déclenche l'adaptation | ✅ |
| Intégrations | `GET /integrations/strava/auth-url` | URL d'autorisation Strava (state = JWT signé, expire 10 min) | ✅ |
| Intégrations | `GET /integrations/strava/callback` | Callback OAuth (pas de bearer token — identifie l'utilisateur via `state`), échange le code, stocke les tokens chiffrés, redirige vers `${WEB_PUBLIC_URL}/profile?strava=success\|error&message=...` (Phase web 4 — remplace la redirection `tricoach://` de l'ère iOS) | ✅ |
| Intégrations | `GET /integrations/strava/status` | Statut de connexion Strava | ✅ |
| Intégrations | `DELETE /integrations/strava` | Déconnexion (supprime les tokens stockés) | ✅ |
| Intégrations | `POST /integrations/strava/sync` | Récupère et ingère les 30 derniers jours d'activités Strava | ✅ |
| Intégrations | `POST /integrations/garmin/connect` | `{ username, password }` (identifiants Garmin Connect de l'athlète — pas d'OAuth officiel) → 201 `{ connected: true }`. 401 `garmin_invalid_credentials` si Garmin rejette la connexion | ✅ (Phase web 4 — accès non-officiel via `garmin-connect`, voir README) |
| Intégrations | `GET /integrations/garmin/status` | Statut de connexion Garmin | ✅ |
| Intégrations | `DELETE /integrations/garmin` | Déconnexion (supprime la session et les identifiants chiffrés stockés) | ✅ |
| Intégrations | `POST /integrations/garmin/sync` | Restaure la session (ou se reconnecte avec les identifiants stockés si elle a expiré), récupère et ingère les 30 derniers jours d'activités Garmin. 409 `garmin_not_connected` si jamais connecté | ✅ |
| Calendrier | `GET /me/calendar-token` | Retourne le token d'abonnement calendrier de l'utilisateur (le crée au premier appel) + l'URL complète du flux | ✅ (Phase web 4) |
| Calendrier | `POST /me/calendar-token/rotate` | Émet un nouveau token, invalidant l'ancienne URL d'abonnement | ✅ |
| Calendrier | `GET /me/calendar.ics?token=...` | Flux iCal (RFC 5545) en lecture seule des séances du plan actif, en événements journée entière — **public**, aucun `Authorization` (le client calendrier ne peut pas envoyer de header, la capacité est dans le token) | ✅ |
| Webhooks | `GET /webhooks/strava` | Validation de souscription (handshake `hub.challenge`) | ✅ (non enregistré — nécessite une URL publique, voir README) |
| Webhooks | `POST /webhooks/strava` | Réception d'un événement d'activité, ingestion automatique | ✅ (idem) |
| Notifications | `POST /me/push-token` | Enregistre un device token APNs | ⏳ Phase 5 (nécessite un certificat/clé Apple) |

Toutes les routes `/me` (sauf `/me/calendar.ics`), `/plans`, `/workouts`, `/dashboard`, `/integrations/healthkit`, `/integrations/strava/*` (sauf `/callback`), `/integrations/garmin/*` exigent un header `Authorization: Bearer <jwt>` (middleware `requireAuth`). `/integrations/strava/callback`, `/webhooks/strava` et `/me/calendar.ics` n'ont pas de bearer token (appelés directement par le navigateur/Strava/un client calendrier tiers) et s'authentifient différemment (`state` signé, `hub.verify_token`/`owner_id`, `?token=` en query).

**Rate limiting** (Phase 5, `src/middleware/rateLimit.ts`) : `POST /auth/apple`, `/auth/refresh`, `/auth/register`, `/auth/login`, `/auth/google` partagent le même limiteur (`authRateLimit`, 20 requêtes/15 min **par IP, tous champs confondus** — pas 20 par route) — ce sont des routes de vérification cryptographique (JWKS, bcrypt, signature JWT), peu coûteuses à spammer sans limite. `POST /webhooks/strava` (public, sans auth) est limité à 200/15 min.

**CORS** (Phase web 1, `src/app.ts`) : allowlist explicite via `CORS_ORIGINS` (liste d'origines séparées par des virgules), pas de wildcard `*`. `credentials: false` — le client web garde son JWT en `localStorage`, pas de cookie de session.

**`WEB_PUBLIC_URL`** (Phase web 4) : URL publique du client web, utilisée pour construire la redirection du callback Strava (`${WEB_PUBLIC_URL}/profile?...`). Par défaut `http://localhost:5173` en dev.

**Dates `@db.Date`** : toute date-only (ex. `PATCH /workouts/:id`) doit être envoyée en `yyyy-MM-dd`, jamais en instant ISO complet — voir la note dans `tricoach-backend/README.md` (§ Notes d'implémentation) sur la troncature UTC de Postgres.
