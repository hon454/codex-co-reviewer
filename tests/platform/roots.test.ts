import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDefaultLocalPaths,
  resolveLocalPaths,
} from "../../src/platform/roots.js";

describe("local path root resolution", () => {
  it("uses macOS-style defaults from the provided home directory", () => {
    const paths = resolveDefaultLocalPaths({
      env: {},
      homeDirectory: "/Users/example",
    });

    expect(paths).toEqual({
      configPath: "/Users/example/.config/codex-co-reviewer/config.yaml",
      configRoot: "/Users/example/.config/codex-co-reviewer",
      dataRoot: "/Users/example/.local/share/codex-co-reviewer",
      stateRoot: "/Users/example/.local/state/codex-co-reviewer",
      logRoot: "/Users/example/.local/state/codex-co-reviewer/logs",
    });
  });

  it("honors XDG root variables", () => {
    const paths = resolveDefaultLocalPaths({
      env: {
        XDG_CONFIG_HOME: "/tmp/config",
        XDG_DATA_HOME: "/tmp/data",
        XDG_STATE_HOME: "/tmp/state",
      },
      homeDirectory: "/Users/example",
    });

    expect(paths).toEqual({
      configPath: "/tmp/config/codex-co-reviewer/config.yaml",
      configRoot: "/tmp/config/codex-co-reviewer",
      dataRoot: "/tmp/data/codex-co-reviewer",
      stateRoot: "/tmp/state/codex-co-reviewer",
      logRoot: "/tmp/state/codex-co-reviewer/logs",
    });
  });

  it("applies explicit CLI path overrides after defaults", () => {
    const paths = resolveLocalPaths(
      { env: {}, homeDirectory: "/Users/example" },
      {
        configPath: "fixtures/config.yaml",
        dataRoot: "tmp/data",
      },
    );

    expect(paths.configPath).toBe(path.resolve("fixtures/config.yaml"));
    expect(paths.configRoot).toBe("/Users/example/.config/codex-co-reviewer");
    expect(paths.dataRoot).toBe(path.resolve("tmp/data"));
  });
});
