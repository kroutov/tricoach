# TriCoach AI — Web

React + Vite + TypeScript. Remplace l'app iOS (`TriCoachAI/`, mise de côté) comme client du même backend (`tricoach-backend/`) — voir le plan de migration dans `.claude/plans` pour le contexte complet.

## Stack

- **React Router** — routing SPA.
- **TanStack Query** — cache/état serveur (invalidation croisée dashboard/calendrier/historique/analytique après chaque mutation).
- **React Hook Form + Zod** — formulaires, schémas calqués sur ceux du backend (`tricoach-backend/src/modules/*/routes.ts`).
- **Tailwind CSS v4** — tokens de design portés de `TriCoachAI/Core/DesignSystem/` (`src/index.css`, tokens `@theme inline`). ⚠️ Les couleurs custom utilisent des noms non-numériques (`brand`, `intensity-*`, `sport-*`, radius `card`/`control`/`pill`) qui ne collisionnent pas avec l'échelle par défaut de Tailwind — **ne pas ajouter de tokens `--spacing-sm`/`-md`/`-lg`/`-xl` custom**, ça écrase silencieusement `max-w-sm`, `text-lg`, etc. qui utilisent la même échelle de mots-clés. Utiliser l'échelle numérique par défaut de Tailwind (`p-1`/`p-2`/`p-4`/`p-6`/`p-8` = TCSpacing xs/sm/md/lg/xl, base 4px, coïncidence exacte).
- **date-fns** — dates. Toute date-only (rendez-vous avec le backend, ex. reprogrammation de séance) doit être formatée en `yyyy-MM-dd`, jamais un instant ISO complet — même piège de troncature UTC que côté backend (voir `tricoach-backend/README.md`).
- **Recharts** — graphiques analytiques (charge hebdo, forme CTL/ATL, répartition par zone, tendance VO2max). ⚠️ **Toujours passer `isAnimationActive={false}`** sur chaque `<Bar>`/`<Line>` : sans ça, l'entrée-animation initiale de Recharts entre en conflit avec la mesure asynchrone de taille de `ResponsiveContainer` au premier montage, et les barres/lignes se figent à une échelle ~10x trop petite (axes corrects, géométrie fausse) — bug reproduit aussi bien sur Recharts v2 que v3, silencieux (aucune erreur console), à ne diagnostiquer qu'en comparant la géométrie SVG réelle (`getAttribute('d')`) aux positions des graduations d'axe.
- **@dnd-kit/core** — drag & drop du calendrier. ⚠️ **Toujours passer `collisionDetection={pointerWithin}`** à `<DndContext>` : la valeur par défaut (`rectIntersection`) compare le rectangle englobant de l'élément déplacé (une ligne de séance pleine largeur) à celui de chaque zone de dépôt, donc dès que la ligne déplacée chevauche plusieurs jours de la semaine à la fois, l'algorithme peut choisir le mauvais jour — silencieusement, sans erreur, jusqu'à un rejet serveur `date_outside_week` déroutant. `pointerWithin` compare la position réelle du pointeur, pas le rectangle de l'élément — c'est le choix correct dès qu'un gros élément glissé cible de petites zones précises.

## Authentification

Email/mot de passe + Google Sign-In (Sign In with Apple reste dans le backend mais n'est pas utilisé ici). Token JWT stocké en `localStorage` (pas de cookie httpOnly — voir le tradeoff documenté dans le plan de migration). `src/features/auth/AuthContext.tsx` gère la session, `src/features/auth/RequireAuth.tsx` protège les routes.

Le bouton Google Sign-In (`GoogleSignInButton.tsx`) ne s'affiche que si `VITE_GOOGLE_CLIENT_ID` est configuré — créer un OAuth Client ID sur [Google Cloud Console](https://console.cloud.google.com/) pour l'activer.

## Démarrer

```bash
cp .env.example .env   # ajuster VITE_API_BASE_URL/VITE_GOOGLE_CLIENT_ID si besoin
npm install
npm run dev             # http://localhost:5173, le backend doit tourner sur :3000
```

Le backend doit avoir `CORS_ORIGINS` incluant `http://localhost:5173` dans son `.env` (voir `tricoach-backend/.env.example`) — sinon les requêtes sont bloquées silencieusement par CORS (le navigateur ne montre pas toujours une erreur explicite ; vérifier l'onglet réseau si une requête échoue sans raison apparente). Si le backend tournait déjà avant cette modification, le redémarrer : `ts-node-dev` ne surveille pas les changements de `.env`.

## Structure

- `src/api/` — wrappers fetch typés, un fichier par module backend (`auth.ts`, `me.ts` (profil, objectifs, token calendrier...), `plans.ts`, `workouts.ts`, `dashboard.ts` (résumé + analytique), `integrations.ts` (Strava, Garmin), `types.ts`).
- `src/features/` — un dossier par écran/domaine (`auth/`, `onboarding/`, `dashboard/`, `calendar/`, `workoutDetail/`, `goals/`, `adaptationHistory/`, `analytics/`, `profile/` (placeholder)).
- `src/components/` — primitives de design system partagées (ports de `Core/DesignSystem/`) : `Card`, `PillBadge`, `ProgressRing`, `Modal`, `AppLayout` (nav + déconnexion).
- `src/lib/` — utilitaires : `dateOnly.ts` (troncature UTC), `enumLabels.ts` (labels français), `plan.ts` (aplatissement macro/méso/microcycles, ports de `TrainingPlan.swift`).

## Statut

**Web Phase 1 (fait)** — bootstrap + authentification (register/login/Google), garde de route, rehydratation de session au reload. Testé de bout en bout dans un vrai navigateur (inscription → dashboard placeholder → reload → déconnexion → connexion → garde de route).

**Web Phase 2 (fait)** — onboarding (7 étapes), dashboard (anneau de complétion hebdo basé sur la charge TSS, charge réalisée/planifiée, prochaines séances, dernières adaptations), calendrier lecture seule (semaine Lundi-première, indicateurs de séance, bannière de microcycle), détail de séance (structure échauffement/corps principal/retour au calme + zones cibles, "Marquer comme complétée" avec feedback durée/RPE, "Marquer comme ratée", "Déplacer cette séance" avec sélecteur de date — chemin accessible sans glisser-déposer), coquille de navigation (Tableau de bord/Calendrier/Profil placeholder + déconnexion). Testé de bout en bout dans un vrai navigateur contre le vrai backend : onboarding complet → génération de plan réelle (12 semaines Triathlon Olympique) → dashboard → calendrier → complétion d'une séance (avec événement d'adaptation retourné et affiché) → séance ratée → reprogrammation (avec conflit non-bloquant détecté et affiché) → navigation entre les 3 onglets → déconnexion.

**Web Phase 3 (fait)** — gestion des objectifs (liste triée par date cible, ajout/édition/suppression via le même `GoalEditorForm` que l'onboarding, "Régénérer mon plan" en action explicite séparée — jamais automatique à la sauvegarde d'un objectif, fidèle à `GoalsManagementViewModel`), historique d'adaptation complet (tous les événements du plan actif, pas seulement les 5 de l'aperçu dashboard), dashboard analytique (4 graphiques Recharts — charge hebdomadaire planifiée/réalisée, forme CTL/ATL, répartition par zone, tendance VO2max masquée si vide — chacun avec un résumé textuel visible dès le premier rendu, pas seulement une annonce lecteur d'écran différée), drag & drop du calendrier (`@dnd-kit`, reprogrammation en glissant une séance sur un autre jour de la semaine affichée, sans mise à jour optimiste — attend la réponse serveur puis invalide le cache, comme `CalendarViewModel.reschedule`). Testé de bout en bout dans un vrai navigateur contre le vrai backend, y compris les deux bugs ci-dessus (animation Recharts, collision dnd-kit) découverts et corrigés pendant ce test.

**Web Phase 4 (fait)** — page Profil étendue : connexion/déconnexion/synchronisation Strava (redirection OAuth vers `GET /integrations/strava/auth-url`, callback backend qui redirige maintenant vers `${WEB_PUBLIC_URL}/profile?strava=success|error` au lieu du custom scheme iOS `tricoach://`), connexion/déconnexion/synchronisation Garmin (formulaire email/mot de passe — pas d'OAuth officiel, voir avertissement affiché dans l'UI et note ci-dessous), abonnement calendrier ICS (URL avec token, copie presse-papiers, régénération). Testé de bout en bout dans un vrai navigateur : URL Strava OAuth réelle générée et vérifiée (redirect_uri correct) ; connexion Garmin testée contre les **vrais serveurs Garmin** avec des identifiants invalides (rejet propre `garmin_invalid_credentials` affiché à l'utilisateur, confirmant que l'intégration atteint bien Garmin) ; flux ICS récupéré et validé (40 `VEVENT` bien formés, `Content-Type: text/calendar`) ; rotation du token calendrier confirmée invalider l'ancienne URL (404).

⚠️ **Garmin** : à la demande explicite de l'utilisateur, malgré le durcissement anti-bot de Garmin documenté dans le README racine (mars 2026). Utilise `garmin-connect` (npm), l'équivalent Node.js de la bibliothèque Python `python-garminconnect` — même accès non-officiel (identifiants Garmin de l'athlète, pas de token OAuth révocable), même risque que Garmin bloque ou casse cet accès sans préavis. Voir `tricoach-backend/src/modules/integrations/garminClient.ts` pour le détail du tradeoff.

**Web Phase 5 (fait — accessibilité)** — passe complète, pas un ajout de dernière minute :
- **Linting** : `jsx-a11y` activé dans `.oxlintrc.json` (plugin natif d'oxlint, remplace `eslint-plugin-jsx-a11y` — le projet n'utilise pas eslint).
- **`Modal`** (`src/components/Modal.tsx`) réécrit sur l'élément natif `<dialog>` (`showModal()`) : piège de focus, fermeture Échap et restauration du focus gratuits, sans lib. Fermeture au clic sur le backdrop gérée en comparant `e.target` à la ref du dialogue.
- **Calendrier** (`src/features/calendar/CalendarPage.tsx`) : `KeyboardSensor` ajouté à `@dnd-kit`, avec un `KeyboardCoordinateGetter` maison et des `Announcements`/`ScreenReaderInstructions` en français. ⚠️ Deux bugs découverts en testant le drag clavier (jamais visibles en glisser-déposer souris) :
  - *Mauvais jour ciblé dès la première pression de flèche* — le coordinate getter déduisait le jour courant depuis `currentCoordinates.x`, mais à la première pression, `currentCoordinates` reflète la position de la **ligne de séance elle-même** (bord gauche), pas celle d'un jour — l'index calculé était donc toujours faux. Fix : calcul de distance euclidienne au rect de jour le plus proche, avec repli sur le jour réellement programmé de la séance (via `findWorkoutWithMicrocycle`) si la distance dépasse un seuil.
  - *Le drag clavier ne déclenchait jamais de reprogrammation* — `collisionDetection={pointerWithin}` (Phase 3) n'a aucune coordonnée de pointeur pendant un drag clavier, donc `over` restait `null` en silence. Fix : combinateur `pointerWithin` puis repli sur `rectIntersection` (pattern documenté par dnd-kit lui-même) — nécessaire dès qu'un `DndContext` doit supporter à la fois souris et clavier.
- **Focus** : `AppLayout.tsx` déplace le focus sur `<main tabIndex={-1}>` à chaque changement de route (`useEffect` sur `pathname`).
- **Contraste des couleurs** : bug réel jamais détecté avant (toute la vérification manuelle du projet s'était faite en mode sombre) — les teintes `intensity-*`/`sport-*` (niveau 500) utilisées comme texte de `PillBadge` sur leur propre fond `color-mix(15%)` tombaient jusqu'à 1.93:1 en mode clair. Fix : tokens de couleur devenus sensibles au thème dans `src/index.css` (teintes 700/800 plus foncées en clair, teintes 500 d'origine conservées en sombre), vérifié par un script Node de calcul de ratio WCAG (luminance relative sRGB) plutôt qu'à l'œil, puis confirmé en direct via les styles calculés du navigateur dans les deux thèmes.
- **Landmarks/lang** : ajout de `<h1>` sur chaque page (Tableau de bord, Calendrier, Profil), `<div>` → `<main>` sur Login/Register/Onboarding (violation axe réelle `landmark-one-main`), `<html lang="en">` → `lang="fr"` (bug réel trouvé en creusant, l'app est entièrement en français).
- **`aria-pressed`/`aria-current`** ajoutés aux boutons de sélection à état (niveau sportif, sexe) et aux puces de jour du calendrier.
- **E2E accessibilité continue** : Playwright + `@axe-core/playwright` (`tricoach-web/e2e/`), 8 specs sur les écrans clés (login + dashboard/calendrier/détail séance/objectifs/historique/analytique/profil authentifiés). `color-contrast` volontairement exclu du scan axe (déjà couvert plus précisément par le script WCAG ci-dessus, axe ne voit pas fiablement à travers `color-mix()`). A trouvé et confirmé la correction de 2 violations réelles supplémentaires (label manquant sur l'input URL ICS du Profil, landmarks `<main>` manquants). **8/8 tests verts** après corrections.

Vérifié de bout en bout : suite backend 110/110, `tsc -b` propre, `oxlint src` sans nouvelle violation, suite Playwright+axe 8/8, passe manuelle clavier/zoom sur les écrans clés.

**Phase suivante** (voir le plan) : déploiement réel (Vercel + backend sur un hébergeur gratuit).
