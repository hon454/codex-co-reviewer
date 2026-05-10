# codex-co-reviewer Design

## Purpose

`codex-co-reviewer` is a personal local daemon for GitHub PR review requests.
It is intended to run only while the user is working. It uses deterministic
polling and preflight checks to decide when a PR is ready for review, then uses
Codex only for the deep code-review step.

## Non-Goals

- No webhook or tunnel requirement in v1.
- No automatic approval in v1.
- No project profiles committed to managed project repositories.
- No review execution triggered by raw `synchronize` or review-thread-resolved
  events.
- No GitHub comments for local setup failures.

## Runtime Model

The daemon runs on the user's machine.

- v1 target: macOS.
- Future target: Windows.
- GitHub identity: the currently authenticated `gh` CLI user.
- Review backend: Codex CLI with OAuth.
- Future backend: OpenAI API key backend behind the same reviewer interface.

The default `start` command launches a background daemon. `start --foreground`
is retained for development and debugging.

`stop` is a fast shutdown command. After stop is requested, no new GitHub review
or comment should be written. In-flight child processes should be terminated
with a short grace period.

`restart` is defined as fast `stop` followed by background `start`.

## Configuration

The repository contains examples only. Real configuration lives under the
user's config directory.

Configuration combines structured safety policy with free-form project review
prompts.

The structured policy controls risky behavior such as posting, resolving,
deduplication, local verification, artifact storage, and rate-limit backoff.
The free-form prompt captures the project's review priorities and conventions.

## Polling

v1 uses polling rather than webhooks.

Default scheduler:

```yaml
scheduler:
  intervalSeconds: 120
  jitterSeconds: 20
```

Only configured repositories are polled. Search API is avoided for the normal
loop. Each project should use a compact repo-scoped query to find open PRs that
currently request review from the configured or detected GitHub user.

The daemon should back off when GitHub rate-limit remaining values fall below
configured thresholds.

## Review Triggers

A Codex review can start only when all baseline preconditions pass:

- PR is in a configured repository.
- PR is open.
- PR is not draft.
- The configured or detected GitHub user is currently requested as reviewer.
- The current PR head SHA has not already been reviewed for the same effective
  state.

Supported trigger classes:

- New non-draft PR review request.
- Draft PR becomes ready for review while the user is requested as reviewer.
- Re-review request after the user's latest review was `CHANGES_REQUESTED`.
- Reopened PR where the user is still requested as reviewer.
- Startup catch-up scan for eligible missed requests.
- Manual review command.

For re-review after changes requested:

- The user's latest submitted review must be `CHANGES_REQUESTED`.
- The current head SHA must differ from the last head SHA reviewed by this
  tool.
- Same-head re-review requests are skipped and logged locally.

## CI and Verification

CI is checked before Codex deep review.

- Pending CI waits up to a configured timeout.
- Failing CI produces a deterministic, human-readable `REQUEST_CHANGES` review
  and skips Codex.
- Passing CI allows lightweight local verification to run.

Local verification:

- Project profiles define lightweight commands.
- Failing lightweight commands produce a deterministic `REQUEST_CHANGES`
  review and skip Codex.
- Failure output included in the PR review is redacted and limited to the last
  configured number of lines.

Local setup commands are separate from verification. Setup failures are treated
as local agent/environment failures and are logged locally without writing to
GitHub.

## Worktrees

Reviews use dedicated per-PR worktrees under the tool's data directory.

Example:

```text
~/.local/share/codex-co-reviewer/
  repos/
  worktrees/
    {PROJECT_ID}/
      pr-123/
      pr-124/
```

Initial concurrency defaults:

```yaml
concurrency:
  global: 2
  perProject: 1
  perPullRequest: 1
```

If a new event/state change is observed while a PR job is running, the current
job is not cancelled. The daemon marks that PR for recheck after the current
job ends.

## Reviewer Backend

The backend interface should allow multiple review engines.

v1 implementation:

```yaml
reviewer:
  backend: codex_cli
```

Planned backend:

```yaml
backends:
  openai_api:
    enabled: false
```

Codex output must be schema-validated before anything is posted to GitHub. If
Codex times out, fails, or returns invalid JSON, the daemon logs the failure and
does not post a GitHub review.

## Review Output

Deep review posts inline comments plus a summary review.

Decision policy:

- Blocking findings present: `REQUEST_CHANGES`.
- No blocking findings: `COMMENT`.
- Optional questions only: `COMMENT`.
- No findings: `COMMENT` noting that no additional blocking issues were found.
- `APPROVE` is not used in v1.

Line anchoring:

- Findings that can be anchored to a changed PR line are posted as inline
  comments.
- Findings that cannot be anchored are included in the summary as unanchored
  findings.
- Unanchored blocking findings still affect the review decision.

Low-confidence findings:

- Default mode: summary `Optional questions`.
- They never affect `REQUEST_CHANGES`.
- They are capped per review.
- Profiles may opt into inline question mode later.

All tool-authored review content should include a hidden marker for deduping
and audit.

## Artifacts

Artifacts are stored by default.

```yaml
artifacts:
  store: true
  storeInput: true
  redaction: true
  retentionDays: 30
```

Stored artifacts include redacted review input, Codex output, final review body,
inline comment payloads, and the final decision.

Secret-looking values must be redacted before artifact persistence.

## Diagnostics

v1 diagnostic commands:

```sh
codex-co-reviewer status
codex-co-reviewer doctor
codex-co-reviewer scan [--project id]
codex-co-reviewer why owner/repo#123
```

`status` reports daemon state, last poll success, current rate-limit state, and
project health.

`doctor` validates `gh` auth, configured username match, repo access, config
schema, local paths, worktree root permissions, SQLite migrations, and Codex CLI
availability.

`scan` performs a deterministic dry pass over configured projects and prints
eligible/skipped PRs with reasons.

`why` explains why a specific PR was or was not reviewed.

## Notifications Roadmap

Notifications are out of v1 scope but should be planned for:

- setup command failed
- Codex review failed
- local verification failed
- CI failure review submitted
- review submitted
- rate-limit backoff
- daemon stopped unexpectedly

macOS notifications should come first, with Windows notifications planned after
Windows runtime support.
