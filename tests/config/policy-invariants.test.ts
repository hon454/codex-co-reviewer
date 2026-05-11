import { describe, expect, it } from "vitest";
import { buildEffectiveConfig } from "../../src/config/schema.js";

function configWith(overrides: Record<string, unknown>) {
  return {
    projects: [
      {
        id: "alpha",
        repo: "owner/repo",
        localPath: "/tmp/codex-co-reviewer-alpha",
        promptFile: "profiles/alpha/review.md",
        ...overrides,
      },
    ],
  };
}

function expectPolicyViolation(input: unknown) {
  const result = buildEffectiveConfig(input);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected invalid config");
  expect(result.errors.map((error) => error.code)).toContain("CONFIG_POLICY_VIOLATION");
}

describe("v1 policy invariants", () => {
  it("rejects automatic approval", () => {
    expectPolicyViolation(configWith({ policy: { autoApprove: true } }));
  });

  it("rejects disabling no-write-after-stop", () => {
    expectPolicyViolation({
      daemon: { noGithubWriteAfterStopRequested: false },
      projects: configWith({}).projects,
    });
  });

  it("rejects setup failure modes that write to GitHub", () => {
    expectPolicyViolation(configWith({ setup: { onFailure: "request_changes" } }));
  });

  it("rejects low-confidence findings contributing to REQUEST_CHANGES", () => {
    expectPolicyViolation(
      configWith({
        confidence: {
          low: {
            contributesToDecision: true,
          },
        },
      }),
    );
  });

  it("rejects same-head re-review allowance", () => {
    expectPolicyViolation(
      configWith({
        rereview: {
          sameHeadShaBehavior: "review_again",
        },
      }),
    );
  });

  it("rejects redaction weakening", () => {
    expectPolicyViolation({
      artifacts: { redaction: false },
      projects: configWith({}).projects,
    });
  });
});
