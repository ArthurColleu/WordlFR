import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb } from "../../../tests/helpers/testDb";
import { makeGamesRepository } from "./games.repository";
import type { Db } from "../../db/pool";

let db: Db;
let repo: ReturnType<typeof makeGamesRepository>;

beforeEach(async () => {
  db = await makeTestDb();
  repo = makeGamesRepository(db);
  await db.query("INSERT INTO users (email, password_hash) VALUES ($1,$2)", ["p@p.fr", "h"]);
});

describe("games.repository", () => {
  it("creates a daily word, a game, records guesses and counts them", async () => {
    const word = await repo.insertDailyWord("2026-06-30", "table", null);
    expect(word.word).toBe("table");

    const game = await repo.createGame(1, word.id);
    expect(game.status).toBe("in_progress");

    expect(await repo.countGuesses(game.id)).toBe(0);
    await repo.insertGuess(game.id, 1, "porte", ["absent", "present", "absent", "absent", "correct"]);
    expect(await repo.countGuesses(game.id)).toBe(1);

    const guesses = await repo.listGuesses(game.id);
    expect(guesses).toHaveLength(1);
    expect(guesses[0]).toEqual({ guess: "porte", result: ["absent", "present", "absent", "absent", "correct"] });

    await repo.updateGameStatus(game.id, "won");
    const found = await repo.findGame(1, word.id);
    expect(found?.status).toBe("won");
  });

  it("findWordByDate returns null when absent", async () => {
    expect(await repo.findWordByDate("2099-01-01")).toBeNull();
  });
});
