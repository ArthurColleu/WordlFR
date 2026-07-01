# CI/CD, déploiement & sécurité — WordlFR (CDA RNCP 37873)

> Document de synthèse (compétences **BC03** — déploiement/DevOps — et **BC01/BC02**
> — sécurité). Il décrit l'existant et cite les fichiers réels ; les documents
> détaillés restent [`deploiement.md`](deploiement.md) et [`securite-owasp.md`](securite-owasp.md).

---

## 1. Intégration continue (CI)

Fichier : [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Job | Étapes | But |
|-----|--------|-----|
| **api** | `npm ci` → `tsc --noEmit` (type-check) → `npm test` | garantir que le back compile et que **56 tests** passent |
| **web** | `npm ci` → `npm run build` | garantir que le front type-check et build |

- **Runner** : `ubuntu-latest`, **Node 22**, cache npm par `package-lock.json`.
- **Déclencheurs** : push sur `main` et `feat/**`, + toute Pull Request vers `main`.
- **Règle** : un job en échec **bloque le merge** → aucune régression n'atteint `main`.

```
push / PR ─▶ GitHub Actions ─┬─ api : tsc + vitest (56 tests)
                             └─ web : vite build
                       tout vert ? ─▶ merge autorisé ─▶ déploiement
```

## 2. Déploiement continu (CD) & production

- **Plateforme** : Render, décrit en *Infrastructure as Code* dans [`render.yaml`](../render.yaml).
- **Auto-Deploy** : chaque push sur `main` déclenche build + déploiement.
- **Topologie** : 1 service web Node (API Express **+** SPA React servie par Express)
  + **PostgreSQL managé**, région Frankfurt (UE).
- **Build** : `npm ci --include=dev` (web + api) → `vite build` + `tsc` → copie des
  migrations SQL dans `dist`.
- **Run** : `node apps/api/dist/server.js` (migrations + seed au démarrage).
- **Health check** : `/api/health` — le trafic n'est ouvert qu'une fois la base joignable.
- **Secrets** : `JWT_SECRET`, `ADMIN_PASSWORD` générés par Render (`generateValue`).

> Procédure pas-à-pas + variante Docker Compose : [`deploiement.md`](deploiement.md) §2.
> Diagramme de déploiement : [`diagrammes-uml.md`](diagrammes-uml.md) §5.

## 3. Authentification — JWT + bcrypt

### bcrypt — [`lib/password.ts`](../apps/api/src/lib/password.ts)
- `bcryptjs` (implémentation pure JS, sans binaire natif), **facteur de coût 10**.
- `hashPassword` à l'inscription, `verifyPassword` à la connexion. Le mot de passe
  en clair n'est **jamais** stocké ni journalisé.

### JWT — [`lib/jwt.ts`](../apps/api/src/lib/jwt.ts) + [`auth.controller.ts`](../apps/api/src/modules/auth/auth.controller.ts)
- Signature HS256, payload `{ sub, role }`, **expiration 7 jours**, secret via l'env.
- Vérification stricte : un payload au mauvais type est rejeté (`verifyToken → null`).
- Transport par **cookie** :

```ts
res.cookie("token", token, {
  httpOnly: true,                          // inaccessible au JS → anti-XSS
  sameSite: "strict",                      // non envoyé en cross-site → anti-CSRF
  secure: env.NODE_ENV === "production",   // HTTPS uniquement en prod
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

- `authenticate` lit le cookie et pose `req.user` ; `authorize("admin")` filtre par rôle.
  Le `user_id` provient **du token signé**, jamais du client (anti-usurpation).

## 4. Rate limiting

### 4.1 Existant — store en mémoire
Fichier : [`middlewares/rateLimit.ts`](../apps/api/src/middlewares/rateLimit.ts)

```ts
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,   // fenêtre de 15 minutes
  limit: 10,                  // 10 tentatives max
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },   // → HTTP 429
});
```

- Appliqué sur `POST /api/auth/login` pour freiner le **bruteforce** (OWASP A07).
- **Store en mémoire** (par process). Sur le déploiement actuel (**1 instance** Render),
  c'est **suffisant et correct**.

### 4.2 Limite du store mémoire
Le compteur est **local à chaque instance**. En **scalabilité horizontale**
(plusieurs instances derrière un load-balancer), chaque instance aurait son propre
compteur → un attaquant réparti sur N instances multiplierait la limite par N.
Il faut alors un **compteur partagé**.

### 4.3 Évolution — rate limiting distribué avec Redis
Store partagé via `rate-limit-redis` + `ioredis`, avec **repli mémoire** si aucune
URL Redis n'est fournie (pratique en dev/CI) :

```ts
// évolution proposée — apps/api/src/middlewares/rateLimit.ts
import rateLimit, { type Store } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

let store: Store | undefined;                 // undefined ⇒ store mémoire par défaut
if (env.REDIS_URL) {
  const client = new Redis(env.REDIS_URL);
  store = new RedisStore({ sendCommand: (...args) => client.call(...args) });
}

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },
  store,                                       // partagé entre toutes les instances
});
```

Ajouts d'infrastructure correspondants :

```yaml
# render.yaml — ajouter un Redis managé
services:
  - type: keyvalue           # Render Key Value (Redis)
    name: wordlfr-redis
    plan: free
# … et injecter son URL dans le service web :
      - key: REDIS_URL
        fromService: { type: keyvalue, name: wordlfr-redis, property: connectionString }
```
```yaml
# docker-compose.yml — service equivalent
  redis:
    image: redis:7-alpine
    restart: unless-stopped
```

> **Décision retenue** : on **conserve le store mémoire** tant que le déploiement
> reste mono-instance (simplicité, zéro coût), et Redis est documenté comme
> **axe d'évolution** activable sans refonte (une variable `REDIS_URL` suffit).

## 5. OWASP Top 10 (synthèse)

Détail complet : [`securite-owasp.md`](securite-owasp.md).

| Risque | Mesure dans WordlFR | Preuve |
|--------|---------------------|--------|
| A01 — Contrôle d'accès | `user_id` issu du JWT signé ; `authorize("admin")` | `words.test.ts` (403) |
| A02 — Crypto | bcrypt (coût 10) ; JWT signé ; cookie `secure` en prod | `auth.test.ts` |
| A03 — Injection | **SQL 100 % paramétré** ; validation **zod** | `*.repository.ts` |
| A05 — Mauvaise config | `helmet`, CORS restreint, secrets hors du code | `app.ts` |
| A07 — Auth/Identification | rate-limit login (429), cookie httpOnly | `rateLimit.ts` |
| Logique métier | anti-triche : mot jamais exposé, décompte serveur | `game.test.ts` |

---

## 6. Correspondance blocs CDA

| Sujet | Bloc |
|-------|------|
| CI (GitHub Actions) | BC03 — démarche DevOps |
| CD / déploiement Render | BC03 — préparer et documenter le déploiement |
| JWT + bcrypt, OWASP | BC01/BC02 — développer une application **sécurisée** |
| Rate limiting (mémoire → Redis) | BC02/BC03 — architecture & montée en charge |
