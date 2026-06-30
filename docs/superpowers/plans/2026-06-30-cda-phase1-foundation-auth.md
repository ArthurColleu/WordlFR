# CDA Phase 1 — Backend Foundation + Database + Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stand up the monorepo and a layered Express + TypeScript API with a PostgreSQL data layer (parameterized SQL) and a secure JWT/bcrypt authentication module, fully tested with Vitest (unit) and Supertest + pg-mem (integration).

**Architecture:** 3-tier. This phase builds the backend skeleton: `routes → controller → service → repository (parameterized SQL) → Postgres`. Pure domain logic lives in `src/domain`. Tests run against `pg-mem` (in-memory Postgres) so no external DB is needed during development/CI; production uses real Postgres.

**Tech Stack:** Node 24, Express 4, TypeScript, `pg`, `bcryptjs`, `jsonwebtoken`, `zod`, `helmet`, `cookie-parser`, `cors`, `express-rate-limit`; dev: `tsx`, `vitest`, `supertest`, `pg-mem`.

## Global Constraints

- Language: TypeScript everywhere, `"strict": true`.
- Layering is mandatory: HTTP concerns only in controllers/routes; business rules in services; ALL SQL only in repositories; no SQL outside `repository` files.
- **Every SQL query MUST be parameterized** (`$1, $2, …`) — never string-interpolate values into SQL (OWASP A03).
- Passwords hashed with `bcryptjs` (cost ≥ 10). Never store or log plaintext passwords.
- JWT stored in an **httpOnly cookie** named `token`, `SameSite=strict`, `Secure` when `NODE_ENV=production`. The client never reads the token.
- Error responses are JSON `{ error: string }` with a coherent HTTP status. No stack traces in responses.
- Use `bcryptjs` and `pg` (both pure-JS, no native build) — do NOT use `bcrypt` (native).
- All API routes are mounted under `/api`.
- Node module type: ESM (`"type": "module"` in apps/api/package.json); TypeScript compiled/run via `tsx`.

---

## Task 1: Monorepo & API scaffold

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/vitest.config.ts`
- Create: `apps/api/src/server.ts` (placeholder), `apps/api/.gitignore`
- Create: root `.gitignore` additions
- Remove (legacy Next.js app): `app/`, `middleware.ts`, `next.config.mjs`, `next-env.d.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `tsconfig.json` (root), `package.json` (root), `package-lock.json` (root), `.eslintrc.json`, `vitest.config.ts` (root), `lib/supabase/`, `supabase/`. KEEP: `docs/`, `lib/dictionary.ts`, `lib/game.ts` (ported in Task 2), `README.md` (rewritten later).

**Interfaces:**
- Produces: a buildable `apps/api` TypeScript project; `npm --prefix apps/api run build` and `npm --prefix apps/api test` succeed.

- [ ] **Step 1: Preserve the two reusable domain files, then remove the legacy Next.js app**

```bash
mkdir -p apps/api/src/domain
git mv lib/game.ts apps/api/src/domain/_legacy-game.ts
git mv lib/dictionary.ts apps/api/src/domain/_legacy-dictionary.ts
git rm -r --quiet app middleware.ts next.config.mjs next-env.d.ts postcss.config.mjs tailwind.config.ts tsconfig.json package.json package-lock.json .eslintrc.json vitest.config.ts lib supabase 2>/dev/null || true
```
(If a path is already gone, ignore the error. The goal: repo root no longer contains a Next.js app; `docs/` remains; the two `_legacy-*.ts` files are staged under `apps/api/src/domain`.)

- [ ] **Step 2: Create `apps/api/package.json`**

```json
{
  "name": "@wordle-cda/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.10.0",
    "@types/pg": "^8.11.10",
    "@types/supertest": "^6.0.2",
    "pg-mem": "^3.0.5",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Create `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": false
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `apps/api/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    pool: "forks",
  },
});
```

- [ ] **Step 5: Create `apps/api/.gitignore`**

```
node_modules
dist
.env
```

- [ ] **Step 6: Placeholder `apps/api/src/server.ts`**

```ts
// Replaced in Task 5 once the Express app exists.
console.log("api placeholder");
```

- [ ] **Step 7: Install and verify build**

```bash
npm --prefix apps/api install
npm --prefix apps/api run build
```
Expected: install succeeds (all pure-JS deps), `tsc` produces `dist/` with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(api): scaffold monorepo api project; remove legacy Next.js app"
```

---

## Task 2: Domain layer — evaluateGuess, dictionary, fallbackWord (ported + tested)

**Files:**
- Create: `apps/api/src/domain/evaluateGuess.ts`, `apps/api/src/domain/dictionary.ts`, `apps/api/src/domain/fallbackWord.ts`
- Test: `apps/api/src/domain/evaluateGuess.test.ts`, `apps/api/src/domain/fallbackWord.test.ts`, `apps/api/src/domain/dictionary.test.ts`
- Remove: `apps/api/src/domain/_legacy-game.ts`, `apps/api/src/domain/_legacy-dictionary.ts` (after copying their content)

**Interfaces:**
- Produces:
  - `export type LetterState = "correct" | "present" | "absent";`
  - `export function evaluateGuess(guess: string, target: string): LetterState[]`
  - `export function dailyFallbackWord(date: string, dictionary: string[]): string`
  - `export const DICTIONARY: string[]` and `export function isValidWord(word: string): boolean` in `dictionary.ts`

- [ ] **Step 1: Create `apps/api/src/domain/evaluateGuess.ts`** (copy the algorithm from `_legacy-game.ts`, keeping `LetterState` and `evaluateGuess`; drop the old `dailyFallbackWord` — it moves to `fallbackWord.ts`):

```ts
export type LetterState = "correct" | "present" | "absent";

export function evaluateGuess(guess: string, target: string): LetterState[] {
  const g = guess.toLowerCase().split("");
  const t = target.toLowerCase().split("");
  const result: LetterState[] = new Array(g.length).fill("absent");

  const remaining: Record<string, number> = {};
  for (let i = 0; i < t.length; i++) {
    if (g[i] === t[i]) {
      result[i] = "correct";
    } else {
      remaining[t[i]] = (remaining[t[i]] ?? 0) + 1;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === "correct") continue;
    const letter = g[i];
    if (remaining[letter] > 0) {
      result[i] = "present";
      remaining[letter] -= 1;
    }
  }
  return result;
}
```

- [ ] **Step 2: Create `apps/api/src/domain/fallbackWord.ts`**:

```ts
export function dailyFallbackWord(date: string, dictionary: string[]): string {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return dictionary[hash % dictionary.length];
}
```

- [ ] **Step 3: Create `apps/api/src/domain/dictionary.ts`** — copy the `DICTIONARY` array and `isValidWord` from `_legacy-dictionary.ts` verbatim (129 verified 5-letter French words + the Set-backed `isValidWord`).

- [ ] **Step 4: Remove the legacy files**

```bash
git rm apps/api/src/domain/_legacy-game.ts apps/api/src/domain/_legacy-dictionary.ts
```

- [ ] **Step 5: Write the unit tests** — port the verified cases.

`apps/api/src/domain/evaluateGuess.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { evaluateGuess } from "./evaluateGuess";

describe("evaluateGuess", () => {
  it("all correct when guess equals target", () => {
    expect(evaluateGuess("table", "table")).toEqual(["correct","correct","correct","correct","correct"]);
  });
  it("all absent when no letters match", () => {
    expect(evaluateGuess("zzzzz", "table")).toEqual(["absent","absent","absent","absent","absent"]);
  });
  it("present for right letter wrong position", () => {
    expect(evaluateGuess("blate", "table")).toEqual(["present","present","present","present","correct"]);
  });
  it("duplicate letters in guess limited by target count", () => {
    expect(evaluateGuess("eeeee", "ferme")).toEqual(["absent","correct","absent","absent","correct"]);
  });
  it("duplicate handling both directions", () => {
    expect(evaluateGuess("lever", "ferme")).toEqual(["absent","correct","absent","present","present"]);
  });
});
```

`apps/api/src/domain/fallbackWord.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { dailyFallbackWord } from "./fallbackWord";

const dict = ["alpha","bravo","charl","delta","ephes"];

describe("dailyFallbackWord", () => {
  it("is deterministic for the same date", () => {
    expect(dailyFallbackWord("2026-06-30", dict)).toBe(dailyFallbackWord("2026-06-30", dict));
  });
  it("returns a word from the dictionary", () => {
    expect(dict).toContain(dailyFallbackWord("2026-01-01", dict));
  });
  it("varies across dates", () => {
    const set = new Set(["2026-01-01","2026-01-02","2026-01-03","2026-01-04","2026-01-05"].map(d => dailyFallbackWord(d, dict)));
    expect(set.size).toBeGreaterThan(1);
  });
});
```

`apps/api/src/domain/dictionary.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { DICTIONARY, isValidWord } from "./dictionary";

describe("dictionary", () => {
  it("only 5-letter lowercase unaccented words", () => {
    expect(DICTIONARY.length).toBeGreaterThan(100);
    for (const w of DICTIONARY) expect(w).toMatch(/^[a-z]{5}$/);
  });
  it("no duplicates", () => {
    expect(new Set(DICTIONARY).size).toBe(DICTIONARY.length);
  });
  it("validates case-insensitively", () => {
    expect(isValidWord("table")).toBe(true);
    expect(isValidWord("TABLE")).toBe(true);
    expect(isValidWord("zzzzz")).toBe(false);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npm --prefix apps/api test`
Expected: PASS (domain tests green).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(api): port domain logic (evaluateGuess, dictionary, fallbackWord) with tests"
```

---

## Task 3: Config, DB pool, migration runner, users migration, pg-mem test harness

**Files:**
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/db/pool.ts`, `apps/api/src/db/migrate.ts`
- Create: `apps/api/src/db/migrations/0001_users.sql`
- Create: `apps/api/tests/helpers/testDb.ts`
- Test: `apps/api/tests/helpers/testDb.test.ts`

**Interfaces:**
- Consumes: nothing prior.
- Produces:
  - `apps/api/src/config/env.ts` → `export const env` with `{ NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, ADMIN_EMAIL, ADMIN_PASSWORD }` (validated via zod).
  - `apps/api/src/db/pool.ts` → `export type Db = { query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> }` and `export function createPool(connectionString: string): Db` (wraps a real `pg.Pool`).
  - `apps/api/src/db/migrate.ts` → `export async function runMigrations(db: Db): Promise<void>` (reads `migrations/*.sql` in order, executes each).
  - `apps/api/tests/helpers/testDb.ts` → `export async function makeTestDb(): Promise<Db>` (pg-mem backed `Db`, migrations applied). Each call returns a fresh, isolated in-memory DB — tests call it in `beforeEach` for a clean slate (no TRUNCATE needed; pg-mem does not support multi-table TRUNCATE, and per-test fresh DBs are simpler and verified to work).

- [ ] **Step 1: `apps/api/src/config/env.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("postgres://wordle:wordle@localhost:5432/wordle"),
  JWT_SECRET: z.string().min(16).default("dev-secret-change-me-in-production"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  ADMIN_EMAIL: z.string().email().default("admin@wordle.local"),
  ADMIN_PASSWORD: z.string().min(8).default("admin1234"),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
```

- [ ] **Step 2: `apps/api/src/db/pool.ts`**

```ts
import pg from "pg";

export interface Db {
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

export function createPool(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString });
  return {
    async query<T = any>(text: string, params?: unknown[]) {
      const res = await pool.query(text, params as any[]);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
    },
  };
}
```

- [ ] **Step 3: `apps/api/src/db/migrations/0001_users.sql`**

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

- [ ] **Step 4: `apps/api/src/db/migrate.ts`** (reads .sql files in sorted order; works for both real pg and pg-mem)

```ts
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./pool.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function runMigrations(db: Db): Promise<void> {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    await db.query(sql);
  }
}
```

- [ ] **Step 5: `apps/api/tests/helpers/testDb.ts`** (pg-mem-backed Db so integration tests need no real Postgres)

```ts
import { newDb } from "pg-mem";
import type { Db } from "../../src/db/pool.js";
import { runMigrations } from "../../src/db/migrate.js";

// Returns a fresh, isolated in-memory Postgres-compatible DB with all
// migrations applied. Call once per test (beforeEach) for a clean slate.
// (pg-mem verified to support our schema: IDENTITY, FK, CHECK, UNIQUE, JSONB,
// now(), and COUNT(*) FILTER aggregates. It does NOT support multi-table
// TRUNCATE, which is why we use a fresh DB per test instead of truncating.)
export async function makeTestDb(): Promise<Db> {
  const mem = newDb();
  const adapter = mem.adapters.createPg();
  const pool = new adapter.Pool();
  const db: Db = {
    async query<T = any>(text: string, params?: unknown[]) {
      const res = await pool.query(text, params as any[]);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
    },
  };
  await runMigrations(db);
  return db;
}
```

- [ ] **Step 6: Harness test `apps/api/tests/helpers/testDb.test.ts`** (proves pg-mem + migrations + parameterized query work)

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb } from "./testDb";
import type { Db } from "../../src/db/pool";

let db: Db;
beforeEach(async () => { db = await makeTestDb(); });

describe("test db harness", () => {
  it("runs migrations and supports parameterized insert/select", async () => {
    await db.query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", ["a@b.c", "hash"]);
    const { rows } = await db.query<{ email: string; role: string }>("SELECT email, role FROM users WHERE email = $1", ["a@b.c"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("a@b.c");
    expect(rows[0].role).toBe("player");
  });
});
```

- [ ] **Step 7: Run tests**

Run: `npm --prefix apps/api test`
Expected: PASS. If pg-mem rejects `GENERATED ALWAYS AS IDENTITY`, change the column in `0001_users.sql` to `id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY` and re-run; if it rejects `now()` default, it is supported by pg-mem — do not change. Report any pg-mem incompatibility as DONE_WITH_CONCERNS with the exact error.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(api): add config, pg pool, migration runner, users table, pg-mem test harness"
```

---

## Task 4: Security utilities — password hashing & JWT

**Files:**
- Create: `apps/api/src/lib/password.ts`, `apps/api/src/lib/jwt.ts`
- Test: `apps/api/src/lib/password.test.ts`, `apps/api/src/lib/jwt.test.ts`

**Interfaces:**
- Consumes: `env` from `config/env.ts`.
- Produces:
  - `password.ts` → `export async function hashPassword(plain: string): Promise<string>`, `export async function verifyPassword(plain: string, hash: string): Promise<boolean>`
  - `jwt.ts` → `export interface JwtPayload { sub: number; role: "player" | "admin" }`, `export function signToken(payload: JwtPayload): string`, `export function verifyToken(token: string): JwtPayload | null`

- [ ] **Step 1: `apps/api/src/lib/password.ts`**

```ts
import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 2: `apps/api/src/lib/jwt.ts`**

```ts
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  sub: number;
  role: "player" | "admin";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    if (typeof decoded.sub !== "number" || (decoded.role !== "player" && decoded.role !== "admin")) {
      return null;
    }
    return { sub: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Tests**

`apps/api/src/lib/password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes and verifies the correct password", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });
  it("rejects a wrong password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

`apps/api/src/lib/jwt.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./jwt";

describe("jwt", () => {
  it("signs then verifies a payload round-trip", () => {
    const token = signToken({ sub: 42, role: "admin" });
    expect(verifyToken(token)).toEqual({ sub: 42, role: "admin" });
  });
  it("returns null for a tampered token", () => {
    expect(verifyToken("not.a.token")).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm --prefix apps/api test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): add bcrypt password hashing and JWT sign/verify utilities"
```

---

## Task 5: Middlewares, auth module (repository/service/controller/routes), app & server

**Files:**
- Create: `apps/api/src/middlewares/validate.ts`, `errorHandler.ts`, `authenticate.ts`, `authorize.ts`, `rateLimit.ts`
- Create: `apps/api/src/modules/auth/auth.repository.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`
- Create: `apps/api/src/modules/health/health.routes.ts`
- Create: `apps/api/src/app.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Consumes: `Db` (pool.ts), `hashPassword`/`verifyPassword`, `signToken`/`verifyToken`, `env`.
- Produces:
  - `auth.repository.ts` → `export interface UserRow { id: number; email: string; password_hash: string; role: "player"|"admin"; created_at: string }`; `export function makeAuthRepository(db: Db)` returning `{ findByEmail(email): Promise<UserRow|null>; findById(id): Promise<UserRow|null>; create(email, passwordHash, role): Promise<UserRow>; deleteById(id): Promise<void> }`. All SQL parameterized.
  - `auth.service.ts` → `export function makeAuthService(repo)` returning `{ register(email, password): Promise<{id,email,role}>; login(email, password): Promise<{id,email,role}>; me(id): Promise<{id,email,role}|null>; deleteAccount(id): Promise<void> }`. Throws `HttpError` (from errorHandler) on conflicts/invalid credentials.
  - `errorHandler.ts` → `export class HttpError extends Error { constructor(public status: number, message: string) }` and `export function errorHandler(err, req, res, next)`.
  - `authenticate.ts` → Express middleware reading the `token` cookie, setting `req.user = { id, role }`, else 401.
  - `authorize.ts` → `export function authorize(role: "admin")` middleware → 403 if `req.user.role !== role`.
  - `validate.ts` → `export function validate(schema: ZodSchema)` validating `req.body`, 400 on failure.
  - `app.ts` → `export function createApp(db: Db)` returns an Express app (mounts `/api/auth`, `/api/health`, helmet, cors, cookie-parser, json, errorHandler). Exported for Supertest.
  - `server.ts` → builds a real pool, runs migrations, starts listening on `env.PORT`.

- [ ] **Step 1: `apps/api/src/middlewares/errorHandler.ts`**

```ts
import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "server_error" });
}
```

- [ ] **Step 2: `apps/api/src/middlewares/validate.ts`**

```ts
import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "invalid_input" });
    }
    req.body = result.data;
    next();
  };
}
```

- [ ] **Step 3: `apps/api/src/middlewares/authenticate.ts`** (also augments Express Request typing)

```ts
import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: number; role: "player" | "admin" };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.user = { id: payload.sub, role: payload.role };
  next();
}
```

- [ ] **Step 4: `apps/api/src/middlewares/authorize.ts`**

```ts
import type { NextFunction, Request, Response } from "express";

export function authorize(role: "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}
```

- [ ] **Step 5: `apps/api/src/middlewares/rateLimit.ts`**

```ts
import rateLimit from "express-rate-limit";

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },
});
```

- [ ] **Step 6: `apps/api/src/modules/auth/auth.repository.ts`** (ALL parameterized SQL)

```ts
import type { Db } from "../../db/pool.js";

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: "player" | "admin";
  created_at: string;
}

export function makeAuthRepository(db: Db) {
  return {
    async findByEmail(email: string): Promise<UserRow | null> {
      const { rows } = await db.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
      return rows[0] ?? null;
    },
    async findById(id: number): Promise<UserRow | null> {
      const { rows } = await db.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
      return rows[0] ?? null;
    },
    async create(email: string, passwordHash: string, role: "player" | "admin" = "player"): Promise<UserRow> {
      const { rows } = await db.query<UserRow>(
        "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *",
        [email, passwordHash, role],
      );
      return rows[0];
    },
    async deleteById(id: number): Promise<void> {
      await db.query("DELETE FROM users WHERE id = $1", [id]);
    },
  };
}

export type AuthRepository = ReturnType<typeof makeAuthRepository>;
```

- [ ] **Step 7: `apps/api/src/modules/auth/auth.service.ts`**

```ts
import { HttpError } from "../../middlewares/errorHandler.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import type { AuthRepository } from "./auth.repository.js";

export interface PublicUser {
  id: number;
  email: string;
  role: "player" | "admin";
}

export function makeAuthService(repo: AuthRepository) {
  return {
    async register(email: string, password: string): Promise<PublicUser> {
      const existing = await repo.findByEmail(email);
      if (existing) throw new HttpError(409, "email_taken");
      const user = await repo.create(email, await hashPassword(password));
      return { id: user.id, email: user.email, role: user.role };
    },
    async login(email: string, password: string): Promise<PublicUser> {
      const user = await repo.findByEmail(email);
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        throw new HttpError(401, "invalid_credentials");
      }
      return { id: user.id, email: user.email, role: user.role };
    },
    async me(id: number): Promise<PublicUser | null> {
      const user = await repo.findById(id);
      return user ? { id: user.id, email: user.email, role: user.role } : null;
    },
    async deleteAccount(id: number): Promise<void> {
      await repo.deleteById(id);
    },
  };
}

export type AuthService = ReturnType<typeof makeAuthService>;
```

- [ ] **Step 8: `apps/api/src/modules/auth/auth.controller.ts`** (sets the httpOnly cookie)

```ts
import type { Request, Response } from "express";
import { signToken } from "../../lib/jwt.js";
import { env } from "../../config/env.js";
import type { AuthService, PublicUser } from "./auth.service.js";

function setAuthCookie(res: Response, user: PublicUser) {
  const token = signToken({ sub: user.id, role: user.role });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function makeAuthController(service: AuthService) {
  return {
    async register(req: Request, res: Response) {
      const user = await service.register(req.body.email, req.body.password);
      setAuthCookie(res, user);
      res.status(201).json({ user });
    },
    async login(req: Request, res: Response) {
      const user = await service.login(req.body.email, req.body.password);
      setAuthCookie(res, user);
      res.status(200).json({ user });
    },
    async logout(_req: Request, res: Response) {
      res.clearCookie("token");
      res.status(204).end();
    },
    async me(req: Request, res: Response) {
      const user = await service.me(req.user!.id);
      if (!user) return res.status(401).json({ error: "unauthorized" });
      res.json({ user });
    },
    async deleteMe(req: Request, res: Response) {
      await service.deleteAccount(req.user!.id);
      res.clearCookie("token");
      res.status(204).end();
    },
  };
}
```

Note: controllers are wrapped by an async error forwarder in routes (Step 9) so thrown `HttpError`s reach `errorHandler`.

- [ ] **Step 9: `apps/api/src/modules/auth/auth.routes.ts`**

```ts
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../../db/pool.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { loginRateLimit } from "../../middlewares/rateLimit.js";
import { makeAuthRepository } from "./auth.repository.js";
import { makeAuthService } from "./auth.service.js";
import { makeAuthController } from "./auth.controller.js";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const wrap = (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) => fn(req, res).catch(next);

export function authRoutes(db: Db): Router {
  const controller = makeAuthController(makeAuthService(makeAuthRepository(db)));
  const router = Router();
  router.post("/register", validate(credentials), wrap(controller.register));
  router.post("/login", loginRateLimit, validate(credentials), wrap(controller.login));
  router.post("/logout", wrap(controller.logout));
  router.get("/me", authenticate, wrap(controller.me));
  router.delete("/me", authenticate, wrap(controller.deleteMe));
  return router;
}
```

- [ ] **Step 10: `apps/api/src/modules/health/health.routes.ts`**

```ts
import { Router } from "express";
import type { Db } from "../../db/pool.js";

export function healthRoutes(db: Db): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ status: "ok", db: true });
    } catch {
      res.status(503).json({ status: "degraded", db: false });
    }
  });
  return router;
}
```

- [ ] **Step 11: `apps/api/src/app.ts`**

```ts
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import type { Db } from "./db/pool.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";

export function createApp(db: Db) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/health", healthRoutes(db));
  app.use("/api/auth", authRoutes(db));

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 12: `apps/api/src/server.ts`**

```ts
import { createApp } from "./app.js";
import { createPool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";
import { env } from "./config/env.js";

const db = createPool(env.DATABASE_URL);
await runMigrations(db);
const app = createApp(db);
app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});
```

- [ ] **Step 13: Verify build**

Run: `npm --prefix apps/api run build`
Expected: `tsc` passes with no type errors. (Do NOT start the server — it needs a real Postgres; integration tests in Task 6 use pg-mem.)

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat(api): add auth module, middlewares, layered app and server"
```

---

## Task 6: Auth integration tests (Supertest + pg-mem)

**Files:**
- Test: `apps/api/tests/integration/auth.test.ts`

**Interfaces:**
- Consumes: `createApp`, `makeTestDb`/`resetDb`.

- [ ] **Step 1: Write the integration test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { makeTestDb } from "../helpers/testDb";
import type { Db } from "../../src/db/pool";

let app: ReturnType<typeof createApp>;
let db: Db;

beforeEach(async () => {
  db = await makeTestDb();
  app = createApp(db);
});

describe("auth API", () => {
  const creds = { email: "joueur@test.fr", password: "motdepasse1" };

  it("registers a user, sets a cookie, returns the public user (no hash)", async () => {
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: creds.email, role: "player" });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toMatch(/token=/);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
  });

  it("rejects duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send(creds);
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(409);
  });

  it("rejects invalid input with 400", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "x", password: "short" });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials, 401 with wrong password", async () => {
    await request(app).post("/api/auth/register").send(creds);
    const ok = await request(app).post("/api/auth/login").send(creds);
    expect(ok.status).toBe(200);
    const bad = await request(app).post("/api/auth/login").send({ ...creds, password: "wrongpass1" });
    expect(bad.status).toBe(401);
  });

  it("GET /me requires the cookie", async () => {
    const anon = await request(app).get("/api/auth/me");
    expect(anon.status).toBe(401);

    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(creds.email);
  });

  it("deletes the account (RGPD) and then /me is 401", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);
    const del = await agent.delete("/api/auth/me");
    expect(del.status).toBe(204);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });

  it("health endpoint reports db ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: true });
  });
});
```

- [ ] **Step 2: Run the full suite**

Run: `npm --prefix apps/api test`
Expected: ALL tests pass (domain + lib + harness + auth integration). If pg-mem rejects a query, report the exact error as DONE_WITH_CONCERNS rather than weakening a security assertion.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(api): add auth integration tests (Supertest + pg-mem)"
```

---

## Final Verification (Phase 1)

- [ ] `npm --prefix apps/api run build` passes (no type errors).
- [ ] `npm --prefix apps/api test` is fully green (unit + integration).
- [ ] No SQL outside `*.repository.ts` / `*.sql` / migrate; every query parameterized.
- [ ] `git log --oneline` shows one commit per task.
