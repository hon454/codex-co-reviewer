# Architecture

## Purpose

`codex-co-reviewer` is a personal local daemon for GitHub pull request review
requests. It runs on the user's machine during active work periods, watches
configured repositories for PRs that request the signed-in user as reviewer, and
uses Codex to prepare line-specific reviews from local project profiles.

The product is intentionally local-first. It relies on the user's existing
GitHub identity, stores configuration and audit artifacts outside managed
project repositories, and uses deterministic preflight checks before invoking
Codex for deep review.

## Non-Goals

- No webhook or public tunnel requirement in v1.
- No automatic approval in v1.
- No project profiles committed to managed project repositories.
- No review execution triggered directly by raw `synchronize` or
  review-thread-resolved events.
- No GitHub comments for local setup failures.
- No merge decisions. Merging remains user-owned.

## Runtime Model

The daemon runs locally.

- v1 platform target: macOS.
- Future platform target: Windows.
- GitHub identity: the currently authenticated `gh` CLI user.
- Review backend in v1: Codex CLI with OAuth.
- Planned backend: OpenAI API key backend behind the same reviewer interface.

`start` launches a background daemon by default. `start --foreground` is kept
for development and debugging. `stop` is a fast shutdown command: after stop is
requested, no new GitHub review or comment may be written. In-flight child
processes should receive a short grace period before termination. `restart` is
defined as fast `stop` followed by background `start`.

Local files are platform-resolved rather than hard-coded. macOS v1 uses:

```text
~/.config/codex-co-reviewer/config.yaml
~/.config/codex-co-reviewer/profiles/<project>/review.md
~/.local/share/codex-co-reviewer/state.sqlite
~/.local/share/codex-co-reviewer/artifacts/
~/.local/share/codex-co-reviewer/worktrees/
~/.local/state/codex-co-reviewer/logs/
```

## Primary Modules

- CLI commands: `init`, `start`, `stop`, `restart`, `status`, `doctor`,
  `scan`, `why`, and project management commands.
- Configuration loader: reads structured safety policy and local free-form
  project review prompts from the user's config directory.
- Scheduler: polls configured repositories with jitter, rate-limit awareness,
  and per-project concurrency.
- GitHub gateway: owns all `gh` CLI and GitHub API reads and writes.
- State store: records PR eligibility, head SHAs, review attempts, dedupe
  markers, job status, and artifact references in SQLite.
- Worktree manager: creates and cleans per-PR review worktrees under the tool's
  data directory.
- Preflight engine: evaluates PR state, CI status, local setup, and lightweight
  verification before Codex runs.
- Reviewer backend: invokes Codex CLI in v1 and validates structured reviewer
  output before review assembly.
- Review assembler: maps findings to changed PR lines, builds summaries,
  applies decision policy, and prepares hidden dedupe markers.
- Artifact store: persists redacted review input, Codex output, final review
  bodies, inline payloads, and decisions according to retention policy.
- Diagnostics: explains daemon health, configuration validity, scan decisions,
  and per-PR eligibility.

## Dependency Direction

Runtime code should flow inward from adapters to policy.

```text
CLI / daemon entrypoints
  -> configuration, scheduler, diagnostics
    -> preflight, review orchestration, state
      -> policy and contracts
    -> adapters: GitHub gateway, Codex backend, filesystem, worktrees, SQLite
```

Policy code must not shell out to `gh`, invoke Codex, or write files directly.
Adapters return structured results that orchestration code can validate and
record. GitHub writes happen only through the GitHub gateway and only after
policy, dedupe, anchoring, redaction, and stop-state checks have passed.

## Polling and Review Flow

v1 uses polling instead of webhooks. Only configured repositories are polled.
The normal loop should avoid broad GitHub Search API usage and prefer compact
repo-scoped queries for open PRs that currently request review from the
configured or detected GitHub user.

Default scheduler:

```yaml
scheduler:
  intervalSeconds: 120
  jitterSeconds: 20
```

A Codex review can start only when all baseline preconditions pass:

- PR is in a configured repository.
- PR is open.
- PR is not draft.
- The configured or detected GitHub user is currently requested as reviewer.
- The current PR head SHA has not already been reviewed for the same effective
  state.

Supported trigger classes are:

- New non-draft PR review request.
- Draft PR becomes ready for review while the user is requested as reviewer.
- Re-review request after the user's latest review was `CHANGES_REQUESTED`.
- Reopened PR where the user is still requested as reviewer.
- Startup catch-up scan for eligible missed requests.
- Manual review command.

For re-review after changes requested, the user's latest submitted review must
be `CHANGES_REQUESTED`, the current head SHA must differ from the last head SHA
reviewed by this tool, and same-head re-review requests are skipped and logged
locally.

CI is checked before Codex deep review. Pending CI waits up to the configured
timeout. Failing CI produces a deterministic human-readable `REQUEST_CHANGES`
review and skips Codex. Passing CI allows lightweight local verification to run.
Failing lightweight verification also produces a deterministic
`REQUEST_CHANGES` review and skips Codex. Setup failures are local
agent/environment failures: they are logged locally without writing to GitHub.

Deep review posts inline comments plus a summary review. Decision policy:

- Blocking findings present: `REQUEST_CHANGES`.
- No blocking findings: `COMMENT`.
- Optional questions only: `COMMENT`.
- No findings: `COMMENT` noting that no additional blocking issues were found.
- `APPROVE` is not used in v1.

Findings anchored to changed PR lines become inline comments. Findings that
cannot be anchored are included in the summary as unanchored findings, and
unanchored blocking findings still affect the review decision. Low-confidence
findings are summary-only optional questions by default, never affect
`REQUEST_CHANGES`, and are capped per review.

## Worktrees

Reviews use dedicated per-PR worktrees under the tool's data directory so the
user's normal working directories remain untouched.

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

If a new event or state change is observed while a PR job is running, the
current job is not cancelled. The daemon marks that PR for recheck after the
current job ends.

## Reviewer Backend

The reviewer interface must allow multiple engines.

v1:

```yaml
reviewer:
  backend: codex_cli
```

Planned:

```yaml
backends:
  openai_api:
    enabled: false
```

Codex output must be schema-validated before anything is posted to GitHub. If
Codex times out, fails, or returns invalid output, the daemon logs the failure
and does not post a GitHub review.

## Diagnostics

Diagnostic commands are part of the product architecture, not optional support
scripts.

```sh
codex-co-reviewer status
codex-co-reviewer doctor
codex-co-reviewer scan [--project id]
codex-co-reviewer why owner/repo#123
```

`status` reports daemon state, last poll success, current rate-limit state, and
project health. `doctor` validates `gh` auth, configured username match, repo
access, config schema, local paths, worktree root permissions, SQLite
migrations, and Codex CLI availability. `scan` performs a deterministic dry pass
over configured projects and prints eligible or skipped PRs with reasons. `why`
explains why a specific PR was or was not reviewed.

## Safety-Critical Boundaries

These boundaries require explicit user approval before policy changes:

- GitHub write behavior, including review submission, comments, and requested
  review decisions.
- Review decision policy, including `REQUEST_CHANGES`, same-head skip, dedupe,
  auto-approval, and low-confidence handling.
- Authentication, token use, permission scope, or `gh` invocation strategy.
- Artifact storage scope, retention, redaction behavior, and sensitive-data
  handling.
- No-write-after-stop behavior.

All tool-authored review content should include a hidden marker for deduping
and audit. Secret-looking values must be redacted before artifact persistence.
