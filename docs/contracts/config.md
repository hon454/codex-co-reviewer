# Configuration Contract

## Scope

Configuration defines which repositories are reviewed, which local project
profiles guide Codex, and which safety defaults constrain daemon behavior. Real
configuration is local-only and belongs outside managed repositories.

macOS v1 reads:

```text
~/.config/codex-co-reviewer/config.yaml
~/.config/codex-co-reviewer/profiles/<project>/review.md
```

The repository may contain examples, but never real project profiles, tokens,
state, logs, worktrees, or review artifacts.

## Policy and Prompts

Configuration has two different kinds of input:

- Structured policy: machine-validated YAML for repositories, triggers,
  concurrency, daemon lifecycle, verification, confidence handling, artifacts,
  and backend selection.
- Project prompts: free-form local review guidance loaded from each project's
  configured `promptFile`.

Structured policy is authoritative for safety behavior. Project prompts may
guide review priorities and style, but they cannot grant GitHub write
permission, change review decisions, weaken redaction, bypass dedupe, enable
auto-approval, or override stop-state checks.

## Safe Defaults

Defaults must be conservative:

- Poll only configured repositories.
- Skip draft PRs.
- Use `COMMENT` or `REQUEST_CHANGES`; never `APPROVE` in v1.
- Treat setup failures as local failures with no GitHub write.
- Require schema-valid Codex output before review assembly.
- Redact artifacts before persistence.
- Skip same-head re-review requests after `CHANGES_REQUESTED` and log locally.
- Refuse GitHub writes after stop is requested.

Missing optional fields must resolve to these defaults or fail validation when a
safe default is not meaningful.

## Path Handling

All local paths must be resolved through a platform-aware path resolver. Product
code must not hard-code user home paths. Relative paths in config are resolved
relative to the local config root unless a field explicitly documents another
base.

Tool-owned paths must not escape the allowed config, data, state, log,
artifact, or worktree roots through symlinks or traversal. Project source paths,
such as `projects[].localPath`, may live outside those roots. They must resolve
to absolute canonical paths, must not traverse unexpectedly through relative
segments or symlinks, and must be checked for existence and access before any
operation that reads, copies, or runs commands from them. Worktrees are created
under the tool's data directory, not inside the user's normal working
directories.

## Project Profiles

Each project profile binds a stable project `id` to a single repository and a
local prompt file. Project IDs are used for state, artifacts, worktrees, and
diagnostics, so they must be stable, unique, filesystem-safe, and validated
before use.

Project prompts are sensitive local input. They may be included in Codex input,
but any persisted copy or diagnostic excerpt must pass through redaction.

## Validation Expectations

`init`, `project validate`, `doctor`, `start`, and any review-producing path
must validate effective configuration before use. Validation must check schema,
types, enum values, required fields, path safety, repository identity,
concurrency bounds, timeout bounds, retention bounds, backend availability, and
policy invariants.

Invalid configuration prevents review execution and GitHub writes. Diagnostic
commands may report validation errors after redaction, but must not trigger
reviews.
