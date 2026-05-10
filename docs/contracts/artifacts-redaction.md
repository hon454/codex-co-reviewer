# Artifacts and Redaction Contract

## Scope

Artifacts provide local audit and debugging evidence. They are stored under the
tool's local data directory and are never committed to managed repositories.

macOS v1 stores artifacts under:

```text
~/.local/share/codex-co-reviewer/artifacts/
```

## Stored Artifacts

When enabled by config, the artifact store may persist:

- Review eligibility and preflight inputs.
- Redacted Codex input and output.
- Deterministic CI or local verification results.
- Final review summary bodies.
- Inline review payloads.
- Decision records, dedupe markers, and skip reasons.
- Local failure records for setup, config, backend, filesystem, or validation
  failures.

Artifacts must reference project ID, repository, PR number, head SHA, attempt,
and retention metadata where applicable.

## Redaction Before Persistence

Secret-looking values must be redacted before persistence. Redaction applies to
inputs, prompts, command output, Codex output, review bodies, inline payloads,
logs intended for artifact storage, and diagnostics that surface artifact
content.

Redaction must cover tokens, API keys, authorization headers, environment
variables, prompt payloads, and private paths when configured as sensitive.
Unredacted values may exist only transiently in memory for the minimum time
needed to perform the review.

If required redaction fails, the artifact must not be written and any GitHub
write that depends on the same content must be blocked.

## Verification Output

Failure output included in deterministic GitHub reviews must be redacted and
limited to the configured tail line count. The default example uses
`maxLines: 80`; implementation must treat the configured limit as a hard cap.

Full local command output may be retained only as a redacted local artifact
when artifact policy allows it.

## Retention

Artifacts are retained according to configured retention policy. Retention
metadata must be stored with enough information for cleanup to remove expired
artifacts without touching source repositories, local profiles, logs outside
the artifact scope, or active worktrees.

Changing storage scope, retention behavior, or redaction behavior requires
explicit user approval.

## Local Setup Failures

Local setup failures are agent or environment failures. They are logged and may
be stored as redacted local artifacts, but they must not produce GitHub
comments, reviews, requested-review changes, or any other GitHub write.
