# Documentation de déploiement — WordlFR

## 1. Architecture de déploiement

```
Internet
    │
    ▼
┌─────────────┐    Port 80
│  nginx (web)│◄─── utilisateur
│  SPA React  │
└──────┬──────┘
       │ /api/* proxy
       ▼
┌─────────────┐    Port 3001
│   api       │
│   Express   │
└──────┬──────┘
       │ TCP 5432
       ▼
┌─────────────┐
│   db        │
│ PostgreSQL  │
│   (volume)  │
└─────────────┘
```

## 2. Démarrage (Docker Compose)

### 2.1 Prérequis

- Docker Engine 24+ et Docker Compose v2
- Port 8080 et 3001 disponibles

### 2.2 Procédure

```bash
git clone <repo>
cd WordlFR

# 1. Copier et configurer les variables d'environnement
cp .env.example .env
nano .env   # Définir JWT_SECRET, ADMIN_PASSWORD, POSTGRES_PASSWORD

# 2. Construire et démarrer
docker compose up --build -d

# 3. Vérifier que tout est sain
docker compose ps
curl http://localhost:3001/api/health
# → {"status":"ok","db":true}

# 4. Accéder à l'application
open http://localhost:8080
```

### 2.3 Mise à jour

```bash
git pull
docker compose up --build -d
```

Les migrations SQL sont appliquées automatiquement au démarrage de l'API (via `migrate.ts`).

### 2.4 Déploiement cloud managé (Render) — environnement de production

L'application est déployée en production sur **Render** via un *Blueprint* (Infrastructure as Code) décrit dans `render.yaml` à la racine. Un seul service web Node héberge à la fois l'API Express et le build statique du front (servi par Express en `NODE_ENV=production`), connecté à une base PostgreSQL managée.

**URL de production : https://wordlfr.onrender.com**

```
Internet (HTTPS, TLS Render)
        │
        ▼
┌──────────────────────────┐
│  Service web "wordlfr"   │   node apps/api/dist/server.js
│  Express + SPA React     │   (static + /api/*)
└────────────┬─────────────┘
             │ réseau privé Render
             ▼
┌──────────────────────────┐
│  PostgreSQL "wordlfr-db" │   managé, région Frankfurt (UE)
└──────────────────────────┘
```

**Procédure (3 clics) :**

1. Sur [render.com](https://render.com) → **New** → **Blueprint**.
2. Sélectionner le dépôt GitHub `WordlFR` (branche `main`).
3. Render lit `render.yaml`, provisionne la base + le service, puis **Apply**.

**Ce que `render.yaml` automatise :**

| Élément | Valeur |
|---------|--------|
| Build | `npm ci --include=dev` (web + api) puis build Vite + `tsc` |
| Start | `node apps/api/dist/server.js` (migrations + seed au boot) |
| `DATABASE_URL` | injecté automatiquement depuis la base managée |
| `JWT_SECRET` | généré aléatoirement par Render (`generateValue`) |
| `ADMIN_PASSWORD` | généré aléatoirement (à récupérer dans l'onglet *Environment*) |
| Health check | `/api/health` — Render n'ouvre le trafic qu'une fois la base joignable |
| Région | Frankfurt (UE) — cohérent avec la note RGPD |

> **Note d'éco-conception / coût :** l'offre gratuite met l'instance en veille après inactivité ; le premier appel la réveille (~30 s). Acceptable pour une démo CDA, à passer en plan payant pour une vraie production.

### 2.5 Régénérer la liste de mots du jeu

Le jeu s'appuie sur **deux listes** (`apps/api/src/domain/`), à la manière du vrai Wordle :

| Fichier | Rôle | Taille |
|---------|------|--------|
| `dictionary.ts` → `DICTIONARY` | **Réponses** possibles (mot du jour) — mots courants curés à la main | ~435 |
| `guesses.ts` → `GUESSES` | **Essais acceptés** (ce que le joueur peut taper) — généré | ~5 900 |

`guesses.ts` est **généré** à partir du paquet open-source [`an-array-of-french-words`](https://www.npmjs.com/package/an-array-of-french-words) (dérivé du dictionnaire Hunspell FR, sans noms propres). Procédure de régénération :

```bash
# Dans un dossier temporaire
npm install an-array-of-french-words
# Filtrer : mots de 5 lettres, minuscules, accents retirés (NFD), [a-z] uniquement,
# retirer une petite liste de termes grossiers, puis fusionner avec DICTIONARY
# (garantit que toute réponse reste un essai valide) et écrire guesses.ts.
```

Un test automatisé (`dictionary.test.ts`) vérifie l'invariant clé : **toute réponse de `DICTIONARY` est présente dans `GUESSES`** (sinon le mot du jour serait impossible à taper).

> Pour **ajouter des réponses** : éditer `DICTIONARY` dans `dictionary.ts` (5 lettres, sans accents). Pour **élargir les essais acceptés** : régénérer `guesses.ts`.

## 3. Variables d'environnement

| Variable | Obligatoire | Défaut | Description |
|----------|------------|--------|-------------|
| `JWT_SECRET` | **oui** | — | Secret de signature JWT (min 32 caractères aléatoires) |
| `POSTGRES_PASSWORD` | non | `wordle` | Mot de passe PostgreSQL |
| `ADMIN_EMAIL` | non | `admin@wordle.local` | Email du compte admin créé au démarrage |
| `ADMIN_PASSWORD` | non | `changeme123` | Mot de passe du compte admin |

### Générer un JWT_SECRET sécurisé

```bash
openssl rand -base64 48
```

## 4. Santé et monitoring

```bash
# Healthcheck intégré (Docker attend ce healthcheck avant de marquer le service "healthy")
curl http://localhost:3001/api/health
# {"status":"ok","db":true}

# Logs
docker compose logs api --tail=50 --follow
docker compose logs db --tail=50
```

## 5. Sauvegarde des données

```bash
# Dump PostgreSQL
docker compose exec db pg_dump -U wordle wordle > backup_$(date +%Y%m%d).sql

# Restauration
docker compose exec -T db psql -U wordle wordle < backup_YYYYMMDD.sql
```

## 6. Développement local (sans Docker)

### API

```bash
cd apps/api
npm install
DATABASE_URL=postgres://wordle:wordle@localhost:5432/wordle \
JWT_SECRET=dev-secret-change-me \
npm run dev
```

### Frontend

```bash
cd apps/web
npm install
npm run dev    # Proxy /api → http://localhost:3001 (cf. vite.config.ts)
```

## 7. CI/CD (GitHub Actions)

Le pipeline `.github/workflows/ci.yml` s'exécute sur chaque push et pull request :

1. **api job** : `npm ci` → TypeScript type-check → `npm test` (51 tests, pg-mem, sans Docker)
2. **web job** : `npm ci` → `npm run build` (type-check + vite build)

Toute erreur dans l'un ou l'autre job bloque le merge.

## 8. Checklist déploiement production

- [ ] `JWT_SECRET` est un secret aléatoire d'au moins 32 caractères
- [ ] `ADMIN_PASSWORD` changé (pas la valeur par défaut)
- [ ] `POSTGRES_PASSWORD` changé
- [ ] Certificat TLS configuré (nginx reverse proxy ou Traefik)
- [ ] `CORS_ORIGIN` mis à jour avec le domaine de production
- [ ] Logs centralisés (ex. Loki, CloudWatch)
- [ ] Sauvegarde automatique de la base configurée
