import { describe, expect, it } from "vitest";
import { romajiMatches } from "@jpa/practice";

describe("reading scoring (shared)", () => {
  it("matches romaji via @jpa/practice", () => {
    expect(romajiMatches("a", "a")).toBe(true);
    expect(romajiMatches("shi", "si")).toBe(true);
    expect(romajiMatches("ka", "ki")).toBe(false);
  });
});
