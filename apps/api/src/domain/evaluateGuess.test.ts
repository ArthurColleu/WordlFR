import { describe, it, expect } from "vitest";
import { evaluateGuess } from "./evaluateGuess";

describe("evaluateGuess", () => {
  it("all correct when guess equals target", () => {
    expect(evaluateGuess("table", "table")).toEqual(["correct","correct","correct","correct","correct"]);
  });
  it("all absent when no letters match", () => {
    expect(evaluateGuess("zzzzz", "table")).toEqual(["absent","absent","absent","absent","absent"]);
  });
  it("present for right letter wrong position", () => {
    expect(evaluateGuess("blate", "table")).toEqual(["present","present","present","present","correct"]);
  });
  it("duplicate letters in guess limited by target count", () => {
    expect(evaluateGuess("eeeee", "ferme")).toEqual(["absent","correct","absent","absent","correct"]);
  });
  it("duplicate handling both directions", () => {
    expect(evaluateGuess("lever", "ferme")).toEqual(["absent","correct","absent","present","present"]);
  });
});
