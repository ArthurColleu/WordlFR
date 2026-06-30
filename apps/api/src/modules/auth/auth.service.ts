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
