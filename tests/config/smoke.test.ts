import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs TypeScript tests", () => {
    expect("codex-co-reviewer").toContain("reviewer");
  });
});
