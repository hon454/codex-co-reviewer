import { describe, expect, it } from "vitest";
import { makeConfigError, redactForDisplay } from "../../src/config/errors.js";

describe("config errors", () => {
  it("keeps stable codes and structured metadata separate from display text", () => {
    const sensitiveMessage = [
      "Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456",
      "Config path /Users/van/private/repo/config.yaml is not readable",
    ].join("\n");

    const error = makeConfigError({
      code: "CONFIG_PATH_NOT_FOUND",
      path: ["projects", 0, "promptFile"],
      message: sensitiveMessage,
      metadata: { projectId: "alpha", index: 0 },
    });

    expect(error.code).toBe("CONFIG_PATH_NOT_FOUND");
    expect(error.path).toEqual(["projects", 0, "promptFile"]);
    expect(error.message).toBe(sensitiveMessage);
    expect(error.message).toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(error.message).toContain("/Users/van/private/repo/config.yaml");
    expect(error.metadata).toEqual({ projectId: "alpha", index: 0 });
    expect(error.redactedMessage).not.toBe(error.message);
    expect(error.redactedMessage).toContain("[REDACTED_AUTHORIZATION]");
    expect(error.redactedMessage).toContain("[REDACTED_PATH]");
    expect(error.redactedMessage).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(error.redactedMessage).not.toContain("/Users/van/private/repo/config.yaml");
    expect(error.redactedMessage).not.toContain("projectId");
    expect(error.redactedMessage).not.toContain("alpha");
  });

  it("redacts sensitive values from user-facing messages", () => {
    const text = [
      "Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456",
      "Authorization: Basic dXNlcjpwYXNz",
      "Fine-grained token github_pat_11ABCDEFGabcdefghiJKLM_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456",
      "OPENAI_API_KEY=sk-test_abcdefghijklmnopqrstuvwxyz",
      "/Users/van/private/repo/config.yaml",
      "prompt: use token ghp_secretsecretsecretsecretsecret",
    ].join("\n");

    const redacted = redactForDisplay(text);

    expect(redacted).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(redacted).not.toContain("dXNlcjpwYXNz");
    expect(redacted).not.toContain("github_pat_11ABCDEFGabcdefghiJKLM_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456");
    expect(redacted).not.toContain("sk-test_abcdefghijklmnopqrstuvwxyz");
    expect(redacted).not.toContain("/Users/van/private");
    expect(redacted).not.toContain("use token");
    expect(redacted).toContain("[REDACTED_AUTHORIZATION]");
    expect(redacted).toContain("[REDACTED_SECRET]");
    expect(redacted).toContain("[REDACTED_PATH]");
    expect(redacted).toContain("[REDACTED_PROMPT]");
  });

  it("does not redact ordinary prose without a secret-like authorization value", () => {
    const text = "Authorization: required before using this command";

    expect(redactForDisplay(text)).toBe(text);
  });
});
