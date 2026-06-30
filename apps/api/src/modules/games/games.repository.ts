import type { Db } from "../../db/pool.js";
import type { LetterState } from "../../domain/evaluateGuess.js";

export type GameStatus = "in_progress" | "won" | "lost";

export function makeGamesRepository(db: Db) {
  return {
    async findWordByDate(date: string) {
      const { rows } = await db.query<{ id: number; word: string }>(
        "SELECT id, word FROM daily_words WHERE date = $1",
        [date],
      );
      return rows[0] ?? null;
    },
    async insertDailyWord(date: string, word: string, createdBy: number | null) {
      const { rows } = await db.query<{ id: number; word: string }>(
        "INSERT INTO daily_words (date, word, created_by) VALUES ($1, $2, $3) RETURNING id, word",
        [date, word, createdBy],
      );
      return rows[0];
    },
    async findGame(userId: number, dailyWordId: number) {
      const { rows } = await db.query<{ id: number; status: GameStatus }>(
        "SELECT id, status FROM games WHERE user_id = $1 AND daily_word_id = $2",
        [userId, dailyWordId],
      );
      return rows[0] ?? null;
    },
    async createGame(userId: number, dailyWordId: number) {
      const { rows } = await db.query<{ id: number; status: GameStatus }>(
        "INSERT INTO games (user_id, daily_word_id) VALUES ($1, $2) RETURNING id, status",
        [userId, dailyWordId],
      );
      return rows[0];
    },
    async listGuesses(gameId: number) {
      const { rows } = await db.query<{ guess: string; result: LetterState[] }>(
        "SELECT guess, result FROM guesses WHERE game_id = $1 ORDER BY attempt_number ASC",
        [gameId],
      );
      return rows.map((r) => ({
        guess: r.guess,
        result: typeof r.result === "string" ? JSON.parse(r.result) : r.result,
      }));
    },
    async countGuesses(gameId: number): Promise<number> {
      const { rows } = await db.query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM guesses WHERE game_id = $1",
        [gameId],
      );
      return rows[0].n;
    },
    async insertGuess(gameId: number, attemptNumber: number, guess: string, result: LetterState[]) {
      await db.query(
        "INSERT INTO guesses (game_id, attempt_number, guess, result) VALUES ($1, $2, $3, $4)",
        [gameId, attemptNumber, guess, JSON.stringify(result)],
      );
    },
    async updateGameStatus(gameId: number, status: GameStatus) {
      await db.query(
        "UPDATE games SET status = $1, finished_at = CASE WHEN $1 = 'in_progress' THEN NULL ELSE now() END WHERE id = $2",
        [status, gameId],
      );
    },
  };
}

export type GamesRepository = ReturnType<typeof makeGamesRepository>;
