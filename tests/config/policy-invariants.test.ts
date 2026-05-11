import { describe, expect, expectTypeOf, it } from "vitest";
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

function expectSchemaInvalid(input: unknown) {
  const result = buildEffectiveConfig(input);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected invalid config");
  expect(result.errors.map((error) => error.code)).toContain("CONFIG_SCHEMA_INVALID");
}

describe("v1 policy invariants", () => {
  it("narrows effective config policy fields after successful validation", () => {
    const result = buildEffectiveConfig(configWith({}));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected valid config");

    const project = result.value.projects[0]!;
    expectTypeOf(result.value.daemon.noGithubWriteAfterStopRequested).toEqualTypeOf<true>();
    expectTypeOf(result.value.artifacts.redaction).toEqualTypeOf<true>();
    expectTypeOf(project.policy.autoApprove).toEqualTypeOf<false>();
    expectTypeOf(project.setup.onFailure).toEqualTypeOf<"log_only_skip_review">();
    expectTypeOf(project.confidence.low.contributesToDecision).toEqualTypeOf<false>();
    expectTypeOf(project.rereview.sameHeadShaBehavior).toEqualTypeOf<"skip_and_log">();
  });

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

  it("keeps wrong-type relaxed fields schema invalid", () => {
    expectSchemaInvalid(configWith({ policy: { autoApprove: "true" } }));
    expectSchemaInvalid(configWith({ rereview: { sameHeadShaBehavior: false } }));
  });
});
