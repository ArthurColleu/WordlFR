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
