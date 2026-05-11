import { describe, expect, it } from "vitest";
import { buildEffectiveConfig } from "../../src/config/schema.js";

const minimalConfig = {
  projects: [
    {
      id: "alpha",
      repo: "owner/repo",
      localPath: "/tmp/codex-co-reviewer-alpha",
      promptFile: "profiles/alpha/review.md",
    },
  ],
};

describe("config schema and defaults", () => {
  it("applies documented conservative defaults", () => {
    const result = buildEffectiveConfig(minimalConfig);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected valid config");

    expect(result.value.scheduler).toEqual({
      intervalSeconds: 120,
      jitterSeconds: 20,
    });
    expect(result.value.daemon.noGithubWriteAfterStopRequested).toBe(true);
    expect(result.value.concurrency).toEqual({
      global: 2,
      perProject: 1,
      perPullRequest: 1,
    });
    expect(result.value.reviewer.backend).toBe("codex_cli");
    expect(result.value.artifacts.redaction).toBe(true);
    expect(result.value.projects[0]?.policy.autoApprove).toBe(false);
    expect(result.value.projects[0]?.policy.skipDraft).toBe(true);
    expect(result.value.projects[0]?.rereview.sameHeadShaBehavior).toBe("skip_and_log");
    expect(result.value.projects[0]?.confidence.low.contributesToDecision).toBe(false);
  });

  it("rejects invalid repository identifiers", () => {
    const result = buildEffectiveConfig({
      projects: [{ ...minimalConfig.projects[0], repo: "owner/repo/extra" }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid config");
    expect(result.errors.map((error) => error.code)).toContain("CONFIG_INVALID_REPO");
  });

  it("maps non-string repository identifiers to schema invalid", () => {
    const result = buildEffectiveConfig({
      projects: [{ ...minimalConfig.projects[0], repo: 123 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid config");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "CONFIG_SCHEMA_INVALID",
        path: ["projects", 0, "repo"],
      }),
    );
  });

  it("rejects duplicate project ids", () => {
    const result = buildEffectiveConfig({
      projects: [
        minimalConfig.projects[0],
        { ...minimalConfig.projects[0], repo: "owner/other" },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid config");
    expect(result.errors.map((error) => error.code)).toContain("CONFIG_DUPLICATE_PROJECT_ID");
  });

  it("rejects unsafe project ids", () => {
    const result = buildEffectiveConfig({
      projects: [{ ...minimalConfig.projects[0], id: "../alpha" }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid config");
    expect(result.errors.map((error) => error.code)).toContain("CONFIG_INVALID_PROJECT_ID");
  });

  it("maps non-string project ids to schema invalid", () => {
    const result = buildEffectiveConfig({
      projects: [{ ...minimalConfig.projects[0], id: 123 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid config");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "CONFIG_SCHEMA_INVALID",
        path: ["projects", 0, "id"],
      }),
    );
  });

  it("rejects invalid timeout, retention, and concurrency bounds", () => {
    const result = buildEffectiveConfig({
      concurrency: { global: 0, perProject: 1, perPullRequest: 1 },
      artifacts: { retentionDays: 0 },
      backends: { codex_cli: { timeoutSeconds: -1 } },
      projects: minimalConfig.projects,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid config");
    expect(result.errors.map((error) => error.code)).toContain("CONFIG_INVALID_BOUNDS");
  });

  it("maps invalid literal-backed config options to invalid enum", () => {
    const result = buildEffectiveConfig({
      reviewer: { backend: "openai_api" },
      projects: minimalConfig.projects,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid config");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "CONFIG_INVALID_ENUM",
        path: ["reviewer", "backend"],
      }),
    );
  });

  it("maps wrong-type literal-backed config options to schema invalid", () => {
    const result = buildEffectiveConfig({
      reviewer: { backend: 123 },
      projects: minimalConfig.projects,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid config");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "CONFIG_SCHEMA_INVALID",
        path: ["reviewer", "backend"],
      }),
    );
  });
});
