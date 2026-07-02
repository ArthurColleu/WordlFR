import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { makeTestDb } from "../helpers/testDb";
import type { Db } from "../../src/db/pool";

let app: ReturnType<typeof createApp>;
let db: Db;

const creds = { email: "joueur@test.fr", password: "motdepasse1" };
const creds2 = { email: "joueur2@test.fr", password: "motdepasse2" };

async function agentWithSession(a: ReturnType<typeof request.agent>) {
  await a.post("/api/auth/register").send(creds);
  return a;
}

beforeEach(async () => {
  db = await makeTestDb();
  app = createApp(db);
});

describe("GET /api/game/today", () => {
  it("rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/game/today");
    expect(res.status).toBe(401);
  });

  it("returns initial game state for a new player", async () => {
    const agent = request.agent(app);
    await agentWithSession(agent);
    const res = await agent.get("/api/game/today");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("in_progress");
    expect(res.body.maxAttempts).toBe(6);
    expect(res.body.attempts).toHaveLength(0);
    // Word must NEVER appear in the response
    expect(JSON.stringify(res.body)).not.toMatch(/\bword\b/);
  });

  it("is idempotent — same game returned on repeated calls", async () => {
    const agent = request.agent(app);
    await agentWithSession(agent);
    const r1 = await agent.get("/api/game/today");
    const r2 = await agent.get("/api/game/today");
    expect(r1.body.status).toBe(r2.body.status);
    expect(r1.body.attempts).toHaveLength(r2.body.attempts.length);
  });
});

describe("POST /api/game/guess", () => {
  it("rejects unauthenticated request with 401", async () => {
    const res = await request(app).post("/api/game/guess").send({ guess: "table" });
    expect(res.status).toBe(401);
  });

  it("rejects a word not in dictionary with 400", async () => {
    const agent = request.agent(app);
    await agentWithSession(agent);
    await agent.get("/api/game/today");
    const res = await agent.post("/api/game/guess").send({ guess: "zzzzz" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_word");
  });

  it("rejects body with wrong length with 400", async () => {
    const agent = request.agent(app);
    await agentWithSession(agent);
    await agent.get("/api/game/today");
    const res = await agent.post("/api/game/guess").send({ guess: "ab" });
    expect(res.status).toBe(400);
  });

  it("accepts a valid guess and returns result + status, word NEVER exposed while in progress", async () => {
    // On fixe un mot du jour connu et différent de l'essai → partie encore en cours.
    const { makeGamesRepository } = await import("../../src/modules/games/games.repository");
    const repo = makeGamesRepository(db);
    const testDate = new Date().toISOString().slice(0, 10);
    await repo.insertDailyWord(testDate, "vivre", null);

    const agent = request.agent(app);
    await agentWithSession(agent);
    await agent.get("/api/game/today");
    const res = await agent.post("/api/game/guess").send({ guess: "table" });
    expect(res.status).toBe(200);
    expect(res.body.result).toHaveLength(5);
    res.body.result.forEach((s: unknown) =>
      expect(["correct", "present", "absent"]).toContain(s),
    );
    expect(res.body.status).toBe("in_progress");
    // Anti-cheat : tant que la partie est en cours, le mot n'est jamais renvoyé
    expect(res.body.word).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/vivre/);
  });

  it("reveals the target word only once the game is over (lost)", async () => {
    const { makeGamesRepository } = await import("../../src/modules/games/games.repository");
    const repo = makeGamesRepository(db);
    const testDate = new Date().toISOString().slice(0, 10);
    await repo.insertDailyWord(testDate, "vivre", null);

    const agent = request.agent(app);
    await agentWithSession(agent);

    const wrong = ["table", "porte", "fleur", "jouer", "monde", "temps"];
    let last: Awaited<ReturnType<typeof agent.post>> | undefined;
    for (const w of wrong) {
      last = await agent.post("/api/game/guess").send({ guess: w });
      if (last.body.status === "in_progress") {
        // le mot reste caché tant qu'on joue
        expect(last.body.word).toBeUndefined();
      }
    }
    // 6 essais faux → perdu → le mot est révélé
    expect(last!.body.status).toBe("lost");
    expect(last!.body.word).toBe("vivre");

    // GET /today révèle aussi le mot une fois la partie terminée
    const state = await agent.get("/api/game/today");
    expect(state.body.status).toBe("lost");
    expect(state.body.word).toBe("vivre");
  });

  it("heals a game stuck in_progress with 6 attempts (→ lost) on GET /today", async () => {
    const { makeGamesRepository } = await import("../../src/modules/games/games.repository");
    const repo = makeGamesRepository(db);
    const testDate = new Date().toISOString().slice(0, 10);
    const word = await repo.insertDailyWord(testDate, "vivre", null);

    const agent = request.agent(app);
    const reg = await agent.post("/api/auth/register").send(creds);
    const userId = reg.body.user.id;

    // On fabrique une partie « coincée » : 6 essais insérés mais statut jamais mis à jour
    const game = await repo.createGame(userId, word.id);
    const absent = ["absent", "absent", "absent", "absent", "absent"] as ("absent")[];
    for (let i = 1; i <= 6; i++) {
      await repo.insertGuess(game.id, i, "table", absent);
    }

    // getToday doit recalculer et persister le statut "lost"
    const state = await agent.get("/api/game/today");
    expect(state.body.status).toBe("lost");
    expect(state.body.word).toBe("vivre");

    // et les statistiques comptent bien la partie
    const stats = await agent.get("/api/stats");
    expect(stats.body.gamesPlayed).toBe(1);
  });

  it("accumulates attempts and reflects them in GET /today", async () => {
    const agent = request.agent(app);
    await agentWithSession(agent);
    await agent.get("/api/game/today");
    await agent.post("/api/game/guess").send({ guess: "table" });
    const state = await agent.get("/api/game/today");
    expect(state.body.attempts).toHaveLength(1);
    expect(state.body.attempts[0].guess).toBe("table");
    expect(state.body.attempts[0].result).toHaveLength(5);
  });

  it("enforces 6-attempt limit server-side (7th guess rejected)", async () => {
    const agent = request.agent(app);
    await agentWithSession(agent);
    await agent.get("/api/game/today");

    const words = ["table", "porte", "fleur", "jouer", "monde", "temps"];
    for (const w of words) {
      await agent.post("/api/game/guess").send({ guess: w });
    }
    const state = await agent.get("/api/game/today");
    // Game must be finished after 6 guesses (won or lost)
    expect(state.body.status).toMatch(/^(won|lost)$/);

    // 7th attempt refused
    const extra = await agent.post("/api/game/guess").send({ guess: "lieux" });
    expect(extra.status).toBe(409);
  });

  it("game isolation — player cannot see or affect another player's game", async () => {
    const agent1 = request.agent(app);
    const agent2 = request.agent(app);
    await agentWithSession(agent1);
    await agent2.post("/api/auth/register").send(creds2);

    await agent1.get("/api/game/today");
    await agent1.post("/api/game/guess").send({ guess: "table" });

    // Agent 2 has their own fresh game
    const state2 = await agent2.get("/api/game/today");
    expect(state2.body.attempts).toHaveLength(0);
  });

  it("game over after win — further guesses rejected with 409", async () => {
    // To win we need to guess the exact fallback word for today.
    // Inject a known daily word via the repository for deterministic test.
    const { makeGamesRepository } = await import("../../src/modules/games/games.repository");
    const repo = makeGamesRepository(db);
    const testDate = new Date().toISOString().slice(0, 10);
    await repo.insertDailyWord(testDate, "table", null);

    const agent = request.agent(app);
    await agentWithSession(agent);

    const res = await agent.post("/api/game/guess").send({ guess: "table" });
    expect(res.body.status).toBe("won");

    const extra = await agent.post("/api/game/guess").send({ guess: "porte" });
    expect(extra.status).toBe(409);
  });
});
