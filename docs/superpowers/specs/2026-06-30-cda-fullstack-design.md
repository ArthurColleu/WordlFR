# Wordle CDA — Application full-stack en couches — Design

Date : 2026-06-30
Cible : dossier projet **Concepteur Développeur d'Applications** (RNCP 37873).

## 1. Objectif

Reconstruire le jeu Wordle quotidien en une **application full-stack 3-tier** qui démontre l'intégralité des compétences du CDA, sans aucun service tiers (tout en local via Docker). L'app gagne des **comptes joueurs**, un **historique de parties**, des **statistiques**, en plus de l'administration des mots.

## 2. Couverture des blocs CDA (RNCP 37873)

| Bloc / compétence | Où c'est démontré |
|---|---|
| BC01 — Environnement de dev | Docker Compose, scripts npm, README |
| BC01 — Interfaces utilisateur | Front React + Tailwind, RGAA |
| BC01 — Composants métier | `apps/api/src/domain` (logique pure) + services |
| BC01 — Gestion de projet | docs/ (spécifications, plan, maquettes) |
| BC02 — Maquetter | docs/maquettes (wireframes des écrans) |
| BC02 — Architecture en couches | 3-tier : présentation / métier / accès données |
| BC02 — BDD relationnelle | PostgreSQL, schéma `users/daily_words/games/guesses`, MCD/MLD |
| BC02 — Composants d'accès aux données SQL | couche *repository* avec **requêtes paramétrées** (`pg`) |
| BC03 — Plans de tests | Vitest (unitaire) + Supertest (intégration) + cahier de recettes |
| BC03 — Documentation déploiement | docs/deploiement.md + Docker |
| BC03 — Mise en production DevOps | Docker Compose, CI GitHub Actions, healthcheck |
| Transversal — Sécurité OWASP/ANSSI | bcrypt, JWT httpOnly, requêtes paramétrées, helmet, rate-limit, validation zod, autz par rôle |
| Transversal — RGAA | ARIA, contraste, navigation clavier, focus, `lang=fr` |
| Transversal — RGPD | données minimales, mot de passe haché, suppression de compte, note RGPD |

## 3. Stack

- **Front** : Vite + React + TypeScript + Tailwind CSS + React Router.
- **Back** : Node + Express + TypeScript, organisé en couches (routes → controllers → services → repositories).
- **BDD** : PostgreSQL 16 (auto-hébergé Docker). Accès via `pg` en **SQL paramétré** (aucun ORM).
- **Auth/Sécu** : JWT en cookie httpOnly (SameSite=strict), bcrypt, helmet, express-rate-limit, validation zod.
- **Tests** : Vitest (unitaire), Supertest (intégration API).
- **DevOps** : Docker Compose (db + api + web), CI GitHub Actions, `.env.example`.

## 4. Architecture / structure du monorepo

```
ProjectBack/
  apps/
    api/                          # Backend Express + TypeScript
      src/
        config/        env.ts     # lecture + validation des variables d'env
        domain/                   # logique métier PURE (sans I/O), testée unitairement
          evaluateGuess.ts        # algorithme Wordle (2 passes, lettres dupliquées)
          dictionary.ts           # mots valides FR (5 lettres)
          fallbackWord.ts         # mot déterministe par date
          stats.ts                # calcul des statistiques joueur
        db/
          pool.ts                 # pool pg
          migrate.ts              # applique les migrations .sql au démarrage
          migrations/             # 0001_init.sql, ...
          seed.ts                 # admin + mots d'exemple
        modules/
          auth/                   # routes, controller, service, repository
          games/
          stats/
          words/                  # admin CRUD
          health/
        middlewares/
          authenticate.ts         # vérifie le JWT (cookie)
          authorize.ts            # contrôle du rôle
          validate.ts             # validation zod
          errorHandler.ts
          rateLimit.ts
        lib/  jwt.ts  password.ts # utilitaires (signer/vérifier JWT, hash bcrypt)
        app.ts                    # construit l'app Express (exportée → Supertest)
        server.ts                 # démarre le serveur HTTP
      tests/
        unit/                     # domain (Vitest)
        integration/              # API (Supertest, BDD de test)
      Dockerfile
      package.json  tsconfig.json  vitest.config.ts
    web/                          # Frontend Vite + React
      src/
        api/client.ts             # fetch wrapper (cookies, erreurs)
        auth/AuthContext.tsx      # état d'authentification
        components/  GameBoard  Keyboard  StatsChart  ...
        pages/  Login  Register  Game  Stats  Admin
        routes/  ProtectedRoute  AdminRoute
        main.tsx  App.tsx
      Dockerfile  nginx.conf
      package.json  tsconfig.json  tailwind.config.ts  vite.config.ts
  docker-compose.yml              # db + api + web
  .github/workflows/ci.yml        # lint + tests
  .env.example
  docs/
    cahier-des-charges.md
    mcd-mld.md                    # modèle de données (diagramme ER)
    maquettes.md                  # wireframes des écrans
    plan-de-tests.md              # cahier de recettes
    deploiement.md
    securite-owasp.md
    green-it.md
    rgpd.md
  README.md
```

**Flux 3-tier d'une requête (ex. soumettre un essai) :**
`POST /api/game/guess` → `games.routes` → `games.controller` (HTTP, validation) → `games.service` (règles métier : limite 6 essais lue en BDD, appel `evaluateGuess`) → `games.repository` (SQL paramétré : insert guess, update game) → PostgreSQL. Réponse au front : `{ result, status }` — **jamais le mot**.

## 5. Modèle de données (PostgreSQL)

```sql
-- Utilisateurs (joueurs ET admins, par rôle)
CREATE TABLE users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'player'
                CHECK (role IN ('player','admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Mots du jour (gérés par l'admin)
CREATE TABLE daily_words (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date       DATE        NOT NULL UNIQUE,
  word       VARCHAR(5)  NOT NULL,
  created_by INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parties : une par joueur et par mot du jour
CREATE TABLE games (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_word_id INTEGER NOT NULL REFERENCES daily_words(id) ON DELETE CASCADE,
  status        VARCHAR(11) NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress','won','lost')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  UNIQUE (user_id, daily_word_id)
);

-- Essais d'une partie
CREATE TABLE guesses (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id        INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  attempt_number SMALLINT NOT NULL CHECK (attempt_number BETWEEN 1 AND 6),
  guess          VARCHAR(5) NOT NULL,
  result         JSONB    NOT NULL,   -- ex. ["correct","present","absent","absent","correct"]
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, attempt_number)
);

CREATE INDEX idx_games_user ON games(user_id);
CREATE INDEX idx_guesses_game ON guesses(game_id);
```

Relations : `users 1—* games`, `games 1—* guesses`, `daily_words 1—* games`, `users 1—* daily_words`. Les **statistiques sont calculées par requêtes SQL d'agrégation** (pas de table dénormalisée) — démontre la maîtrise SQL.

Le dictionnaire de mots valides reste un **module de code** (donnée de référence de validation), pas une table — choix assumé pour rester minimal.

## 6. API (Express, en couches)

Toutes les réponses d'erreur : `{ error: string }` + code HTTP cohérent. Validation zod sur chaque body.

**Auth** (cookie JWT httpOnly posé à la connexion/inscription)
- `POST /api/auth/register` `{email,password}` → 201 `{user}` (+ cookie). Mot de passe ≥ 8 caractères.
- `POST /api/auth/login` `{email,password}` → 200 `{user}` (+ cookie). Rate-limit anti-bruteforce.
- `POST /api/auth/logout` → 204 (efface le cookie).
- `GET /api/auth/me` → 200 `{user}` ou 401.
- `DELETE /api/auth/me` → 204 (RGPD : suppression du compte + cascade).

**Jeu** (authentifié)
- `GET /api/game/today` → `{ status, attempts: [{guess,result}], maxAttempts: 6 }` — **jamais le mot**. Crée la partie du jour si absente.
- `POST /api/game/guess` `{guess}` → 200 `{ result, status }` ou 400 `invalid_word`. Le serveur lit le nombre d'essais réels **en BDD** (anti-triche total : impossible de forcer la révélation), refuse si partie finie ou 6 essais atteints, persiste l'essai, met à jour le statut.

**Statistiques** (authentifié)
- `GET /api/stats` → `{ gamesPlayed, wins, winRate, currentStreak, maxStreak, guessDistribution }` (calcul SQL sur les parties du joueur courant uniquement).

**Admin** (authentifié + rôle `admin`)
- `GET /api/admin/words` → `{ words }`
- `POST /api/admin/words` `{date,word}` → 201
- `PATCH /api/admin/words/:id` `{date?,word?}` → 200
- `DELETE /api/admin/words/:id` → 204

**Santé** (DevOps)
- `GET /api/health` → `{ status:'ok', db:true }`

## 7. Anti-triche (renforcé par les comptes)

Le mot du jour n'est jamais envoyé au client. L'état de la partie est **persisté côté serveur** (table `games`/`guesses`) : le nombre d'essais réels est lu en BDD, donc le client ne peut plus mentir sur son nombre d'essais. Aucune révélation du mot, même en cas de défaite. Un joueur ne peut accéder **qu'à sa propre** partie/statistiques (contrôle de propriété — OWASP A01).

## 8. Frontend (Vite + React + Tailwind)

Pages (React Router) :
- `/inscription`, `/connexion` : formulaires accessibles (labels, erreurs `aria-live`).
- `/` (jeu) : grille 6×5 animée (retournement à la révélation), clavier virtuel AZERTY + clavier physique, état synchronisé avec le serveur. Protégée.
- `/statistiques` : cartes (parties, % victoires, séries) + histogramme de distribution des essais. Protégée.
- `/admin` : tableau des mots + formulaire ajout + édition/suppression en ligne. Protégée + rôle admin.

Design « wahou » : palette de marque cohérente, mode sombre, micro-animations sobres, responsive mobile-first, soigné. **RGAA** : structure sémantique, `aria-label`/`role`, contrastes AA, focus visible, navigation clavier complète, `lang="fr"`, lien d'évitement.

État d'auth : `AuthContext` (appelle `/api/auth/me` au chargement) ; routes protégées redirigeant vers `/connexion`. Le JWT est en cookie httpOnly (le front ne le manipule jamais).

## 9. Sécurité (OWASP / ANSSI)

| Risque OWASP | Mesure |
|---|---|
| A01 Broken Access Control | middleware `authorize('admin')`, contrôle de propriété (un joueur n'accède qu'à ses données) |
| A02 Cryptographic Failures | bcrypt (mdp), JWT signé, cookie httpOnly+SameSite, secrets en env |
| A03 Injection | **100 % requêtes paramétrées** (`pg`), validation zod |
| A05 Security Misconfiguration | helmet (en-têtes), CORS en liste blanche, pas de stack trace exposée |
| A07 Identification/Auth Failures | rate-limit login, politique de mot de passe, expiration JWT |
| Journalisation | logs d'erreurs serveur sans données sensibles |

RGPD : seule donnée personnelle = email ; mot de passe haché ; endpoint de suppression de compte ; note RGPD + mentions.

## 10. Tests (plan de tests CDA)

**Unitaires (Vitest)** — couche `domain` et `lib` :
- `evaluateGuess` : cas simples, lettres dupliquées (les deux sens), mot trouvé.
- `stats` : calcul séries, % victoires, distribution.
- `dictionary` : toutes les entrées `^[a-z]{5}$` uniques.
- `password` : hash + vérif.

**Intégration (Supertest, BDD de test PostgreSQL)** :
- Auth : inscription, connexion, `me`, rejet sans cookie, suppression de compte.
- Jeu : essai valide/invalide, victoire, défaite à 6 essais, **le mot ne fuite jamais**, limite d'essais imposée serveur, impossible d'accéder à la partie d'autrui.
- Admin : 401 sans auth, 403 joueur non-admin, CRUD complet en admin.

**Cahier de recettes** (`docs/plan-de-tests.md`) : scénarios fonctionnels manuels + résultats attendus.

## 11. DevOps / déploiement

- `docker-compose.yml` : `db` (postgres:16, volume), `api` (build, healthcheck, dépend de db), `web` (build Vite servi par nginx, proxy `/api` → api).
- Migrations SQL appliquées au démarrage de l'api (`migrate.ts`) ; seed idempotent (admin depuis env + dictionnaire + mots d'exemple).
- `GET /api/health` pour le healthcheck.
- CI GitHub Actions : install + lint + tests (api & web).
- Démarrage : `cp .env.example .env && docker compose up --build` → app sur `http://localhost:8080`.

## 12. Documentation (dossier)

`docs/` contient les pièces attendues : cahier des charges, MCD/MLD, maquettes, plan de tests, doc de déploiement, note sécurité OWASP, note Green IT (éco-conception : bundle léger, requêtes indexées, images optimisées, pas de service superflu), note RGPD. Plus le README de lancement.

## 13. Hors périmètre (volontairement, pour rester minimal)

- Pas de NoSQL en plus (la « et NoSQL » du référentiel est traitée comme choix d'architecture justifié dans le dossier ; le domaine est relationnel). Option future : Redis pour cache/rate-limit.
- Pas de récupération de mot de passe par email (pas de service mail tiers) — mentionné comme évolution.
- Pas de classement multi-joueurs (leaderboard) en v1.
- Internationalisation : français uniquement.
