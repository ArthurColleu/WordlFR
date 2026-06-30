# Diagrammes UML — WordlFR (CDA RNCP 37873)

> Diagrammes au format **Mermaid** : ils se rendent automatiquement sur GitHub
> et dans VS Code (extension *Markdown Preview Mermaid Support*).
> Tous sont dérivés du **code réel** de l'application (modules, schéma SQL, flux).
>
> Export image : copier un bloc sur [mermaid.live](https://mermaid.live) → PNG/SVG
> pour l'insérer dans le dossier.

---

## 1. Diagramme des cas d'utilisation

Trois acteurs avec héritage : un **Joueur** est un Visiteur authentifié, un
**Administrateur** est un Joueur disposant de droits supplémentaires.

```mermaid
flowchart LR
  visiteur(["👤 Visiteur"])
  joueur(["👤 Joueur"])
  admin(["👤 Administrateur"])

  visiteur -. est un .-> joueur
  joueur -. est un .-> admin

  subgraph Application WordlFR
    uc1(["S'inscrire"])
    uc2(["Se connecter"])
    uc3(["Se déconnecter"])
    uc4(["Consulter son profil"])
    uc5(["Supprimer son compte (RGPD)"])
    uc6(["Jouer la partie du jour"])
    uc7(["Soumettre un essai"])
    uc8(["Consulter ses statistiques"])
    uc9(["Gérer les mots du jour (CRUD)"])
  end

  visiteur --- uc1
  visiteur --- uc2

  joueur --- uc3
  joueur --- uc4
  joueur --- uc5
  joueur --- uc6
  joueur --- uc8

  admin --- uc9

  uc6 -. «include» .-> uc7
  uc7 -. «include» .-> evalUC(["Évaluer l'essai (jamais le mot)"])
```

**Règles métier portées par les cas d'utilisation :**
- `Jouer la partie du jour` inclut `Soumettre un essai` (6 essais maximum, imposé côté serveur).
- L'évaluation d'un essai ne renvoie **jamais** le mot cible (anti-triche).
- `Gérer les mots du jour` est réservé au rôle `admin` (middleware d'autorisation).

---

## 2. Diagramme de paquets

Architecture **3-tier** : le front (SPA) consomme l'API ; l'API est découpée en
couches (routes → contrôleurs → services → repositories) ; seuls les repositories
accèdent à PostgreSQL.

```mermaid
flowchart TB
  subgraph web["📦 apps/web (Front — Vite/React)"]
    w_pages["pages"]
    w_comp["components"]
    w_auth["auth (contexte)"]
    w_routes["routes (gardes)"]
    w_api["api (client HTTP)"]
    w_pages --> w_comp
    w_pages --> w_api
    w_routes --> w_auth
    w_auth --> w_api
  end

  subgraph api["📦 apps/api (Back — Express/TypeScript)"]
    a_app["app / server (bootstrap)"]
    subgraph mods["modules (auth, games, stats, words, health)"]
      m_routes["routes"]
      m_ctrl["controllers"]
      m_svc["services"]
      m_repo["repositories"]
      m_routes --> m_ctrl --> m_svc --> m_repo
    end
    a_domain["domain (evaluateGuess, dictionary, guesses, stats, fallbackWord)"]
    a_mw["middlewares (authenticate, authorize, errorHandler)"]
    a_lib["lib (password, jwt)"]
    a_db["db (pool, migrate, seed)"]
    a_cfg["config (env)"]

    a_app --> mods
    a_app --> a_mw
    m_routes --> a_mw
    m_svc --> a_domain
    m_svc --> a_lib
    m_repo --> a_db
  end

  pg[("🛢️ PostgreSQL")]

  w_api -- "HTTP/JSON (cookie JWT)" --> a_app
  a_db -- "SQL paramétré" --> pg
```

**Dépendances clés (sens des flèches) :** une couche ne dépend que de la couche
inférieure. La logique métier (`services` + `domain`) ne connaît pas SQL ;
le SQL est confiné dans `repositories` + `db`.

---

## 3. Diagramme de classes

### 3.1 Modèle de données (entités persistées)

Reflète fidèlement le schéma SQL (`db/migrations`).

```mermaid
classDiagram
  class User {
    +int id
    +string email  «unique»
    +string passwordHash
    +Role role
    +Date createdAt
  }
  class DailyWord {
    +int id
    +Date date  «unique»
    +string~5~ word
    +int createdBy  «FK User, nullable»
    +Date createdAt
  }
  class Game {
    +int id
    +int userId  «FK User»
    +int dailyWordId  «FK DailyWord»
    +Status status
    +Date startedAt
    +Date finishedAt
  }
  class Guess {
    +int id
    +int gameId  «FK Game»
    +smallint attemptNumber  «1..6»
    +string~5~ guess
    +LetterState[] result  «JSONB»
    +Date createdAt
  }
  class Role {
    <<enumeration>>
    player
    admin
  }
  class Status {
    <<enumeration>>
    in_progress
    won
    lost
  }
  class LetterState {
    <<enumeration>>
    correct
    present
    absent
  }

  User "1" --> "0..*" Game : joue
  DailyWord "1" --> "0..*" Game : cible de
  Game "1" --> "0..6" Guess : contient
  User "1" --> "0..*" DailyWord : crée (admin)
  User --> Role
  Game --> Status
  Guess --> LetterState
```

**Contraintes notables :** `UNIQUE(user_id, daily_word_id)` (une seule partie par
joueur et par jour), `UNIQUE(game_id, attempt_number)`, `ON DELETE CASCADE`
(suppression de compte → parties → essais, support du droit à l'oubli).

### 3.2 Couches applicatives (module *games* en exemple)

L'API n'est pas orientée objet classique mais organisée en **fabriques de
services** (closures TypeScript). On les représente comme des classes pour le
dossier.

```mermaid
classDiagram
  class GamesRoutes {
    +GET /today
    +POST /guess
  }
  class GamesController {
    +getToday(req, res)
    +submitGuess(req, res)
  }
  class GamesService {
    +getToday(userId) GameState
    +submitGuess(userId, guess) GuessResult
    -ensureWordAndGame(userId)
  }
  class GamesRepository {
    +findWordByDate(date)
    +insertDailyWord(date, word, by)
    +findGame(userId, wordId)
    +createGame(userId, wordId)
    +countGuesses(gameId) int
    +listGuesses(gameId)
    +insertGuess(gameId, n, guess, result)
    +updateGameStatus(gameId, status)
  }
  class Domain {
    <<module>>
    +evaluateGuess(guess, word) LetterState[]
    +isValidWord(word) bool
    +dailyFallbackWord(date, dict) string
  }
  class Authenticate {
    <<middleware>>
    +verifie le cookie JWT → userId
  }

  GamesRoutes --> Authenticate : protège
  GamesRoutes --> GamesController
  GamesController --> GamesService
  GamesService --> GamesRepository
  GamesService --> Domain
```

---

## 4. Diagramme de séquence — soumettre un essai

Scénario `POST /api/game/guess` : il illustre le flux 3-tier complet **et** la
mesure anti-triche (décompte des essais côté serveur, mot jamais renvoyé).

```mermaid
sequenceDiagram
  actor J as Joueur
  participant W as Front (React)
  participant MW as authenticate (JWT)
  participant C as GamesController
  participant S as GamesService
  participant R as GamesRepository
  participant D as domain.evaluateGuess
  participant DB as PostgreSQL

  J->>W: saisit un mot + Entrée
  W->>MW: POST /api/game/guess { guess }  (cookie httpOnly)
  MW->>MW: vérifie & décode le JWT → userId
  alt cookie absent ou invalide
    MW-->>W: 401 Unauthorized
  end
  MW->>C: next(userId)
  C->>C: valide guess (zod : 5 lettres)
  C->>S: submitGuess(userId, guess)
  S->>D: isValidWord(guess) ?
  alt mot hors liste
    S-->>C: HttpError 400 invalid_word
    C-->>W: 400
  end
  S->>R: ensureWordAndGame(userId)
  R->>DB: SELECT mot du jour / partie (SQL paramétré)
  DB-->>R: word, game
  R-->>S: { word, game }
  S->>R: countGuesses(gameId)
  R->>DB: SELECT count(*)
  DB-->>R: count
  R-->>S: count
  S->>S: vérifie count < 6 et status = in_progress
  S->>D: evaluateGuess(guess, word)
  D-->>S: result[] (correct / present / absent)
  S->>R: insertGuess(gameId, n, guess, result)
  R->>DB: INSERT (SQL paramétré)
  S->>S: calcule le nouveau status (won / lost / in_progress)
  opt partie terminée
    S->>R: updateGameStatus(gameId, status)
    R->>DB: UPDATE
  end
  S-->>C: { result, status }   %% le mot n'est JAMAIS renvoyé
  C-->>W: 200 { result, status }
  W-->>J: affiche les couleurs des lettres
```

---

## Correspondance avec les blocs CDA

| Diagramme | Compétence couverte |
|-----------|---------------------|
| Cas d'utilisation | BC02 — analyser le besoin |
| Paquets | BC02 — définir l'architecture logicielle en couches |
| Classes (entités) | BC02 — concevoir la base de données relationnelle |
| Classes (couches) | BC01/BC02 — composants métier et d'accès aux données |
| Séquence | BC01 — composants métier ; illustration de l'anti-triche |
