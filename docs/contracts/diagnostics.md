# Diagnostics Contract

## Scope

Diagnostics explain daemon health, configuration validity, scan decisions, and
per-PR eligibility without mutating GitHub or triggering reviews.

Diagnostic commands may read local configuration, local state, logs, artifacts,
and GitHub metadata needed for explanation. They must redact sensitive content
before output.

## Commands

`status` reports daemon state, last poll success, current rate-limit state,
active or queued jobs, and project health.

`doctor` validates `gh` authentication, configured username match, repository
access, config schema, local paths, worktree root permissions, SQLite
migrations, artifact directory access, and Codex CLI availability.

`scan [--project id]` performs a deterministic dry pass over configured
projects and prints eligible or skipped PRs with reasons. It does not enqueue
reviews.

`why owner/repo#123` explains why a specific PR was or was not reviewed,
including eligibility, latest known head SHA, dedupe state, review request
state, CI or verification status, setup status, and recent local failures when
available.

## Safety Rules

Diagnostics must not:

- Trigger Codex reviews.
- Enqueue review jobs.
- Submit GitHub reviews or comments.
- Change review requests, labels, checks, branches, or repository state.
- Persist new review artifacts except ordinary redacted diagnostic logs when
  logging is enabled.
- Print unredacted tokens, prompts, artifact content, command output, or
  private local paths configured as sensitive.

Diagnostic output should be deterministic enough to support tests and useful
enough that users do not need to inspect SQLite or raw logs for ordinary
explanations.
