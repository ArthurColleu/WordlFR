# Dossier de projet — Concepteur Développeur d'Applications (RNCP 37873)

> **Projet : WordlFR — jeu de lettres quotidien full-stack**
> Candidat : Arthur Colleu
> Titre visé : Concepteur Développeur d'Applications (niveau 6 — RNCP 37873)
>
> Ce document est la **trame structurée** du dossier professionnel. Il agrège et référence les documents techniques détaillés (`docs/`) et signale par `[À COMPLÉTER]` les éléments personnels à rédiger par le candidat (contexte, captures d'écran, page de garde).

---

## 0. Page de garde et sommaire

`[À COMPLÉTER]` — Page de garde : nom, prénom, titre visé, session, centre de formation, organisme certificateur, date de soutenance.

Sommaire paginé (à générer une fois le dossier exporté en PDF / traitement de texte).

---

## 1. Liste des compétences couvertes par le projet

Le projet WordlFR couvre **l'intégralité des trois blocs** du référentiel RNCP 37873.

### BC01 — Développer une application sécurisée
| Compétence | Où c'est démontré dans le projet |
|------------|----------------------------------|
| Installer et configurer son environnement de travail | Monorepo `apps/api` + `apps/web`, TypeScript, Vite, ESLint/oxlint, scripts npm, Docker — §5 |
| Développer des interfaces utilisateur | Front React/Vite : pages Login, Register, Game, Stats, Admin ; composants `GameBoard`, `Keyboard`, `Toast` ; accessibilité RGAA — §7.1 |
| Développer des composants métier | Logique de jeu pure (`evaluateGuess`, `computeStats`, dictionnaire), service jeu anti-triche — §7.2 |
| Contribuer à la gestion d'un projet informatique | Gestion de versions Git/GitHub, branches, Pull Request, CI, suivi de tâches — §4 |

### BC02 — Concevoir et développer une application organisée en couches
| Compétence | Où c'est démontré dans le projet |
|------------|----------------------------------|
| Analyser le besoin et maquetter une application | Cahier des charges, maquettes/wireframes, parcours utilisateur — §3, `docs/maquettes.md` |
| Définir l'architecture logicielle | Architecture 3-tier (routes → contrôleurs → services → repositories) — §6, `docs/cahier-des-charges.md` |
| Concevoir et mettre en place une base de données relationnelle | MCD / MLD, contraintes, index, `ON DELETE CASCADE` — §6.2, `docs/mcd-mld.md` |
| Développer des composants d'accès aux données | Repositories SQL **100 % paramétrés** (`pg`), migrations — §7.3 |

### BC03 — Préparer le déploiement d'une application sécurisée
| Compétence | Où c'est démontré dans le projet |
|------------|----------------------------------|
| Préparer et exécuter les plans de tests | 51 tests unitaires + intégration (Vitest, Supertest, pg-mem) — §8, `docs/plan-de-tests.md` |
| Préparer et documenter le déploiement | Docker Compose, Dockerfiles multi-stage, `render.yaml`, doc de déploiement — §9, `docs/deploiement.md` |
| Contribuer à la mise en production (DevOps) | CI GitHub Actions, déploiement continu Render, healthcheck — §9 |

---

## 2. Résumé du projet (FR + EN)

### En français
WordlFR est une réimplémentation full-stack du jeu *Wordle* en français : chaque jour, le joueur dispose de six essais pour deviner un mot de cinq lettres. L'application gère l'authentification des joueurs, le suivi de leurs statistiques, et une interface d'administration des mots du jour. L'enjeu technique central est l'**anti-triche** : le mot à deviner n'est jamais transmis au navigateur, et le décompte des essais fait autorité côté serveur.

### In English (situation de travail en anglais — exigée par le référentiel)
WordlFR is a full-stack reimplementation of the *Wordle* game in French. Each day, players get six attempts to guess a five-letter word. The application handles player authentication, personal statistics, and an admin interface to manage the daily words. The core technical challenge is **anti-cheating**: the target word is never sent to the browser, and the attempt count is authoritative on the server side. The stack is a three-tier Express/TypeScript API backed by PostgreSQL, with a Vite/React front end, tested with Vitest and Supertest, containerised with Docker and continuously deployed to Render.

`[À COMPLÉTER]` — Étendre la partie anglaise si le jury attend une présentation orale de 5 min en anglais (cf. §11).

---

## 3. Expression des besoins et cahier des charges

> Document détaillé : [`docs/cahier-des-charges.md`](cahier-des-charges.md)

### 3.1 Contexte
`[À COMPLÉTER]` — Contexte de réalisation (projet de formation / entreprise / personnel). Préciser la commande, les acteurs, les contraintes.

### 3.2 Besoins fonctionnels (synthèse)
- Un visiteur peut **créer un compte** et **se connecter**.
- Un joueur authentifié peut **jouer la partie du jour** (6 essais, retour coloré par lettre).
- Un joueur peut **consulter ses statistiques** (parties jouées, taux de réussite, séries, distribution des essais).
- Un administrateur peut **gérer les mots du jour** (CRUD).
- Le joueur peut **supprimer son compte** (droit à l'oubli RGPD).

### 3.3 Besoins non fonctionnels
- **Sécurité** : mots de passe hachés (bcrypt), JWT en cookie httpOnly, SQL paramétré, anti-triche.
- **Accessibilité** : conformité RGAA (navigation clavier, ARIA, contrastes).
- **Performance / éco-conception** : bundle léger, requêtes SQL indexées (cf. `docs/green-it.md`).
- **Conformité RGPD** : minimisation des données, droit d'accès et d'effacement (cf. `docs/rgpd.md`).

### 3.4 Critères d'acceptation
Voir le tableau de critères dans [`docs/cahier-des-charges.md`](cahier-des-charges.md) et le jeu d'essai §8.

---

## 4. Gestion de projet

### 4.1 Méthodologie
> Détail et comparaison (cycle en V vs Agile) : [`methodologie.md`](methodologie.md)

Développement **itératif et incrémental**, organisé en phases livrables :
1. Fondations (monorepo, base de données, authentification)
2. Cœur de jeu (anti-triche, évaluation, persistance des essais)
3. Statistiques et administration
4. Interface utilisateur (front React)
5. Industrialisation (tests, Docker, CI, déploiement)

### 4.2 Outils
- **Gestion de versions** : Git + GitHub. Branche de fonctionnalité `feat/cda-fullstack`, intégration dans `main` via **Pull Request** (revue + merge commit traçable).
- **Intégration continue** : GitHub Actions (`.github/workflows/ci.yml`) — type-check + tests à chaque push/PR.
- **Suivi des tâches** : découpage en tâches livrables suivies tout au long du projet.

`[À COMPLÉTER]` — Insérer une capture de l'historique Git (`git log --graph`) et/ou du tableau de tâches comme preuve de la compétence « contribuer à la gestion d'un projet ».

### 4.3 Planning
`[À COMPLÉTER]` — Diagramme de Gantt ou planning prévisionnel/réel des phases ci-dessus.

---

## 5. Environnement de développement (BC01)

| Catégorie | Outils |
|-----------|--------|
| Langage | TypeScript (front + back) |
| Runtime | Node.js 22 |
| Front | Vite, React, Tailwind CSS v4 |
| Back | Express, `pg`, `zod`, `jsonwebtoken`, `bcryptjs`, `helmet`, `cors` |
| Qualité | TypeScript strict, oxlint/ESLint |
| Tests | Vitest, Supertest, pg-mem |
| Conteneurisation | Docker, Docker Compose |
| CI/CD | GitHub Actions, Render |
| Versioning | Git / GitHub |

Organisation **monorepo** : `apps/api` (backend) et `apps/web` (frontend), chacun avec son `package.json`, ses scripts et sa configuration TypeScript.

`[À COMPLÉTER]` — Capture de l'IDE (VS Code) avec l'arborescence du projet.

---

## 6. Conception (BC02)

### 6.1 Architecture logicielle — 3-tier en couches
> Détail : [`docs/cahier-des-charges.md`](cahier-des-charges.md)

```
Navigateur (React/Vite)
        │ HTTP/JSON (fetch, credentials: include)
        ▼
Routes Express ──► Contrôleurs ──► Services (logique métier) ──► Repositories (SQL)
                                                                      │
                                                                      ▼
                                                                 PostgreSQL
```

Règle d'or respectée : **le SQL n'existe que dans la couche repository**. Les services ne connaissent pas la base ; les contrôleurs ne connaissent que les services. Cela rend la logique métier testable sans base réelle (via pg-mem) et isole les changements de persistance.

### 6.2 Base de données relationnelle
> Détail (MCD, MLD, justifications) : [`docs/mcd-mld.md`](mcd-mld.md)

Entités : `users`, `daily_words`, `games`, `guesses`.
Points de conception clés :
- Intégrité référentielle par clés étrangères et `ON DELETE CASCADE` (suppression de compte → suppression des parties et essais — support du droit à l'oubli).
- Index sur les colonnes de jointure (`games.user_id`, `guesses.game_id`).
- Stockage du résultat d'un essai en **JSONB** (tableau de 5 états) plutôt que 5 colonnes.

### 6.3 Maquettes
> Détail : [`docs/maquettes.md`](maquettes.md)

`[À COMPLÉTER]` — Remplacer/compléter les wireframes ASCII par des captures d'écran de l'application réelle (page de jeu, statistiques, admin).

---

## 7. Réalisation (extraits de code commentés)

> Pour la soutenance, sélectionner 3–4 extraits courts et les commenter à l'oral. Les chemins ci-dessous pointent vers le code source réel.

### 7.1 Interface utilisateur (BC01)
- `apps/web/src/pages/Game.tsx` — orchestration de la partie, gestion du clavier physique et virtuel, états des lettres.
- `apps/web/src/components/game/GameTile.tsx` — animation de retournement 3D (CSS `transform-style: preserve-3d`).
- Accessibilité : `lang="fr"`, `aria-live` pour les annonces, `role="alert"/"status"`, skip-link, navigation clavier.

### 7.2 Composants métier (BC01)
- `apps/api/src/domain/evaluateGuess.ts` — algorithme d'évaluation d'un essai (gestion des lettres correctes / présentes / absentes, y compris doublons).
- `apps/api/src/domain/stats.ts` — fonction **pure** `computeStats` (séries en cours/max, taux de réussite, distribution) — entièrement testée unitairement.
- `apps/api/src/modules/games/games.service.ts` — **anti-triche** : le nombre d'essais est relu en base, le mot n'est jamais retourné au client.

### 7.3 Accès aux données — SQL paramétré (BC02)
- `apps/api/src/modules/**/**.repository.ts` — toutes les requêtes utilisent des paramètres liés (`$1, $2, …`), **jamais** de concaténation de chaînes → protection contre l'injection SQL (OWASP A03).
- `apps/api/src/db/migrate.ts` — exécution ordonnée des migrations `.sql`.

### 7.4 Sécurité applicative
- `apps/api/src/lib/password.ts` — hachage bcrypt.
- `apps/api/src/lib/jwt.ts` + `apps/api/src/modules/auth/auth.controller.ts` — JWT signé, posé en cookie `httpOnly`, `SameSite=Strict`, `secure` en production.
- `apps/api/src/middlewares/authenticate.ts` / `authorize` — contrôle d'accès, `user_id` issu du token signé (jamais du client).

---

## 8. Plan de tests et jeu d'essai (BC03)

> Détail : [`docs/plan-de-tests.md`](plan-de-tests.md)

- **51 tests** automatisés, tous au vert.
- **Unitaires** : logique de jeu, dictionnaire, statistiques, hachage, JWT.
- **Intégration** (Supertest + pg-mem, sans Docker) : authentification, parcours de jeu complet, statistiques, administration des mots.
- **Tests de sécurité ciblés** : vérification que le mot n'apparaît **dans aucune réponse**, que la limite de 6 essais est imposée côté serveur, qu'un joueur ne voit que ses données.

`[À COMPLÉTER]` — Tableau de jeu d'essai (entrée → résultat attendu → résultat obtenu) pour la démonstration en soutenance, avec captures.

---

## 9. Déploiement et DevOps (BC03)

> Détail : [`docs/deploiement.md`](deploiement.md)

- **Conteneurisation** : Dockerfiles multi-stage (build → runtime Alpine), `docker-compose.yml` (db + api + web) avec healthchecks et volume persistant.
- **CI** : GitHub Actions — type-check + 51 tests à chaque push/PR ; tout échec bloque le merge.
- **CD / production** : déploiement sur **Render** via `render.yaml` (Infrastructure as Code) — service web Node (API + SPA) + PostgreSQL managé, healthcheck `/api/health`, secrets générés automatiquement.
- **URL de production : https://wordlfr.onrender.com**

---

## 10. Sécurité — synthèse OWASP

> Détail : [`docs/securite-owasp.md`](securite-owasp.md)

| Risque OWASP | Mesure dans WordlFR |
|--------------|---------------------|
| A01 — Contrôle d'accès | `user_id` issu du JWT signé ; middleware `authorize` pour l'admin |
| A02 — Défaillances cryptographiques | bcrypt pour les mots de passe ; JWT signé ; cookie `secure` en prod |
| A03 — Injection | SQL 100 % paramétré ; validation des entrées par `zod` |
| A05 — Mauvaise configuration | `helmet`, CORS restreint, secrets hors du code |
| A07 — Authentification | rate-limit sur le login, cookie httpOnly |
| Logique métier | anti-triche : mot jamais exposé, décompte serveur-autoritaire |

---

## 11. Présentation en anglais

`[À COMPLÉTER]` — Préparer ~5 minutes : présenter l'architecture, la décision anti-triche, et une difficulté technique résolue (ex. la limitation de pg-mem sur le cast de dates). Le résumé anglais du §2 sert d'amorce.

---

## 12. Veille technologique

`[À COMPLÉTER]` — Décrire la démarche de veille mise en œuvre pendant le projet :
- Sources suivies (ex. documentation officielle Node/Express/React, OWASP, MDN, releases GitHub).
- Exemple concret de veille appliquée : choix de **Tailwind CSS v4** (nouveau moteur, configuration par `@import` au lieu de `tailwind.config`), ou usage de **pg-mem** pour tester sans base réelle.
- Méthode de tri / fiabilité des sources.

---

## 13. Conclusion et bilan

`[À COMPLÉTER]` — Bilan personnel : compétences consolidées, difficultés rencontrées (ex. compatibilité pg-mem, déploiement Render et copie des migrations dans `dist`), axes d'amélioration (cache Redis, tests E2E, export RGPD des données).

### Axes d'évolution déjà identifiés
- Tests end-to-end (Playwright) sur le parcours de jeu.
- Endpoint d'export des données personnelles (`GET /api/auth/me/export`) pour le droit à la portabilité.
- Cache de la partie du jour (mutualisable entre joueurs).

---

## Annexes — index des documents techniques

| Document | Contenu |
|----------|---------|
| [`cahier-des-charges.md`](cahier-des-charges.md) | Contexte, fonctionnalités, contraintes, critères d'acceptation |
| [`methodologie.md`](methodologie.md) | Méthodologie (cycle en V vs Agile), itérations, traçabilité |
| [`mcd-mld.md`](mcd-mld.md) | Modèles de données : MCD, MLD **et MPD** |
| [`diagrammes-uml.md`](diagrammes-uml.md) | Cas d'utilisation, paquets, classes, séquence, déploiement |
| [`maquettes.md`](maquettes.md) | Palette, wireframes, responsive |
| [`plan-de-tests.md`](plan-de-tests.md) | Tests unitaires, intégration, manuels et résultats |
| [`preuves-api.md`](preuves-api.md) | Preuves API mappées aux compétences RNCP |
| [`deploiement.md`](deploiement.md) | Docker, Render, variables, CI/CD, checklist prod |
| [`ci-cd-securite.md`](ci-cd-securite.md) | Synthèse CI/CD, JWT+bcrypt, rate limiting (mémoire→Redis), OWASP |
| [`securite-owasp.md`](securite-owasp.md) | Couverture OWASP Top 10 |
| [`green-it.md`](green-it.md) | Éco-conception |
| [`rgpd.md`](rgpd.md) | Conformité RGPD |
