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
