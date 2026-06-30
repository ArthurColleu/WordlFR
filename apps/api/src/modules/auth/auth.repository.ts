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
