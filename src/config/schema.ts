import { z } from "zod";
import { DEFAULT_CONFIG } from "./defaults.js";
import {
  type ConfigError,
  type ConfigErrorCode,
  type ConfigErrorPathSegment,
  makeConfigError,
} from "./errors.js";

export type ConfigResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ConfigError[] };

export const REPO_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const PROJECT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

const positiveInteger = z.number().int().min(1);
const nonNegativeInteger = z.number().int().min(0);
const nonEmptyString = z.string().min(1);

export const commandSchema = z
  .object({
    name: nonEmptyString,
    command: nonEmptyString,
    runWhen: z.array(nonEmptyString).default([]),
    timeoutSeconds: positiveInteger.default(300),
  })
  .strict();

export const rawProjectSchema = z
  .object({
    id: z.string().regex(PROJECT_ID_PATTERN),
    repo: z.string().regex(REPO_IDENTIFIER_PATTERN),
    localPath: nonEmptyString,
    promptFile: nonEmptyString,
    contextFiles: z.array(nonEmptyString).default([...DEFAULT_CONFIG.project.contextFiles]),
    triggers: z
      .object({
        reviewRequested: z.boolean().default(DEFAULT_CONFIG.project.triggers.reviewRequested),
        readyForReview: z.boolean().default(DEFAULT_CONFIG.project.triggers.readyForReview),
        rereviewRequestedAfterMyChangesRequested: z
          .boolean()
          .default(DEFAULT_CONFIG.project.triggers.rereviewRequestedAfterMyChangesRequested),
        reopenedWithMeStillRequested: z
          .boolean()
          .default(DEFAULT_CONFIG.project.triggers.reopenedWithMeStillRequested),
        catchUpOnStart: z.boolean().default(DEFAULT_CONFIG.project.triggers.catchUpOnStart),
        manual: z.boolean().default(DEFAULT_CONFIG.project.triggers.manual),
      })
      .strict()
      .default(DEFAULT_CONFIG.project.triggers),
    policy: z
      .object({
        skipDraft: z.literal(true).default(DEFAULT_CONFIG.project.policy.skipDraft),
        autoApprove: z.literal(false).default(DEFAULT_CONFIG.project.policy.autoApprove),
        duplicateReviewBehavior: z
          .literal("skip_same_head_sha")
          .default(DEFAULT_CONFIG.project.policy.duplicateReviewBehavior),
      })
      .strict()
      .default(DEFAULT_CONFIG.project.policy),
    rereview: z
      .object({
        requiresMyLatestReviewState: z
          .literal("CHANGES_REQUESTED")
          .default(DEFAULT_CONFIG.project.rereview.requiresMyLatestReviewState),
        requiresRequestedReviewerIsMe: z
          .literal(true)
          .default(DEFAULT_CONFIG.project.rereview.requiresRequestedReviewerIsMe),
        requiresHeadShaChanged: z
          .literal(true)
          .default(DEFAULT_CONFIG.project.rereview.requiresHeadShaChanged),
        sameHeadShaBehavior: z
          .literal("skip_and_log")
          .default(DEFAULT_CONFIG.project.rereview.sameHeadShaBehavior),
      })
      .strict()
      .default(DEFAULT_CONFIG.project.rereview),
    setup: z
      .object({
        onFailure: z
          .literal("log_only_skip_review")
          .default(DEFAULT_CONFIG.project.setup.onFailure),
        commands: z.array(commandSchema).default([...DEFAULT_CONFIG.project.setup.commands]),
      })
      .strict()
      .default({
        onFailure: DEFAULT_CONFIG.project.setup.onFailure,
        commands: [...DEFAULT_CONFIG.project.setup.commands],
      }),
    verification: z
      .object({
        githubCi: z
          .object({
            enabled: z.boolean().default(DEFAULT_CONFIG.project.verification.githubCi.enabled),
            pendingTimeoutSeconds: positiveInteger.default(
              DEFAULT_CONFIG.project.verification.githubCi.pendingTimeoutSeconds,
            ),
            onFailure: z
              .literal("request_changes_and_skip_deep_review")
              .default(DEFAULT_CONFIG.project.verification.githubCi.onFailure),
          })
          .strict()
          .default(DEFAULT_CONFIG.project.verification.githubCi),
        local: z
          .object({
            mode: z.literal("lightweight").default(DEFAULT_CONFIG.project.verification.local.mode),
            commands: z
              .array(commandSchema)
              .default([...DEFAULT_CONFIG.project.verification.local.commands]),
            failureOutput: z
              .object({
                includeInReview: z
                  .boolean()
                  .default(
                    DEFAULT_CONFIG.project.verification.local.failureOutput.includeInReview,
                  ),
                maxLines: positiveInteger.default(
                  DEFAULT_CONFIG.project.verification.local.failureOutput.maxLines,
                ),
                redaction: z
                  .literal(true)
                  .default(DEFAULT_CONFIG.project.verification.local.failureOutput.redaction),
              })
              .strict()
              .default(DEFAULT_CONFIG.project.verification.local.failureOutput),
          })
          .strict()
          .default({
            mode: DEFAULT_CONFIG.project.verification.local.mode,
            commands: [...DEFAULT_CONFIG.project.verification.local.commands],
            failureOutput: DEFAULT_CONFIG.project.verification.local.failureOutput,
          }),
      })
      .strict()
      .default({
        githubCi: DEFAULT_CONFIG.project.verification.githubCi,
        local: {
          mode: DEFAULT_CONFIG.project.verification.local.mode,
          commands: [...DEFAULT_CONFIG.project.verification.local.commands],
          failureOutput: DEFAULT_CONFIG.project.verification.local.failureOutput,
        },
      }),
    confidence: z
      .object({
        low: z
          .object({
            mode: z
              .literal("summary_possible_concerns")
              .default(DEFAULT_CONFIG.project.confidence.low.mode),
            maxPerReview: positiveInteger.default(
              DEFAULT_CONFIG.project.confidence.low.maxPerReview,
            ),
            contributesToDecision: z
              .literal(false)
              .default(DEFAULT_CONFIG.project.confidence.low.contributesToDecision),
            allowInlineQuestionOverride: z
              .boolean()
              .default(DEFAULT_CONFIG.project.confidence.low.allowInlineQuestionOverride),
          })
          .strict()
          .default(DEFAULT_CONFIG.project.confidence.low),
      })
      .strict()
      .default(DEFAULT_CONFIG.project.confidence),
    worktrees: z
      .object({
        dependencyStrategy: z
          .literal("per_worktree")
          .default(DEFAULT_CONFIG.project.worktrees.dependencyStrategy),
        cleanupAfterDays: positiveInteger.default(
          DEFAULT_CONFIG.project.worktrees.cleanupAfterDays,
        ),
        maxPerProject: positiveInteger.default(DEFAULT_CONFIG.project.worktrees.maxPerProject),
      })
      .strict()
      .default(DEFAULT_CONFIG.project.worktrees),
  })
  .strict();

export const rawConfigSchema = z
  .object({
    github: z
      .object({
        username: nonEmptyString.optional(),
      })
      .strict()
      .default({}),
    scheduler: z
      .object({
        intervalSeconds: positiveInteger.default(DEFAULT_CONFIG.scheduler.intervalSeconds),
        jitterSeconds: nonNegativeInteger.default(DEFAULT_CONFIG.scheduler.jitterSeconds),
      })
      .strict()
      .default(DEFAULT_CONFIG.scheduler),
    rateLimit: z
      .object({
        minRemainingGraphqlPoints: nonNegativeInteger.default(
          DEFAULT_CONFIG.rateLimit.minRemainingGraphqlPoints,
        ),
        minRemainingRestRequests: nonNegativeInteger.default(
          DEFAULT_CONFIG.rateLimit.minRemainingRestRequests,
        ),
        backoffOnSecondaryLimit: z
          .boolean()
          .default(DEFAULT_CONFIG.rateLimit.backoffOnSecondaryLimit),
      })
      .strict()
      .default(DEFAULT_CONFIG.rateLimit),
    daemon: z
      .object({
        defaultStartMode: z.enum(["background", "foreground"]).default(
          DEFAULT_CONFIG.daemon.defaultStartMode,
        ),
        stopBehavior: z.literal("fast").default(DEFAULT_CONFIG.daemon.stopBehavior),
        stopGraceSeconds: positiveInteger.default(DEFAULT_CONFIG.daemon.stopGraceSeconds),
        noGithubWriteAfterStopRequested: z
          .literal(true)
          .default(DEFAULT_CONFIG.daemon.noGithubWriteAfterStopRequested),
      })
      .strict()
      .default(DEFAULT_CONFIG.daemon),
    concurrency: z
      .object({
        global: positiveInteger.default(DEFAULT_CONFIG.concurrency.global),
        perProject: positiveInteger.default(DEFAULT_CONFIG.concurrency.perProject),
        perPullRequest: positiveInteger.default(DEFAULT_CONFIG.concurrency.perPullRequest),
      })
      .strict()
      .default(DEFAULT_CONFIG.concurrency),
    reviewer: z
      .object({
        backend: z.literal("codex_cli").default(DEFAULT_CONFIG.reviewer.backend),
      })
      .strict()
      .default(DEFAULT_CONFIG.reviewer),
    backends: z
      .object({
        codex_cli: z
          .object({
            command: nonEmptyString.default(DEFAULT_CONFIG.backends.codex_cli.command),
            auth: z.literal("oauth").default(DEFAULT_CONFIG.backends.codex_cli.auth),
            model: nonEmptyString.default(DEFAULT_CONFIG.backends.codex_cli.model),
            timeoutSeconds: positiveInteger.default(
              DEFAULT_CONFIG.backends.codex_cli.timeoutSeconds,
            ),
          })
          .strict()
          .default(DEFAULT_CONFIG.backends.codex_cli),
        openai_api: z
          .object({
            enabled: z.literal(false).default(DEFAULT_CONFIG.backends.openai_api.enabled),
            apiKeyEnv: nonEmptyString.default(DEFAULT_CONFIG.backends.openai_api.apiKeyEnv),
            model: nonEmptyString.default(DEFAULT_CONFIG.backends.openai_api.model),
          })
          .strict()
          .default(DEFAULT_CONFIG.backends.openai_api),
      })
      .strict()
      .default(DEFAULT_CONFIG.backends),
    artifacts: z
      .object({
        store: z.boolean().default(DEFAULT_CONFIG.artifacts.store),
        storeInput: z.boolean().default(DEFAULT_CONFIG.artifacts.storeInput),
        redaction: z.literal(true).default(DEFAULT_CONFIG.artifacts.redaction),
        retentionDays: positiveInteger.default(DEFAULT_CONFIG.artifacts.retentionDays),
      })
      .strict()
      .default(DEFAULT_CONFIG.artifacts),
    projects: z.array(rawProjectSchema).min(1),
  })
  .strict();

export type RawProjectConfig = z.input<typeof rawProjectSchema>;
export type RawConfig = z.input<typeof rawConfigSchema>;
export type EffectiveConfig = z.output<typeof rawConfigSchema>;

function normalizePath(path: (string | number)[]): ConfigErrorPathSegment[] {
  return path;
}

function pathIncludes(path: (string | number)[], segment: string): boolean {
  return path.some((part) => part === segment);
}

function codeForIssue(issue: z.ZodIssue): ConfigErrorCode {
  if (issue.code === z.ZodIssueCode.invalid_string && pathIncludes(issue.path, "repo")) {
    return "CONFIG_INVALID_REPO";
  }

  if (issue.code === z.ZodIssueCode.invalid_string && pathIncludes(issue.path, "id")) {
    return "CONFIG_INVALID_PROJECT_ID";
  }

  if (issue.code === z.ZodIssueCode.invalid_enum_value) {
    return "CONFIG_INVALID_ENUM";
  }

  if (
    issue.code === z.ZodIssueCode.too_small ||
    issue.code === z.ZodIssueCode.too_big
  ) {
    return "CONFIG_INVALID_BOUNDS";
  }

  if (
    issue.code === z.ZodIssueCode.invalid_literal &&
    typeof issue.expected === "string" &&
    typeof issue.received === "string"
  ) {
    return "CONFIG_INVALID_ENUM";
  }

  if (
    issue.code === z.ZodIssueCode.invalid_literal &&
    typeof issue.expected === "string"
  ) {
    return "CONFIG_SCHEMA_INVALID";
  }

  if (issue.code === z.ZodIssueCode.invalid_literal) {
    return "CONFIG_POLICY_VIOLATION";
  }

  return "CONFIG_SCHEMA_INVALID";
}

function errorsFromIssues(issues: z.ZodIssue[]): ConfigError[] {
  return issues.map((issue) =>
    makeConfigError({
      code: codeForIssue(issue),
      path: normalizePath(issue.path),
      message: issue.message,
    }),
  );
}

function duplicateProjectIdErrors(config: EffectiveConfig): ConfigError[] {
  const seen = new Map<string, number>();
  const errors: ConfigError[] = [];

  config.projects.forEach((project, index) => {
    const firstIndex = seen.get(project.id);
    if (firstIndex === undefined) {
      seen.set(project.id, index);
      return;
    }

    errors.push(
      makeConfigError({
        code: "CONFIG_DUPLICATE_PROJECT_ID",
        path: ["projects", index, "id"],
        message: `Project id "${project.id}" duplicates project at index ${firstIndex}.`,
        metadata: { projectId: project.id, firstIndex, index },
      }),
    );
  });

  return errors;
}

export function buildEffectiveConfig(input: unknown): ConfigResult<EffectiveConfig> {
  const parsed = rawConfigSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, errors: errorsFromIssues(parsed.error.issues) };
  }

  const duplicateErrors = duplicateProjectIdErrors(parsed.data);
  if (duplicateErrors.length > 0) {
    return { ok: false, errors: duplicateErrors };
  }

  return { ok: true, value: parsed.data };
}
