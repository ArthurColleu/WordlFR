import { newDb } from "pg-mem";
import { runMigrations } from "../../src/db/migrate.js";
// Returns a fresh, isolated in-memory Postgres-compatible DB with all
// migrations applied. Call once per test (beforeEach) for a clean slate.
// (pg-mem verified to support our schema: IDENTITY, FK, CHECK, UNIQUE, JSONB,
// now(), and COUNT(*) FILTER aggregates. It does NOT support multi-table
// TRUNCATE, which is why we use a fresh DB per test instead of truncating.)
export async function makeTestDb() {
    const mem = newDb();
    const adapter = mem.adapters.createPg();
    const pool = new adapter.Pool();
    const db = {
        async query(text, params) {
            const res = await pool.query(text, params);
            return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
        },
    };
    await runMigrations(db);
    return db;
}
