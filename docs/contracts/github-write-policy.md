# GitHub Write Policy Contract

## Scope

All GitHub writes are safety-critical. A GitHub write includes pull request
reviews, inline review comments, issue comments, review request changes, labels,
statuses, checks, branch writes, or any other externally visible mutation made
through `gh` or the GitHub API.

v1 review writes are limited to review submission through the GitHub gateway.
No other module may write to GitHub directly.

## Required Preconditions

Immediately before any GitHub write, the gateway must confirm:

- Stop has not been requested.
- The write belongs to a configured repository.
- The PR is still open and eligible.
- The reviewed head SHA and effective state still match current GitHub state.
- The requested reviewer condition still applies when required by policy.
- CI, setup, and local verification states allow this write class.
- Codex output is schema-valid when the write depends on Codex.
- The review decision is allowed by v1 policy.
- Dedupe checks find no existing tool-authored review for the same effective
  state.
- Inline comments anchor only to changed PR lines.
- Review body, inline bodies, deterministic failure output, and markers have
  passed redaction checks.

Failure of any precondition prevents the write and records a local diagnostic
or artifact entry after redaction.

## Prohibited Writes

The system must never write to GitHub in these cases:

- After stop has been requested.
- After local setup failure.
- After invalid, malformed, timed-out, or failed Codex output.
- Directly from policy, orchestration, diagnostics, reviewer backend, artifact,
  worktree, or configuration code.
- To post `APPROVE` in v1.
- To compensate for local daemon, auth, config, filesystem, or environment
  failures.
- To duplicate a tool-authored review for the same effective PR state.
- To comment on lines that are not changed PR lines.

Deterministic `REQUEST_CHANGES` reviews for failing CI or configured lightweight
verification are allowed only when all write preconditions pass and the failure
output has been redacted and line-limited.

## Approval Boundary

Changes to write behavior, decision policy, auto-approval, dedupe, same-head
skip, low-confidence handling, authentication, tokens, permissions, or `gh`
usage require explicit user approval before implementation.
