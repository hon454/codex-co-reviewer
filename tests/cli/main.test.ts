import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/main.js";

describe("CLI entrypoint", () => {
  it("prints help", async () => {
    const result = await runCli({
      argv: ["--help"],
      env: {},
      homeDirectory: "/Users/example",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("codex-co-reviewer project validate");
    expect(result.stderr).toBe("");
  });

  it("returns usage errors with exit code 2", async () => {
    const result = await runCli({
      argv: ["start"],
      env: {},
      homeDirectory: "/Users/example",
    });

    expect(result).toEqual({
      exitCode: 2,
      stdout: "",
      stderr: "Unsupported command: start\n",
    });
  });
});
