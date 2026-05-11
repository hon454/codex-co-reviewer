import { describe, expect, it } from "vitest";
import { makeConfigError } from "../../src/config/errors.js";
import {
  formatConfigErrorsJson,
  formatConfigErrorsText,
  formatProjectListText,
  formatValidationSuccessText,
} from "../../src/cli/output.js";

describe("CLI output formatting", () => {
  it("formats validation success without local absolute paths", () => {
    expect(formatValidationSuccessText(2)).toBe(
      "Configuration is valid. Projects: 2",
    );
  });

  it("formats project list with ids and repositories only", () => {
    expect(
      formatProjectListText([
        { id: "alpha", repo: "owner/repo" },
        { id: "beta", repo: "owner/other" },
      ]),
    ).toBe(["alpha\towner/repo", "beta\towner/other"].join("\n"));
  });

  it("formats config errors with redacted display messages", () => {
    const errors = [
      makeConfigError({
        code: "CONFIG_PATH_NOT_FOUND",
        path: ["projects", 0, "promptFile"],
        message:
          "Configured config path does not exist. Path: /Users/example/secret/profile.md",
        metadata: { projectId: "alpha" },
      }),
    ];

    expect(formatConfigErrorsText(errors)).toBe(
      [
        "Configuration is invalid.",
        "- CONFIG_PATH_NOT_FOUND at projects.0.promptFile: Configured config path does not exist. Path: [REDACTED_PATH]",
      ].join("\n"),
    );
  });

  it("formats config errors for JSON without raw messages", () => {
    const errors = [
      makeConfigError({
        code: "CONFIG_PATH_NOT_FOUND",
        path: ["projects", 0, "promptFile"],
        message:
          "Configured config path does not exist. Path: /Users/example/secret/profile.md",
        metadata: { projectId: "alpha" },
      }),
    ];

    expect(formatConfigErrorsJson(errors)).toEqual([
      {
        code: "CONFIG_PATH_NOT_FOUND",
        path: ["projects", 0, "promptFile"],
        message:
          "Configured config path does not exist. Path: [REDACTED_PATH]",
        metadata: { projectId: "alpha" },
      },
    ]);
  });
});
