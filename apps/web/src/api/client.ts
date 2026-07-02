const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "network_error");
  return data as T;
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/api/auth/me"),
  deleteMe: () => request<void>("/api/auth/me", { method: "DELETE" }),

  // Game
  getToday: () => request<GameState>("/api/game/today"),
  submitGuess: (guess: string) =>
    request<GuessResult>("/api/game/guess", { method: "POST", body: JSON.stringify({ guess }) }),

  // Stats
  getStats: () => request<PlayerStats>("/api/stats"),

  // Admin words
  listWords: () => request<{ words: DailyWord[] }>("/api/admin/words"),
  createWord: (date: string, word: string) =>
    request<DailyWord>("/api/admin/words", { method: "POST", body: JSON.stringify({ date, word }) }),
  updateWord: (id: number, fields: { date?: string; word?: string }) =>
    request<DailyWord>(`/api/admin/words/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),
  deleteWord: (id: number) => request<void>(`/api/admin/words/${id}`, { method: "DELETE" }),
};

// Shared types (mirrored from API)
export interface User {
  id: number;
  email: string;
  role: "player" | "admin";
}

export type LetterState = "correct" | "present" | "absent";

export interface GameState {
  status: "in_progress" | "won" | "lost";
  maxAttempts: 6;
  attempts: { guess: string; result: LetterState[] }[];
  word?: string; // révélé uniquement en fin de partie (won/lost)
}

export interface GuessResult {
  result: LetterState[];
  status: "in_progress" | "won" | "lost";
  word?: string; // révélé uniquement en fin de partie (won/lost)
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<string, number>;
}

export interface DailyWord {
  id: number;
  date: string;
  word: string;
  created_by: number | null;
  created_at: string;
}
