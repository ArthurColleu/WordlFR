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
