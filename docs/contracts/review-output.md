# Review Output Contract

## Scope

Codex output is untrusted input. It must be parsed, schema-validated, redacted,
anchored, and mapped through local decision policy before any GitHub review or
comment is prepared.

## Required Validation

The reviewer backend must accept only structured output that matches the
configured schema. Validation must confirm required fields, allowed severities,
confidence values, location data, summary fields, and decision candidates.

Invalid, malformed, timed-out, or failed Codex output is a local failure. It may
be logged and stored as a redacted artifact, but it must not produce a GitHub
review, inline comment, issue comment, or requested-review change.

The review assembler must enforce v1 policy itself. It must not trust a model
to decide whether a finding is blocking, whether a write is allowed, or whether
`APPROVE` can be used.

## Anchoring

Inline findings may be posted only when they anchor to changed PR lines in the
reviewed head SHA. The assembler must validate file paths, sides, and line
numbers against GitHub diff metadata before building an inline payload.

Findings that cannot be safely anchored are included in the summary as
unanchored findings. Unanchored blocking findings still affect the final review
decision.

## Low-Confidence Findings

Low-confidence findings are optional questions by default. They are summary
only, capped per review, and do not contribute to `REQUEST_CHANGES`.

Project prompts may ask Codex to phrase low-confidence concerns clearly, but
structured policy decides whether any limited inline question behavior is
allowed.

## Decision Mapping

Final review decisions are derived from validated findings and deterministic
preflight results:

- Blocking finding present: `REQUEST_CHANGES`.
- No blocking findings: `COMMENT`.
- Optional questions only: `COMMENT`.
- No findings: `COMMENT` stating that no additional blocking issues were found.

`APPROVE` is prohibited in v1, even if Codex suggests it and even when no
findings are present.

## Redaction and Dedupe

Review bodies, inline comment bodies, summaries, and hidden dedupe markers must
pass redaction checks before submission. Tool-authored reviews include hidden
markers suitable for dedupe and audit.

If redaction fails or dedupe detects an existing tool-authored review for the
same effective state, the system must not submit another GitHub review.
