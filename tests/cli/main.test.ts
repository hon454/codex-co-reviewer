import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { isMainModule, runCli } from "../../src/cli/main.js";

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

  it("detects the executable entrypoint when the path contains spaces", () => {
    const entrypointPath = "/tmp/codex co reviewer/dist/cli/main.js";

    expect(isMainModule(pathToFileURL(entrypointPath).href, entrypointPath)).toBe(
      true,
    );
  });

  it("detects the executable entrypoint through symlinked path aliases", () => {
    const realEntrypointPath = "/private/tmp/codex co reviewer/dist/cli/main.js";
    const argvPath = "/tmp/codex co reviewer/dist/cli/main.js";

    expect(
      isMainModule(pathToFileURL(realEntrypointPath).href, argvPath, () => {
        return realEntrypointPath;
      }),
    ).toBe(true);
  });
});
