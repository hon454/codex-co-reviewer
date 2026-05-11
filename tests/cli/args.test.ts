import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../../src/cli/args.js";

describe("CLI argument parser", () => {
  it("parses project validate with JSON output and path overrides", () => {
    const result = parseCliArgs([
      "project",
      "validate",
      "--json",
      "--config",
      "fixture/config.yaml",
      "--data-root",
      "fixture/data",
    ]);

    expect(result).toEqual({
      ok: true,
      command: "project-validate",
      json: true,
      paths: {
        configPath: "fixture/config.yaml",
        dataRoot: "fixture/data",
      },
    });
  });

  it("parses project list", () => {
    expect(parseCliArgs(["project", "list"])).toEqual({
      ok: true,
      command: "project-list",
      json: false,
      paths: {},
    });
  });

  it("parses help", () => {
    expect(parseCliArgs(["--help"])).toEqual({
      ok: true,
      command: "help",
      json: false,
      paths: {},
    });
  });

  it("rejects unsupported commands", () => {
    const result = parseCliArgs(["start"]);

    expect(result).toEqual({
      ok: false,
      message: "Unsupported command: start",
    });
  });

  it("rejects extra command tokens", () => {
    const result = parseCliArgs(["project", "validate", "extra"]);

    expect(result).toEqual({
      ok: false,
      message: "Unsupported command: project validate extra",
    });
  });

  it("rejects flags that require a value", () => {
    const result = parseCliArgs(["project", "validate", "--config"]);

    expect(result).toEqual({
      ok: false,
      message: "Flag --config requires a value.",
    });
  });
});
