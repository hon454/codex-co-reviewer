# Config Core Implementation Spec

## Status

This spec records the first executable implementation slice in the repository.
The slice is complete as of the current `main` branch and is covered by the
repository verification command.

## Purpose

The config core turns local YAML configuration into a safe, typed effective
configuration for later daemon, diagnostics, and review orchestration work. It
does not start the daemon, contact GitHub, invoke Codex, create worktrees,
write artifacts, or submit reviews.

## Implemented Surface

Implemented source files:

- `src/config/defaults.ts`: conservative v1 defaults for scheduler,
  rate-limit thresholds, daemon lifecycle, concurrency, reviewer backend,
  artifact behavior, and per-project policy.
- `src/config/schema.ts`: strict Zod schemas, default application, stable
  validation error mapping, duplicate project-id checks, and effective config
  type narrowing.
- `src/config/policy.ts`: v1 safety invariant enforcement for no-write-after
  stop, artifact redaction, no auto-approval, setup failure behavior,
  low-confidence handling, and same-head re-review behavior.
- `src/config/paths.ts`: platform-aware path helpers for tool-owned paths,
  project roots, and project context files.
- `src/config/loader.ts`: YAML file loading, YAML parse error handling, schema
  validation, policy invariant checks, and path resolution.
- `src/config/errors.ts`: stable config error codes, structured metadata, and
  user-facing redaction for secrets, authorization headers, prompts, and local
  paths.
- `src/config/index.ts`: public config module exports.

Implemented fixtures and tests:

- `tests/fixtures/config/valid-basic/`: minimal valid local config fixture.
- `tests/config/schema-defaults.test.ts`: schema defaults, project id and repo
  validation, bounds, duplicate ids, and literal-backed option errors.
- `tests/config/policy-invariants.test.ts`: v1 policy invariant rejection and
  effective type narrowing.
- `tests/config/paths.test.ts`: root containment, traversal rejection, symlink
  rejection, absolute path rules, and access-mode checks.
- `tests/config/loader.test.ts`: YAML loading, path resolution, context-file
  handling, redacted parse errors, and separation of config validation from
  runtime environment validation.
- `tests/config/errors.test.ts`: stable error shape and redaction coverage.
- `tests/config/smoke.test.ts`: Vitest harness smoke coverage.

## Effective Config Behavior

`buildEffectiveConfig(input)` accepts unknown structured input, validates it
with strict schemas, applies documented defaults, rejects duplicate project ids,
enforces v1 policy invariants, and returns a discriminated result:

```ts
type ConfigResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ConfigError[] };
```

Successful results expose `EffectiveConfig`, where safety-critical relaxed
fields are narrowed to their permitted v1 values:

- `daemon.noGithubWriteAfterStopRequested` is `true`.
- `artifacts.redaction` is `true`.
- `projects[].policy.autoApprove` is `false`.
- `projects[].setup.onFailure` is `"log_only_skip_review"`.
- `projects[].confidence.low.contributesToDecision` is `false`.
- `projects[].rereview.sameHeadShaBehavior` is `"skip_and_log"`.

## YAML Loading Behavior

`loadConfigFromFile(configPath, roots)` reads a YAML config file, parses it,
builds the effective config, and resolves project paths.

It resolves:

- `projects[].promptFile` as a relative tool-owned config-root path.
- `projects[].localPath` as an absolute canonical project source path.
- `projects[].contextFiles[]` as project-relative files under the canonical
  project source path.

It returns redacted parse and path errors without throwing for ordinary config
validation failures. Runtime environment checks, such as whether the configured
Codex command exists, are outside this slice.

## Read-Only CLI Consumers

The config core is now consumed by the read-only config CLI slice:

- `codex-co-reviewer project validate`
- `codex-co-reviewer project validate --json`
- `codex-co-reviewer project list`
- `codex-co-reviewer project list --json`

These commands validate and display local project configuration only. They do
not contact GitHub, invoke Codex, start a daemon, create worktrees, persist
artifacts, or submit reviews.

## Path Safety Rules

Tool-owned config paths:

- Must be relative to the selected tool-owned root.
- Must not contain traversal or normalization surprises.
- Must remain inside the selected root before and after symlink resolution.
- Must exist and be readable.

Project local paths:

- Must be absolute.
- Must not contain traversal or normalization surprises.
- Must be configured as their canonical path.
- Must not resolve through symlinks.
- Must exist and be readable/executable.

Project context files:

- Must be relative to the canonical project local path.
- Must not contain traversal or normalization surprises.
- Must remain inside the project root before and after symlink resolution.
- Must exist and be readable.

## Error and Redaction Behavior

Config errors have stable machine-readable `code`, structured `path`, raw
`message`, redacted `redactedMessage`, and optional structured `metadata`.

User-facing redaction covers:

- Authorization headers.
- Secret-looking GitHub and OpenAI tokens.
- Secret-looking environment assignments.
- Prompt fields.
- Common absolute macOS, Linux, and Windows local paths.
- Local paths containing spaces and delimiter characters.

## Contract Alignment

This slice satisfies the configuration contract for local structured policy,
safe defaults, path handling, project profile binding, schema validation, policy
invariants, and redacted diagnostics-ready errors.

It intentionally leaves these architecture modules out of scope:

- Daemon lifecycle.
- Scheduler.
- GitHub gateway.
- SQLite state store.
- Worktree manager.
- Preflight engine.
- Reviewer backend.
- Review assembler.
- Artifact persistence.
- Product diagnostics commands.

## Verification

Required verification command:

```sh
npm run verify
```

Expected current result:

```text
typecheck passed
11 test files passed
63 tests passed
build passed
```

## Implementation Plans

This spec records an already implemented slice. No durable implementation plan
was present when the slice was created.
