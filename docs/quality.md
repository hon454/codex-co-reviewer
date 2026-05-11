# Quality

## Definition of Done

A change is done when it is intentionally scoped, preserves the approval
boundaries in `AGENTS.md`, updates durable docs for changed behavior, and passes
the repository's required verification.

For product implementation, done also means:

- Behavior is covered by deterministic tests or fixtures appropriate to the
  risk.
- GitHub writes are guarded by policy, dedupe, anchoring, redaction, and
  stop-state checks.
- Invalid Codex output cannot reach GitHub.
- Diagnostics explain important skipped, failed, and completed states.
- Artifacts are redacted according to policy before persistence.
- Idempotency invariants are demonstrated for repeated polling and retries.

## Test Strategy

The first executable test suite is fixture-first and deterministic. Config-core
tests exercise policy and local validation without live GitHub or live Codex
dependencies. Live integration checks can exist later, but they must be opt-in
and clearly separated from local verification.

Priority test layers:

- Pure policy tests for eligibility, decision policy, low-confidence handling,
  dedupe, same-head skips, and no-write-after-stop behavior.
- Fixture-based GitHub adapter tests for PR metadata, review requests, changed
  files, review threads, CI status, and rate-limit responses.
- Schema validation tests for reviewer backend output and final review payloads.
- Worktree manager tests for path resolution, isolation, cleanup, and
  concurrent PR behavior.
- Artifact tests for redaction, retention metadata, and storage scope.
- Diagnostics tests for `status`, `doctor`, `scan`, and `why` explanations.

## Deterministic Fixture-First Verification

Fixtures should model GitHub and Codex interactions as explicit inputs and
outputs. Avoid assertions that depend on wall-clock timing, network order, live
repository state, authenticated user environment, or unconstrained model text.

Use deterministic fixtures for:

- PR review request state transitions.
- Draft to ready-for-review transitions.
- Reopened PRs.
- Re-review after `CHANGES_REQUESTED`.
- Same-head re-review skip.
- Pending, passing, and failing CI.
- Local verification pass and failure output.
- Codex timeout, failure, malformed output, and valid output.
- Changed-line anchoring and unanchored findings.

## Schema Validation

All Codex output must be treated as untrusted until validated. The reviewer
backend should parse model output into a strict schema before review assembly.
Validation failures are local failures and must not produce GitHub reviews.

Schema checks should confirm:

- Required fields are present.
- Decision candidates are from the allowed v1 set.
- Findings include severity, confidence, message, and location data where
  applicable.
- Inline locations refer only to changed PR lines.
- Summary text and finding bodies pass redaction checks.
- Low-confidence findings cannot become blocking findings.

## Idempotency and Dedupe

Polling, retries, daemon restarts, and manual scans must be idempotent. The same
effective PR state should not receive duplicate tool-authored reviews.

Required invariants:

- The same PR head SHA and effective state are reviewed at most once by this
  tool unless an explicit supported trigger applies.
- Same-head re-review requests after `CHANGES_REQUESTED` are skipped and logged
  locally.
- Tool-authored review bodies include hidden markers suitable for dedupe and
  audit.
- In-flight PR work is not cancelled by newly observed state changes; the PR is
  marked for recheck after the current job ends.
- Retry after a local failure must not skip newly eligible states or duplicate
  already posted reviews.

## Redaction

Secret-looking values must be redacted before artifact persistence and before
including command output in GitHub reviews. Redaction applies to review inputs,
Codex output, final review bodies, inline payloads, logs, and diagnostics that
surface sensitive content.

Failure output included in deterministic reviews should be limited to the last
configured number of lines after redaction. Local setup failures should be
logged locally and must not produce GitHub comments.

Redaction tests should cover tokens, API keys, authorization headers, private
paths when configured as sensitive, environment variables, and prompt or
artifact payloads that contain secret-looking values.

## GitHub Write Safety

All GitHub writes go through one gateway. Before submitting a review or comment,
the system must confirm:

- Stop has not been requested.
- The PR is still open and eligible.
- The head SHA and effective state still match the reviewed state.
- The requested reviewer condition still applies when required by policy.
- The review decision is allowed by v1 policy.
- Dedupe checks find no existing tool-authored review for the same effective
  state.
- Inline comments anchor only to changed PR lines.
- Review body and comments pass redaction checks.

`APPROVE` is not used in v1. Changes to GitHub write behavior or review
decision policy require explicit user approval.

## Diagnostics Expectations

Diagnostics should make the daemon understandable without requiring users to
inspect SQLite or logs directly.

- `status` reports daemon state, last poll success, current rate-limit state,
  and project health.
- `doctor` validates `gh` auth, configured username match, repo access, config
  schema, local paths, worktree root permissions, SQLite migrations, and Codex
  CLI availability.
- `scan` performs a deterministic dry pass over configured projects and prints
  eligible or skipped PRs with reasons.
- `why owner/repo#123` explains why a specific PR was or was not reviewed.

Diagnostics must avoid leaking unredacted tokens, prompts, artifact content, or
private local data.

## Invariants

- No GitHub write after stop is requested.
- No automatic approval in v1.
- No GitHub comments for local setup failures.
- No Codex review when CI or lightweight verification has already produced a
  deterministic blocking review.
- No live GitHub or Codex dependency in the default local test suite.
- No committed real project profiles, tokens, local state, logs, worktrees, or
  artifacts.
- No policy-changing edits without explicit user approval.
