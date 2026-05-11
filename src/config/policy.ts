import type { EffectiveConfig } from "./schema.js";
import { type ConfigError, makeConfigError } from "./errors.js";

export function enforcePolicyInvariants(config: EffectiveConfig): ConfigError[] {
  const errors: ConfigError[] = [];

  if (config.daemon.noGithubWriteAfterStopRequested !== true) {
    errors.push(
      makeConfigError({
        code: "CONFIG_POLICY_VIOLATION",
        path: ["daemon", "noGithubWriteAfterStopRequested"],
        message: "daemon.noGithubWriteAfterStopRequested must be true in v1.",
      }),
    );
  }

  if (config.artifacts.redaction !== true) {
    errors.push(
      makeConfigError({
        code: "CONFIG_POLICY_VIOLATION",
        path: ["artifacts", "redaction"],
        message: "artifacts.redaction must be true in v1.",
      }),
    );
  }

  config.projects.forEach((project, index) => {
    if (project.policy.autoApprove !== false) {
      errors.push(
        makeConfigError({
          code: "CONFIG_POLICY_VIOLATION",
          path: ["projects", index, "policy", "autoApprove"],
          message: "projects[].policy.autoApprove must be false in v1.",
          metadata: { projectId: project.id },
        }),
      );
    }

    if (project.setup.onFailure !== "log_only_skip_review") {
      errors.push(
        makeConfigError({
          code: "CONFIG_POLICY_VIOLATION",
          path: ["projects", index, "setup", "onFailure"],
          message: 'projects[].setup.onFailure must be "log_only_skip_review" in v1.',
          metadata: { projectId: project.id },
        }),
      );
    }

    if (project.confidence.low.contributesToDecision !== false) {
      errors.push(
        makeConfigError({
          code: "CONFIG_POLICY_VIOLATION",
          path: ["projects", index, "confidence", "low", "contributesToDecision"],
          message:
            "projects[].confidence.low.contributesToDecision must be false in v1.",
          metadata: { projectId: project.id },
        }),
      );
    }

    if (project.rereview.sameHeadShaBehavior !== "skip_and_log") {
      errors.push(
        makeConfigError({
          code: "CONFIG_POLICY_VIOLATION",
          path: ["projects", index, "rereview", "sameHeadShaBehavior"],
          message:
            'projects[].rereview.sameHeadShaBehavior must be "skip_and_log" in v1.',
          metadata: { projectId: project.id },
        }),
      );
    }
  });

  return errors;
}
