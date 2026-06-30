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
