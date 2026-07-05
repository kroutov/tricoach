# TriCoach AI

Coach d'entraînement adaptatif pour la course à pied, le vélo, la natation, le duathlon et le triathlon (sprint → Ironman).

**Pivot (après les 5 phases initiales)** : le produit est livré via un **site web** plutôt qu'une app mobile — moins coûteux (pas de compte Apple Developer Program, pas de review App Store) et ça lève les limites de test rencontrées côté iOS (Sign In with Apple qui bloque sur Simulateur, webhook Strava qui a besoin d'une URL publique). Le backend est réutilisé tel quel ; l'app iOS (`TriCoachAI/`) est mise de côté, pas supprimée. Voir le plan de migration dans `.claude/plans` pour le détail complet (le plan des 5 phases initiales y est aussi, pour l'historique).

**En ligne** : [https://tricoach-ten.vercel.app](https://tricoach-ten.vercel.app) (frontend, Vercel) · `https://tricoach-9ob8.onrender.com` (backend, Render).

## Structure

- [`tricoach-web/`](tricoach-web) — client web (React, Vite, TypeScript), 5 phases complètes, déployé. Voir [`tricoach-web/README.md`](tricoach-web/README.md).
- [`tricoach-backend/`](tricoach-backend) — API Node.js/Express/PostgreSQL (Prisma), commune aux deux clients. Voir [`tricoach-backend/README.md`](tricoach-backend/README.md).
- [`TriCoachAI/`](TriCoachAI) — app iOS native (SwiftUI, MVVM), mise de côté suite au pivot web mais fonctionnelle et testée (5 phases complètes). Voir [`TriCoachAI/README.md`](TriCoachAI/README.md).

## État d'avancement

### App iOS (5 phases initiales, mise de côté depuis le pivot web)

| Phase | Contenu | Statut |
|---|---|---|
| 0 | Bootstrap (projets iOS + backend, design system) | ✅ Fait |
| 1 | MVP iOS local : onboarding, moteur de génération de plan (périodisation + adaptation), persistence SwiftData, calendrier, dashboard | ✅ Fait |
| 2 | Backend Node/PostgreSQL réel (auth, profil/objectifs/dispo, port TS du moteur de plan, adaptation server-side), app iOS bascule en mode réseau (cache local en fallback) | ✅ Fait |
| 3 | HealthKit + Strava (remplacement Garmin), sync Calendrier Apple (EventKit), rappels locaux | ✅ Fait (voir limites ci-dessous) |
| 4 | Gestion des objectifs post-onboarding, historique d'adaptation, dashboard analytique (Swift Charts), drag & drop calendrier + détection de conflit, accessibilité (VoiceOver/Dynamic Type) | ✅ Fait (localisation fr/en différée à la demande, voir note ci-dessous) |
| 5 | Durcissement (sécurité, perf, tests), préparation App Store (privacy manifest), CI, doc de déploiement | ✅ Fait (déploiement hébergé réel non fait — pas d'hébergeur choisi ; voir notes ci-dessous) |

### Site web (pivot terminé, en ligne)

| Phase | Contenu | Statut |
|---|---|---|
| Web 1 | Bootstrap `tricoach-web/` (React/Vite/Tailwind), auth backend étendue (email/mot de passe + Google OAuth), CORS rouvert, pages Login/Register, garde de route | ✅ Fait — testé de bout en bout dans un vrai navigateur |
| Web 2 | Onboarding + dashboard (résumé) + calendrier (lecture seule) + détail de séance | ✅ Fait — testé de bout en bout dans un vrai navigateur |
| Web 3 | Objectifs + historique d'adaptation + dashboard analytique (graphiques) + drag & drop calendrier | ✅ Fait — testé de bout en bout dans un vrai navigateur |
| Web 4 | Intégration Strava (redirection web) + Garmin (accès non-officiel) + flux calendrier ICS | ✅ Fait — testé de bout en bout dans un vrai navigateur |
| Web 5 | Accessibilité (jsx-a11y, clavier, focus, contraste, E2E axe) + déploiement réel | ✅ Fait — en ligne sur Render + Vercel |

**Limites connues de la Phase 3** :
- **HealthKit fonctionne** avec un simple Apple ID gratuit ("Personal Team", pas d'abonnement à 99$/an) — vérifié en conditions réelles : la vraie feuille d'autorisation HealthKit s'affiche avec la liste complète des données demandées. Voir [`TriCoachAI/README.md`](TriCoachAI/README.md) pour la config de signature (`DEVELOPMENT_TEAM` dans `project.yml`).
- **Sign In with Apple** : capability également provisionnée avec succès par le Personal Team gratuit (aucune erreur d'entitlement) ; il faut juste être connecté à un Apple ID au niveau du Simulateur/appareil pour aller jusqu'au bout du flux.
- **Strava** : OAuth backend testé avec de vrais identifiants (génération d'URL confirmée), et toute la logique métier (échange de code, chiffrement des tokens, ingestion, webhooks) est couverte par des tests d'intégration avec API Strava simulée. L'étape "l'utilisateur se connecte et autorise dans son navigateur" n'a pas pu être exécutée automatiquement (nécessite un compte Strava réel dans un navigateur) — à valider manuellement en ouvrant l'URL retournée par `GET /integrations/strava/auth-url`.
- **Webhooks Strava** : le récepteur est fonctionnel mais ne peut pas être *enregistré* auprès de Strava sans URL publique (Strava doit pouvoir joindre le callback) — nécessite un déploiement public ou un tunnel (ngrok) le temps du développement local.
- **Notifications** : uniquement locales (`UNUserNotificationCenter`, rappels de séance + alertes d'adaptation). Le push distant (APNs) nécessite un certificat/clé Apple — à vérifier si le Personal Team le permet aussi, pas encore testé.

**Limites connues de la Phase 4** :
- **Localisation fr/en** : différée à la demande de l'utilisateur — l'app reste entièrement en français codé en dur (aucun `Localizable.xcstrings`). L'essentiel des `Text`/`Button` SwiftUI utilisent déjà `LocalizedStringKey` (extraction automatique possible), donc la mise en place d'un String Catalog + traductions reste un ajout localisé (pas de refonte requise) le jour où ce sera prioritaire.
- **Accessibilité du drag & drop calendrier** : en plus du geste de glisser-déposer, un chemin 100% accessible (VoiceOver, sans geste) existe via le détail de séance → "Déplacer cette séance" (sélecteur de date, même validation serveur — semaine du microcycle + conflits).

**Limites connues de la Phase 5** :
- **Pas de déploiement réel** : aucun hébergeur choisi/provisionné — `tricoach-backend/docs/DEPLOYMENT.md` documente la marche à suivre (Railway/Render/Fly + Postgres managé) mais rien n'est en ligne. L'app iOS pointe donc toujours vers `localhost:3000` en Debug ; `APIConfig.baseURL` a un garde-fou (`fatalError` en Release tant que l'URL placeholder n'est pas remplacée) pour éviter qu'une build Release parte silencieusement vers `localhost`.
- **CI pas encore vérifiée sur un vrai runner** : `.github/workflows/ci.yml` existe (backend + iOS) et le dépôt est désormais poussé sur `https://github.com/kroutov/tricoach` (Web Phase 5), mais aucun run GitHub Actions n'a encore été observé. YAML validé syntaxiquement, logique reprise du setup local qui fonctionne, mais nom du simulateur iOS/version Xcode à réajuster potentiellement au premier run.
- **Distribution App Store** : nécessite un compte Apple Developer Program payant (le Personal Team gratuit actuel ne suffit que pour dev/test) + remplir la Privacy Nutrition Label dans App Store Connect (base posée par `PrivacyInfo.xcprivacy`, formulaire à compléter séparément).
- **Notifications push distantes (APNs)** : toujours non implémentées (nécessite le compte Developer Program payant ci-dessus).
- **Sécurité** : revue faite sur le périmètre existant (secrets, rate limiting, CORS, Keychain, en-têtes, dépendances) — pas d'audit de pénétration externe, pas de WAF/monitoring d'intrusion (hors scope pour un projet à ce stade).

**Limites connues de la Phase Web 4** :
- **Garmin (accès non-officiel)** : à la demande explicite de l'utilisateur, réintégré via l'équivalent Node.js (`garmin-connect`) de la bibliothèque Python `python-garminconnect` — pas d'OAuth officiel, le backend utilise directement l'email/mot de passe Garmin de l'athlète (chiffrés au repos, comme les tokens Strava). Testé en conditions réelles contre les serveurs Garmin (tentative de connexion avec des identifiants invalides → rejet propre `garmin_invalid_credentials` affiché côté web), confirmant que l'accès n'est *pas* bloqué à ce jour malgré le durcissement anti-bot de mars 2026 évoqué plus haut — mais Garmin peut le bloquer sans préavis à tout moment, ce risque a été explicitement accepté par l'utilisateur plutôt que découvert après coup.
- **Flux ICS calendrier** : événements journée entière (pas d'horaire précis) — choix délibéré, différent de la sync EventKit iOS qui place les séances à une heure précise. Le backend ne connaît pas le fuseau horaire de l'athlète ; un horaire UTC fixe aurait affiché la séance à la mauvaise heure locale pour quiconque hors UTC, alors qu'un événement journée entière reste correct pour tous les fuseaux.

**Limites connues de la Phase Web 5** :
- **Déploiement réel** : fait — backend sur Render (`https://tricoach-9ob8.onrender.com`, PostgreSQL managé gratuit ⚠️ expire après 30 jours), web sur Vercel (`https://tricoach-ten.vercel.app`), dépôt sur `https://github.com/kroutov/tricoach`. Vérifié de bout en bout dans un vrai navigateur contre les deux services réels (inscription → onboarding → génération de plan → dashboard/calendrier/profil). Voir [`tricoach-backend/docs/DEPLOYMENT.md`](tricoach-backend/docs/DEPLOYMENT.md) pour la configuration exacte et les pièges rencontrés (`NODE_ENV=production` qui saute les devDependencies sur Render, casse silencieusement `tsc`/`prisma` sur une version non épinglée ; `vercel.json` nécessaire pour le routage côté client ; domaine Strava "Authorization Callback" à pointer vers le backend, pas le frontend).
- **Accessibilité** : passe complète faite (voir [`tricoach-web/README.md`](tricoach-web/README.md#statut) pour le détail des bugs trouvés/corrigés — coordinate getter clavier du calendrier, collision dnd-kit incompatible clavier, contraste WCAG en mode clair, landmarks manquants, `lang` incorrect) ; pas d'audit VoiceOver/lecteur d'écran mobile réel (la vérification s'est faite au clavier + axe-core, pas avec un lecteur d'écran physique).
- **Google Sign-In retiré post-lancement** : échouait en production de façon persistante (dernier diagnostic : `google-auth-library` ne peut vérifier les tokens que via un endpoint Google legacy désormais bloqué (403) ; corrigé avec une vérification JWKS faite maison identique au pattern Sign In with Apple, mais la connexion échouait encore ensuite pour une raison non identifiée) — retiré plutôt que de prolonger le diagnostic sur un fournisseur d'auth secondaire. Détail dans [`tricoach-web/README.md`](tricoach-web/README.md#statut).
- **Calendrier limité à la semaine courante, sans navigation** : corrigé post-lancement, d'abord avec une navigation semaine par semaine puis remplacé par une vraie vue mois sur plusieurs lignes (grille standard, drag & drop clavier étendu en 2D) — voir "Post-lancement" dans [`tricoach-web/README.md`](tricoach-web/README.md#statut).

## Démarrer

**Backend** (nécessite Node.js 20+ et PostgreSQL) :
```bash
cd tricoach-backend
brew install postgresql@16 && brew services start postgresql@16   # si pas déjà installé
createdb tricoach && createdb tricoach_test
cp .env.example .env   # ajuster DATABASE_URL/TEST_DATABASE_URL, ajouter STRAVA_CLIENT_ID/SECRET si besoin
npm install
npx prisma migrate dev
npm run dev   # écoute sur :3000
```

**Web** (nécessite Node.js 20+, backend lancé en local) :
```bash
cd tricoach-web
cp .env.example .env
npm install
npm run dev   # http://localhost:5173
```
Le backend doit avoir `CORS_ORIGINS=http://localhost:5173` dans son `.env` (déjà dans `.env.example`) — le redémarrer si `.env` a été modifié après son premier lancement (`ts-node-dev` ne surveille pas ce fichier).

**App iOS** (nécessite Xcode 16+, XcodeGen, backend lancé en local) :
```bash
cd TriCoachAI
xcodegen generate
open TriCoachAI.xcodeproj
```
Lancer sur un simulateur iOS 17+ — le simulateur atteint `http://localhost:3000` directement (pas de config réseau supplémentaire). Le projet est signé avec un Apple ID personnel gratuit (`DEVELOPMENT_TEAM` dans `TriCoachAI/project.yml`) : HealthKit et Sign In with Apple fonctionnent. Le bouton "Continuer en mode démo" sur l'écran de connexion (appelant l'endpoint dev-only `/auth/dev-login`) reste le raccourci le plus simple pour développer sans avoir à connecter un Apple ID au Simulateur.

## Tests

- Backend : `cd tricoach-backend && npm test` (106 tests unitaires + intégration contre une vraie base Postgres de test, y compris Strava/Garmin/HealthKit/webhooks avec API externes simulées, flux ICS calendrier, sécurité — rate limiting/CORS/headers/JWT — auth email/mot de passe, et config fail-fast). ⚠️ Un test (`dashboard.test.ts`, CTL/loadForm) échoue les dimanches — bug pré-existant lié au jour de la semaine dans le moteur d'analytique, sans rapport avec l'auth ou le calendrier ; voir la tâche de suivi correspondante.
- Web : `cd tricoach-web && npm run test:e2e` (Playwright + `@axe-core/playwright`, 8 specs sur les écrans clés — login + dashboard/calendrier/détail séance/objectifs/historique/analytique/profil authentifiés, contre le vrai backend — voir [`tricoach-web/e2e/README.md`](tricoach-web/e2e/README.md) pour le prérequis de compte de test seedé). Vitest pas encore mis en place (voir le plan de migration). Web Phases 1 à 5 validées manuellement dans un vrai navigateur (inscription/reload/déconnexion/connexion/garde de route ; onboarding complet → génération de plan réelle → dashboard → calendrier → complétion/échec/reprogrammation de séance avec adaptation et conflits affichés → navigation entre onglets ; objectifs CRUD + régénération de plan ; historique d'adaptation complet ; 4 graphiques analytiques ; drag & drop calendrier souris et clavier ; connexion Strava (URL OAuth réelle générée) ; connexion Garmin testée contre les vrais serveurs Garmin avec des identifiants invalides (rejet propre affiché) ; flux ICS généré et validé — 40 `VEVENT` bien formés, folding de ligne RFC 5545 correct ; rotation du token calendrier invalidant l'ancienne URL). Bugs réels découverts et corrigés pendant ces tests : (1) Recharts (v2 et v3) fige la géométrie des barres/lignes à une échelle ~10x trop petite quand l'animation d'entrée chevauche la mesure asynchrone de `ResponsiveContainer` au montage — fixé avec `isAnimationActive={false}` sur chaque série ; (2) `@dnd-kit`'s collision par défaut (`rectIntersection`) choisit parfois le mauvais jour quand l'élément glissé (une ligne pleine largeur) chevauche plusieurs zones de dépôt à la fois — fixé avec `collisionDetection={pointerWithin}`, puis complété par un repli `rectIntersection` car `pointerWithin` seul ne fonctionne pas au clavier ; (3) le callback Strava redirigeait encore vers le custom scheme iOS `tricoach://` — adapté pour rediriger vers `${WEB_PUBLIC_URL}/profile` ; (4) coordinate getter clavier du calendrier ciblait toujours le mauvais jour à la première pression de flèche ; (5) contraste WCAG insuffisant en mode clair sur les `PillBadge` (jamais testé avant, toute la vérification manuelle s'était faite en mode sombre) ; (6) landmarks `<main>` manquants + `lang="en"` sur une app entièrement française — trouvés par la suite Playwright+axe.
- iOS : `xcodebuild test -project TriCoachAI/TriCoachAI.xcodeproj -scheme TriCoachAI -destination 'platform=iOS Simulator,name=iPhone 16 Pro'` (36 tests unitaires, 1 test d'intégration, 6 tests UI bout-en-bout — figé depuis le pivot web, toujours vert).
- CI : `.github/workflows/ci.yml` (backend + iOS) — voir limites Phase 5 ci-dessus. Pas encore étendue au frontend web.
