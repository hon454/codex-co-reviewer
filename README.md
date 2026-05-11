# codex-co-reviewer

Personal GitHub pull request review daemon powered by Codex.

`codex-co-reviewer` runs locally during your workday, watches configured
repositories for review requests assigned to you, and uses Codex to prepare
line-specific PR reviews from project-specific local profiles.

## Status

Design and repository harness scaffold with config-core and read-only config
CLI commands in place. Daemon, GitHub review orchestration, and review runtime
implementation have not started yet.

## Repository Harness

This repository uses a contract-first harness for Codex-led development.

- `AGENTS.md` is the Codex entrypoint.
- `docs/architecture.md` describes module boundaries.
- `docs/development.md` describes the Codex operating loop.
- `docs/quality.md` defines completion and verification standards.
- `docs/threat-model.md` tracks product-specific risks.
- `docs/specs/` records durable product specs before implementation plans.
- `docs/plans/` records durable implementation plans that link back to specs.
- `docs/contracts/` contains safety contracts that implementation must preserve.
- `docs/adr/` records important decisions.

The previous single design scaffold has been replaced by these durable harness
documents so future implementation work has sharper boundaries.

## Goals

- Run as a local background daemon.
- Use `gh` CLI authentication so reviews are posted as the signed-in user.
- Poll configured repositories instead of requiring webhooks or tunnels.
- Keep project profiles in local user config, outside project repositories.
- Use per-PR review worktrees so the user's working directories are untouched.
- Post inline comments plus a summary review.
- Leave deterministic review comments for CI or lightweight check failures
  without invoking Codex.
- Store redacted local review artifacts for audit and debugging.
- Support Codex CLI with OAuth in v1, while leaving room for an OpenAI API
  backend later.

## Implemented Commands

```sh
codex-co-reviewer project validate
codex-co-reviewer project list
```

These commands validate and display local project configuration only. They do
not contact GitHub, invoke Codex, start the daemon, create worktrees, persist
artifacts, or submit reviews.

## Planned Commands

```sh
codex-co-reviewer init
codex-co-reviewer start
codex-co-reviewer start --foreground
codex-co-reviewer stop
codex-co-reviewer restart
codex-co-reviewer status
codex-co-reviewer doctor
codex-co-reviewer scan [--project id]
codex-co-reviewer why owner/repo#123
codex-co-reviewer project add
```

## Local Files

Profiles and state are local-only and must not be committed to this repository.

macOS v1 paths:

```text
~/.config/codex-co-reviewer/config.yaml
~/.config/codex-co-reviewer/profiles/<project>/review.md
~/.local/share/codex-co-reviewer/state.sqlite
~/.local/share/codex-co-reviewer/artifacts/
~/.local/share/codex-co-reviewer/worktrees/
~/.local/state/codex-co-reviewer/logs/
```

Windows support is planned. Path handling should be implemented through a
platform-aware resolver rather than hard-coded user paths.

## Examples

See:

- `examples/config.example.yaml`
- `examples/profiles/PROJECT_ID/review.example.md`

Example placeholders are written in braces, such as `{PROJECT_ID}` and
`{OWNER}/{REPO}`. Real project profiles belong in the user's local config
directory.
