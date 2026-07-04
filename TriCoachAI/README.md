# TriCoach AI — iOS

SwiftUI, MVVM, async/await, SwiftData. Généré via [XcodeGen](https://github.com/yonaskolb/XcodeGen) à partir de `project.yml` — ne pas committer `TriCoachAI.xcodeproj`, régénérer avec :

```bash
xcodegen generate
```

## Structure

- `App/` — point d'entrée, `DependencyContainer` (DI, câble les repositories réseau), `AppState` (routing auth/onboarding/main), `RootView`, `MainTabView`.
- `Core/DesignSystem/` — couleurs, typographie, composants réutilisables (`CardView`, `ZoneBar`, `ProgressRingView`, `PillBadge`).
- `Core/PlanEngine/` — moteur de génération et d'adaptation de plan (`PeriodizationEngine`, `MesocycleBuilder`, `MicrocycleBuilder`, `WorkoutFactory`, `RuleBasedPlanStrategy`, `AdaptationEngine`, `LoadCalculator`). Reste la stratégie de génération **locale/offline** de `SwiftDataPlanRepository` ; le mode réseau (par défaut) utilise le port TypeScript côté backend comme source de vérité.
- `Core/Persistence/` — modèles SwiftData (pattern "enveloppe" : id + colonnes indexables + payload JSON) et repositories locaux (`SwiftData*Repository`), utilisés comme cache par les repositories réseau.
- `Core/Networking/` — `APIClient` (async/await, JWT Bearer), `KeychainTokenStore` (avec repli UserDefaults si le Keychain est indisponible — voir note ci-dessous), `AuthAPIClient`, `UserAPI`, `WorkoutAPI`, `StravaAPI`, `StravaAuthSession` (ASWebAuthenticationSession), `HealthKitSyncAPI`, et les `Network*Repository` (réseau + écriture vers le cache local, repli sur le cache en cas d'échec réseau).
- `Core/HealthKit/` — `HealthKitManager` (authorization + requêtes HKHealthStore), `HealthKitMapper`/`HealthKitProvider` (mapping vers les modèles du domaine, testable sans accès réel au store), `HealthDataAggregator` (dédoublonnage multi-sources).
- `Core/Calendar/` — `CalendarSyncService` (EventKit : crée/met à jour les événements de séances planifiées dans le Calendrier Apple).
- `Core/Notifications/` — `LocalNotificationScheduler` (rappels de séance, alertes d'adaptation — notifications locales uniquement, voir note APNs).
- `Models/` — structs `Codable` du domaine, DTOs partagés avec le backend (mêmes noms de champs/valeurs d'enum, voir `tricoach-backend/src/lib/enumMapping.ts`), y compris `DashboardAnalytics`/`WeeklyLoadPoint`/`LoadFormPoint`/`ZoneDistributionPoint`/`VO2MaxPoint` (Phase 4).
- `Features/` — Onboarding (7 étapes + résumé), Auth (Sign In with Apple + mode démo), Dashboard (+ `DashboardAnalyticsView` : charge hebdo, CTL/ATL/forme, distribution des zones, tendance VO2max via Swift Charts), Calendar (drag & drop de séance entre jours de la semaine + détection de conflit côté serveur), WorkoutDetail (feedback post-séance + "Déplacer cette séance" — alternative accessible au drag & drop), Goals (gestion post-onboarding : liste/ajout/édition/suppression + régénération de plan), AdaptationHistory (historique complet des `AdaptationEvent`, lié depuis le Dashboard), Profile (intégrations HealthKit/Strava/Calendrier/rappels via `IntegrationsViewModel`).
- `Tests/` — `TriCoachAITests` (unit : PlanEngine, mapping HealthKit, agrégation multi-source), `TriCoachAIIntegrationTests`, `TriCoachAIUITests` (bout-en-bout, nécessitent le backend démarré en local : onboarding → plan généré côté serveur → dashboard, gestion des objectifs, historique d'adaptation, dashboard analytique, drag & drop calendrier avec conflit).

## Statut (Phase 5 — durcissement & préparation App Store)

- **`Core/Networking/APIConfig.swift`** : `baseURL` distingue maintenant Debug (`localhost:3000`) et Release. Une build Release plante volontairement (`fatalError`) tant que l'URL placeholder n'est pas remplacée par le backend réellement déployé — évite qu'une Archive parte silencieusement vers `localhost`. Voir `tricoach-backend/docs/DEPLOYMENT.md`.
- **`Core/Networking/KeychainTokenStore.swift`** : accessibilité Keychain explicite (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) plutôt que le défaut implicite — le token de session ne migre jamais vers un autre appareil (pas de sync iCloud Keychain, pas de restauration de backup non chiffré ailleurs).
- **`Resources/PrivacyInfo.xcprivacy`** (nouveau) : manifeste de confidentialité requis pour toute soumission App Store — déclare Health/Fitness/Nom/Email/UserID (liés au compte, usage "App Functionality" uniquement, pas de tracking) et la raison d'accès UserDefaults (`CA92.1`, repli Keychain). Vérifié bundlé dans l'app buildée.
- Aucune dépendance SPM externe dans le projet → rien à auditer côté vulnérabilités iOS.

## Statut (Phase 4 — dashboard avancé, calendrier & accessibilité)

Objectifs modifiables après l'onboarding (`Features/Goals/`), historique complet des adaptations (`Features/AdaptationHistory/`, lié depuis le Dashboard), analytique de charge (`Features/Dashboard/DashboardAnalyticsView.swift` — Swift Charts sur `GET /dashboard/analytics`), et calendrier avec repositionnement de séance par glisser-déposer (`.draggable`/`.dropDestination` dans `Features/Calendar/CalendarView.swift`, validation de semaine + conflits côté serveur).

**Accessibilité** : passe VoiceOver/Dynamic Type sur l'app — chips de sélection (`ChipGrid`) converties en vrais `Button` (au lieu de `Text` + `onTapGesture`, invisible pour VoiceOver), labels explicites sur les boutons icône-seule, lignes composites (séance, anneau de progression) regroupées en un seul élément accessible (`.accessibilityElement(children: .combine)`), résumés textuels sur les 4 graphiques Swift Charts (`.accessibilityValue`), et alternative 100% accessible au drag & drop calendrier (sélecteur de date dans le détail de séance). Le design system (`TCFont`) utilise déjà exclusivement des styles de texte sémantiques (`.headline`, `.body`, `.caption`…) donc le Dynamic Type fonctionne nativement sans ajustement supplémentaire — vérifié visuellement à la taille d'accessibilité maximale.

**Localisation fr/en** : différée à la demande de l'utilisateur, voir le README racine.

## Statut (Phase 3 — intégrations santé/activité)

L'app est **mode réseau par défaut** (Phase 2) : `DependencyContainer` câble des repositories qui appellent `tricoach-backend` (`http://localhost:3000` en dev — voir `Core/Networking/APIConfig.swift`) et mettent en cache localement (SwiftData) pour la lecture hors-ligne. La génération de plan et l'adaptation post-séance sont calculées **côté serveur**. Le moteur Swift local (`Core/PlanEngine/`) reste disponible comme repli entièrement hors-ligne si le backend est injoignable.

Écran Profil → section Intégrations :
- **HealthKit** : demande d'autorisation puis pousse les 30 derniers jours de séances/métriques vers `POST /integrations/healthkit/sync`. **Fonctionne avec un Apple ID gratuit** ("Personal Team", pas besoin des 99$/an) — vérifié en conditions réelles : la vraie feuille d'autorisation HealthKit s'affiche avec la liste complète des types de données demandés. Le Personal Team ne permet pas de *publier* sur l'App Store, mais suffit largement pour développer/tester en local, y compris sur un vrai iPhone.
- **Sign In with Apple** : capability provisionnée avec succès par le Personal Team également (aucune erreur d'entitlement). Sur le Simulateur, il faut juste être connecté à un Apple ID dans l'app Réglages du simulateur (`Réglages > Connectez-vous à votre iPhone`) pour aller jusqu'au bout du flux — "Continuer en mode démo" reste le raccourci le plus rapide pour développer sans ça.
- **Strava** : `ASWebAuthenticationSession` ouvre l'URL d'autorisation (générée côté serveur), le backend échange le code et stocke les tokens chiffrés, puis une synchronisation des 30 derniers jours se déclenche automatiquement. Testé avec de vrais identifiants côté génération d'URL ; l'étape de connexion utilisateur dans le navigateur n'a pas pu être automatisée (nécessite un compte Strava réel).
- **Calendrier Apple** : synchronise les séances à venir du plan actif vers le Calendrier par défaut (EventKit, pas d'entitlement requis — fonctionne sans signature).
- **Rappels** : notifications locales programmées avant chaque séance à venir + alerte immédiate quand le plan est ajusté suite à une synchronisation.

**Configuration de signature** (`project.yml`) : `CODE_SIGN_STYLE: Automatic` + `DEVELOPMENT_TEAM` réglé sur l'ID d'un Personal Team gratuit (résolu une fois via Xcode → cible TriCoachAI → *Signing & Capabilities* → sélectionner l'équipe → le Team ID apparaît alors dans `project.pbxproj`, à reporter dans `project.yml`). Si tu changes de compte Apple, refais cette étape et mets à jour `DEVELOPMENT_TEAM`. `KeychainTokenStore` garde son repli `UserDefaults` par précaution (utile si jamais le projet est de nouveau buildé sans équipe configurée) mais n'en a normalement plus besoin avec cette configuration.

## Tests

```bash
# Démarrer le backend d'abord (les tests d'intégration/UI l'appellent réellement)
(cd ../tricoach-backend && npm run dev &)

xcodebuild test -project TriCoachAI.xcodeproj -scheme TriCoachAI \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'
```
