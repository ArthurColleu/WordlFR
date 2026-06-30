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
