import { describe, it, expect } from "vitest";
import { dailyFallbackWord } from "./fallbackWord";

const dict = ["alpha","bravo","charl","delta","ephes"];

describe("dailyFallbackWord", () => {
  it("is deterministic for the same date", () => {
    expect(dailyFallbackWord("2026-06-30", dict)).toBe(dailyFallbackWord("2026-06-30", dict));
  });
  it("returns a word from the dictionary", () => {
    expect(dict).toContain(dailyFallbackWord("2026-01-01", dict));
  });
  it("varies across dates", () => {
    const set = new Set(["2026-01-01","2026-01-02","2026-01-03","2026-01-04","2026-01-05"].map(d => dailyFallbackWord(d, dict)));
    expect(set.size).toBeGreaterThan(1);
  });
});
