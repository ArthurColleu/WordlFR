import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./jwt";

describe("jwt", () => {
  it("signs then verifies a payload round-trip", () => {
    const token = signToken({ sub: 42, role: "admin" });
    expect(verifyToken(token)).toEqual({ sub: 42, role: "admin" });
  });
  it("returns null for a tampered token", () => {
    expect(verifyToken("not.a.token")).toBeNull();
  });
});
