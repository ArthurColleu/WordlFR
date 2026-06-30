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
