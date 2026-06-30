import { describe, it, expect } from "vitest";
import { DICTIONARY, isValidWord } from "./dictionary";

describe("dictionary", () => {
  it("only 5-letter lowercase unaccented words", () => {
    expect(DICTIONARY.length).toBeGreaterThan(100);
    for (const w of DICTIONARY) expect(w).toMatch(/^[a-z]{5}$/);
  });
  it("no duplicates", () => {
    expect(new Set(DICTIONARY).size).toBe(DICTIONARY.length);
  });
  it("validates case-insensitively", () => {
    expect(isValidWord("table")).toBe(true);
    expect(isValidWord("TABLE")).toBe(true);
    expect(isValidWord("zzzzz")).toBe(false);
  });
});
