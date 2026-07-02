import { evaluateGuess } from "../../domain/evaluateGuess.js";
import { isValidWord, DICTIONARY } from "../../domain/dictionary.js";
import { dailyFallbackWord } from "../../domain/fallbackWord.js";
import { todayIso } from "../../lib/clock.js";
import { HttpError } from "../../middlewares/errorHandler.js";
import { noopCache, dailyWordKey, type Cache } from "../../db/cache.js";
import type { GamesRepository, GameStatus } from "./games.repository.js";

const MAX_ATTEMPTS = 6;
const WORD_CACHE_TTL = 3600; // 1 h — le mot du jour change rarement

type CachedWord = { id: number; word: string; date?: string };

export interface GameState {
  status: GameStatus;
  maxAttempts: typeof MAX_ATTEMPTS;
  attempts: { guess: string; result: import("../../domain/evaluateGuess.js").LetterState[] }[];
  // Mot à deviner : révélé UNIQUEMENT quand la partie est terminée (won/lost),
  // jamais pendant qu'elle est in_progress (anti-triche).
  word?: string;
}

export interface GuessResult {
  result: import("../../domain/evaluateGuess.js").LetterState[];
  status: GameStatus;
  word?: string; // révélé uniquement en fin de partie (won/lost)
}

export function makeGamesService(
  repo: GamesRepository,
  deps: { today?: () => string; cache?: Cache } = {},
) {
  const today = deps.today ?? todayIso;
  const cache = deps.cache ?? noopCache;

  // Le mot du jour est lu depuis le cache NoSQL (Redis) avant la BDD SQL :
  // même valeur pour tous les joueurs, il évite un accès Postgres répété.
  async function getDailyWord(date: string): Promise<CachedWord> {
    const cached = await cache.get<CachedWord>(dailyWordKey(date));
    if (cached) return cached;

    let word = await repo.findWordByDate(date);
    if (!word) {
      const fallback = dailyFallbackWord(date, DICTIONARY);
      word = await repo.insertDailyWord(date, fallback, null);
    }
    const value: CachedWord = { id: word.id, word: word.word };
    await cache.set(dailyWordKey(date), value, WORD_CACHE_TTL);
    return value;
  }

  async function ensureWordAndGame(userId: number) {
    const date = today();
    const word = await getDailyWord(date);
    let game = await repo.findGame(userId, word.id);
    if (!game) {
      game = await repo.createGame(userId, word.id);
    }
    return { word, game };
  }

  return {
    async getToday(userId: number): Promise<GameState> {
      const { word, game } = await ensureWordAndGame(userId);
      const attempts = await repo.listGuesses(game.id);

      // Auto-réparation : si une partie est restée "in_progress" alors qu'elle
      // est en réalité terminée (mot trouvé, ou 6 essais épuisés), on recalcule
      // et on persiste le bon statut. Rend le système robuste aux échecs partiels.
      let status = game.status;
      if (status === "in_progress") {
        const won = attempts.some((a) => a.result.every((s: string) => s === "correct"));
        if (won) status = "won";
        else if (attempts.length >= MAX_ATTEMPTS) status = "lost";
        if (status !== "in_progress") await repo.updateGameStatus(game.id, status);
      }

      const state: GameState = { status, maxAttempts: MAX_ATTEMPTS, attempts };
      if (status !== "in_progress") state.word = word.word; // révélé en fin de partie
      return state;
    },

    async submitGuess(userId: number, guess: string): Promise<GuessResult> {
      const normalized = guess.toLowerCase().trim();

      if (!isValidWord(normalized)) {
        throw new HttpError(400, "invalid_word");
      }

      const { word, game } = await ensureWordAndGame(userId);

      if (game.status !== "in_progress") {
        throw new HttpError(409, "game_already_finished");
      }

      const count = await repo.countGuesses(game.id);
      if (count >= MAX_ATTEMPTS) {
        throw new HttpError(409, "max_attempts_reached");
      }

      const result = evaluateGuess(normalized, word.word);
      const attemptNumber = count + 1;
      await repo.insertGuess(game.id, attemptNumber, normalized, result);

      const isCorrect = result.every((s) => s === "correct");
      const isLast = attemptNumber >= MAX_ATTEMPTS;

      let status: GameStatus = "in_progress";
      if (isCorrect) status = "won";
      else if (isLast) status = "lost";

      if (status !== "in_progress") {
        await repo.updateGameStatus(game.id, status);
      }

      // Le mot n'est renvoyé que si la partie est terminée (anti-triche préservé)
      return status === "in_progress" ? { result, status } : { result, status, word: word.word };
    },
  };
}

export type GamesService = ReturnType<typeof makeGamesService>;
