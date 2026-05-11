export const DEFAULT_CONFIG = {
  scheduler: {
    intervalSeconds: 120,
    jitterSeconds: 20,
  },
  rateLimit: {
    minRemainingGraphqlPoints: 500,
    minRemainingRestRequests: 500,
    backoffOnSecondaryLimit: true,
  },
  daemon: {
    defaultStartMode: "background",
    stopBehavior: "fast",
    stopGraceSeconds: 10,
    noGithubWriteAfterStopRequested: true,
  },
  concurrency: {
    global: 2,
    perProject: 1,
    perPullRequest: 1,
  },
  reviewer: {
    backend: "codex_cli",
  },
  backends: {
    codex_cli: {
      command: "codex",
      auth: "oauth",
      model: "default",
      timeoutSeconds: 1800,
    },
    openai_api: {
      enabled: false,
      apiKeyEnv: "OPENAI_API_KEY",
      model: "gpt-5.2",
    },
  },
  artifacts: {
    store: true,
    storeInput: true,
    redaction: true,
    retentionDays: 30,
  },
  project: {
    contextFiles: [],
    triggers: {
      reviewRequested: true,
      readyForReview: true,
      rereviewRequestedAfterMyChangesRequested: true,
      reopenedWithMeStillRequested: true,
      catchUpOnStart: true,
      manual: true,
    },
    policy: {
      skipDraft: true,
      autoApprove: false,
      duplicateReviewBehavior: "skip_same_head_sha",
    },
    rereview: {
      requiresMyLatestReviewState: "CHANGES_REQUESTED",
      requiresRequestedReviewerIsMe: true,
      requiresHeadShaChanged: true,
      sameHeadShaBehavior: "skip_and_log",
    },
    setup: {
      onFailure: "log_only_skip_review",
      commands: [],
    },
    verification: {
      githubCi: {
        enabled: true,
        pendingTimeoutSeconds: 300,
        onFailure: "request_changes_and_skip_deep_review",
      },
      local: {
        mode: "lightweight",
        commands: [],
        failureOutput: {
          includeInReview: true,
          maxLines: 80,
          redaction: true,
        },
      },
    },
    confidence: {
      low: {
        mode: "summary_possible_concerns",
        maxPerReview: 3,
        contributesToDecision: false,
        allowInlineQuestionOverride: true,
      },
    },
    worktrees: {
      dependencyStrategy: "per_worktree",
      cleanupAfterDays: 7,
      maxPerProject: 10,
    },
  },
} as const;
