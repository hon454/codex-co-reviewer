import { describe, expect, it } from "vitest";
import { makeConfigError, redactForDisplay } from "../../src/config/errors.js";

describe("config errors", () => {
  it("keeps stable codes and structured metadata separate from display text", () => {
    const error = makeConfigError({
      code: "CONFIG_INVALID_REPO",
      path: ["projects", 0, "repo"],
      message: "Invalid repository identifier",
      metadata: { repo: "not-a-repo" },
    });

    expect(error.code).toBe("CONFIG_INVALID_REPO");
    expect(error.path).toEqual(["projects", 0, "repo"]);
    expect(error.metadata).toEqual({ repo: "not-a-repo" });
    expect(error.redactedMessage).toBe("Invalid repository identifier");
  });

  it("redacts sensitive values from user-facing messages", () => {
    const text = [
      "Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456",
      "OPENAI_API_KEY=sk-test_abcdefghijklmnopqrstuvwxyz",
      "/Users/van/private/repo/config.yaml",
      "prompt: use token ghp_secretsecretsecretsecretsecret",
    ].join("\n");

    const redacted = redactForDisplay(text);

    expect(redacted).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(redacted).not.toContain("sk-test_abcdefghijklmnopqrstuvwxyz");
    expect(redacted).not.toContain("/Users/van/private");
    expect(redacted).not.toContain("use token");
    expect(redacted).toContain("[REDACTED_AUTHORIZATION]");
    expect(redacted).toContain("[REDACTED_SECRET]");
    expect(redacted).toContain("[REDACTED_PATH]");
    expect(redacted).toContain("[REDACTED_PROMPT]");
  });
});
