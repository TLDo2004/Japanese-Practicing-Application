import { describe, expect, it } from "vitest";
import { activeTab, isSecondaryRoute, parseHash, parsePath, pathFor, persistableTab } from "./routes";

describe("legacy-compatible hash routes", () => {
  it("defaults empty hash to learn", () => {
    expect(parseHash("")).toEqual({ name: "learn" });
    expect(parseHash("#")).toEqual({ name: "learn" });
  });

  it("parses chart, sets, writing, quiz, dictionary", () => {
    expect(parseHash("#/learn/chart/kata")).toEqual({ name: "chart", script: "kata" });
    expect(parseHash("#/practice/sets/quiz/both")).toEqual({
      name: "sets",
      kind: "quiz",
      mode: "both",
    });
    expect(parseHash("#/practice/write")).toEqual({ name: "writing" });
    expect(parseHash("#/practice/quiz")).toEqual({ name: "quiz" });
    expect(parseHash("#/dictionary")).toEqual({ name: "dict" });
    expect(parseHash("#/dict")).toEqual({ name: "dict" });
  });

  it("maps routes back to the same paths as legacy hashFor", () => {
    expect(pathFor({ name: "chart", script: "hira" })).toBe("/learn/chart/hira");
    expect(pathFor({ name: "sets", kind: "write", mode: "lookalikes" })).toBe(
      "/practice/sets/write/lookalikes",
    );
    expect(pathFor({ name: "dict" })).toBe("/dictionary");
  });

  it("treats HashRouter pathnames like hashes", () => {
    expect(parsePath("/learn/chart/hira")).toEqual({ name: "chart", script: "hira" });
  });

  it("hides the bottom nav on secondary screens", () => {
    expect(isSecondaryRoute({ name: "learn" })).toBe(false);
    expect(isSecondaryRoute({ name: "chart", script: "hira" })).toBe(true);
    expect(activeTab({ name: "quiz" })).toBe("practice");
    expect(activeTab({ name: "chart", script: "kata" })).toBe("learn");
    expect(persistableTab({ name: "writing" }, "learn")).toBe("learn");
    expect(persistableTab({ name: "writing" }, "practice")).toBe("practice");
  });
});
