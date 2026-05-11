# CLI Config Validation Spec

## Status

This spec defines the first read-only CLI implementation slice after the
completed config-core slice. The slice is implemented and covered by the
repository verification command. The implementation plan is
`docs/plans/2026-05-11-cli-config-validation.md`.

## Purpose

Expose the implemented config core through read-only local CLI commands so a
user or agent can validate local configuration and inspect configured projects
before any daemon, GitHub, Codex, state, worktree, or artifact runtime exists.

This slice makes configuration validation executable from the command line
without expanding product authority. It must not contact GitHub, invoke Codex,
start background processes, create worktrees, persist review artifacts, or write
to external services.

## Commands

The slice adds these commands:

```sh
codex-co-reviewer project validate
codex-co-reviewer project validate --json
codex-co-reviewer project list
codex-co-reviewer project list --json
codex-co-reviewer --help
```

`project validate` loads the configured YAML file through
`loadConfigFromFile`, applies config defaults, validates schema and policy
invariants, resolves configured paths, and reports whether the configuration is
usable by later product slices.

`project list` loads the same effective configuration and prints configured
project ids and GitHub repository identifiers. Text output must not include
local absolute paths, prompt contents, command output, token values, artifact
content, or raw config payloads.

`--help` prints supported commands and path flags.

## Path Inputs

The CLI supports path flags for deterministic tests and local scripted use:

```sh
--config <path>
--config-root <path>
--data-root <path>
--state-root <path>
--log-root <path>
```

When path flags are not provided, the CLI resolves macOS-compatible local paths
from the user's home directory and XDG environment variables:

```text
~/.config/codex-co-reviewer/config.yaml
~/.config/codex-co-reviewer
~/.local/share/codex-co-reviewer
~/.local/state/codex-co-reviewer
~/.local/state/codex-co-reviewer/logs
```

The default path resolver must be isolated from config path-safety validation.
It chooses tool roots and config file locations. The existing config loader
continues to enforce whether configured project paths, prompt files, and
context files are safe and accessible.

## Output Contract

Exit codes:

- `0`: command succeeded.
- `1`: configuration validation failed.
- `2`: CLI usage error or unexpected local runtime error.

Text success output:

```text
Configuration is valid. Projects: 1
```

Text project list output:

```text
alpha	owner/repo
```

Text validation failure output begins with:

```text
Configuration is invalid.
```

Validation failure details must use `ConfigError.redactedMessage`, never raw
`ConfigError.message`.

JSON success output for validation:

```json
{
  "ok": true,
  "projectCount": 1
}
```

JSON success output for project list:

```json
{
  "ok": true,
  "projects": [
    {
      "id": "alpha",
      "repo": "owner/repo"
    }
  ]
}
```

JSON validation failure output must include redacted error messages only:

```json
{
  "ok": false,
  "errors": [
    {
      "code": "CONFIG_PATH_NOT_FOUND",
      "path": ["projects", 0, "promptFile"],
      "message": "Configured config path does not exist. Path: [REDACTED_PATH]",
      "metadata": {
        "projectId": "alpha"
      }
    }
  ]
}
```

JSON output must not expose raw local paths from config errors, prompt content,
authorization headers, tokens, environment secrets, or raw config payloads.

## Module Boundaries

The CLI implementation should introduce a thin layer above `src/config`:

- Platform path resolution chooses default config, data, state, and log roots.
- Argument parsing recognizes only supported commands and flags.
- Project command handlers call `loadConfigFromFile`.
- Output helpers produce deterministic text and JSON.
- The executable entrypoint wires process argv, stdout, stderr, and exit code to
  the pure command handlers.

The slice must not add `gh` calls, GitHub API calls, Codex execution, SQLite
state, daemon lifecycle management, worktree management, artifact persistence,
or review orchestration.

## Safety Requirements

- No GitHub reads or writes.
- No authentication, token, permission, or `gh` invocation changes.
- No review decision policy changes.
- No artifact storage scope, retention, or redaction policy changes.
- No daemon process management.
- No local setup command execution.
- No project prompt printing.
- No raw config error message printing when a redacted message exists.

## Tests

The implementation must add deterministic local tests for:

- Default path root resolution from a provided home directory.
- XDG path root overrides.
- CLI path flag overrides.
- Supported command parsing.
- Unsupported command and missing flag-value usage errors.
- Text and JSON output formatting.
- Redacted validation failure output.
- `project validate` against a materialized valid config fixture.
- `project list` against a materialized valid config fixture.
- CLI entrypoint help and usage-error behavior.

The default test suite must continue to avoid live GitHub, live Codex,
wall-clock-sensitive assertions, and dependence on the user's real local
configuration.

## Documentation Updates

After implementation, `README.md` should distinguish planned commands from
implemented commands and state that the implemented commands validate and list
local configuration only.

After implementation, `docs/specs/0001-config-core.md` should mention these
read-only CLI commands as consumers of config-core rather than listing all CLI
commands as out of scope.

## Acceptance Criteria

- `codex-co-reviewer project validate` validates local config through
  `loadConfigFromFile`.
- `codex-co-reviewer project list` prints only project ids and repositories in
  text mode.
- `--json` returns deterministic JSON for success and validation failures.
- Validation failure output uses redacted messages in text and JSON modes.
- CLI path flags allow tests to use temporary fixtures.
- The command set does not call `gh`, Codex, SQLite, worktree code, daemon code,
  or artifact storage.
- `npm run verify` exits with code `0`.
- The durable documentation placeholder scan returns no matches from new or
  changed docs.

## Implementation Plans

- `docs/plans/2026-05-11-cli-config-validation.md`
