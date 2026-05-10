# Threat Model

## Assets

Protected assets include:

- GitHub identity and permissions available through the signed-in `gh` user.
- GitHub review writes posted as the user.
- Repository source code and pull request metadata.
- Local project profiles and review prompts.
- Codex inputs and outputs.
- Redacted and raw-in-memory artifacts.
- State database entries used for dedupe, eligibility, and audit.
- Worktrees under the tool's data directory.
- Logs and diagnostics.
- Local configuration, tokens, environment variables, and filesystem paths.

## Risks and Mitigations

### `gh` Auth Misuse

Risk: the daemon could use the wrong GitHub identity, over-broad permissions, or
unexpected `gh` behavior to read or write outside the user's intent.

Mitigations:

- `doctor` validates authenticated user, configured username match, and repo
  access.
- GitHub access is centralized in one gateway.
- Only configured repositories are polled.
- Changes to authentication, permissions, tokens, or `gh` usage require user
  approval.
- Diagnostics report identity and access health without exposing secrets.

### Token, Prompt, and Artifact Leakage

Risk: tokens, prompts, source snippets, or review artifacts could leak through
logs, diagnostics, persisted artifacts, or GitHub review text.

Mitigations:

- Redact secret-looking values before artifact persistence.
- Redact command output before including it in GitHub reviews.
- Keep real project profiles and local state outside managed repositories.
- Store artifacts according to configured retention.
- Treat Codex input and output as sensitive until redacted and validated.
- Test redaction against tokens, authorization headers, environment variables,
  private paths when configured, prompts, and artifact payloads.

### Duplicate or Stale Comments

Risk: polling retries, daemon restarts, re-review requests, or race conditions
could post duplicate reviews or stale comments against an outdated head SHA.

Mitigations:

- Track PR head SHA and effective reviewed state in SQLite.
- Include hidden markers in tool-authored review content for dedupe and audit.
- Re-check PR openness, head SHA, reviewer request state, and dedupe state
  immediately before GitHub writes.
- Skip same-head re-review requests after `CHANGES_REQUESTED` and log them
  locally.
- Mark state changes observed during an in-flight job for recheck after the job
  ends.

### Incorrect Anchoring

Risk: inline comments could attach to the wrong file or line, or to lines not
changed by the PR.

Mitigations:

- Anchor inline comments only to changed PR lines.
- Put unanchorable findings in the summary as unanchored findings.
- Keep unanchored blocking findings decision-impacting.
- Validate reviewer output location data before assembly.
- Use fixtures that cover renamed files, deleted lines, generated diffs, and
  line-offset edge cases when implementation reaches anchoring.

### No-Write-After-Stop

Risk: a user could request `stop` but an in-flight process could still submit a
GitHub review or comment.

Mitigations:

- `stop` sets a state checked before every GitHub write.
- Child processes receive a short grace period before termination.
- The GitHub gateway refuses writes after stop is requested.
- Tests cover stop before review assembly, stop after Codex output, and stop
  between final preflight and submit.

### Invalid Codex Output

Risk: Codex could return malformed JSON, low-quality findings, policy-violating
decisions, or content that should not be posted.

Mitigations:

- Schema-validate Codex output before review assembly.
- Treat timeout, process failure, and invalid output as local failures with no
  GitHub write.
- Enforce v1 decision policy in code rather than trusting model output.
- Keep low-confidence findings from affecting `REQUEST_CHANGES`.
- Redact model output before persistence and before any review payload.

### Policy Drift

Risk: implementation could gradually diverge from documented safety policy,
especially around `REQUEST_CHANGES`, dedupe, same-head skip, auto-approval, and
low-confidence handling.

Mitigations:

- Keep safety-critical behavior in durable docs and contracts.
- Require user approval before policy-changing edits.
- Add pure policy tests for decision rules and eligibility before product
  implementation relies on them.
- Record significant policy or architecture decisions in `docs/adr/`.
- Review this threat model whenever GitHub write behavior changes.

### Redaction Gaps

Risk: new artifact types, diagnostics, or failure modes could bypass redaction.

Mitigations:

- Route all persisted artifacts and externally visible command output through a
  shared redaction layer.
- Add fixture coverage when new artifact fields or diagnostic outputs are
  introduced.
- Keep local setup failures off GitHub.
- Cap included failure output to the configured tail after redaction.
- Treat redaction scope changes as approval-boundary changes.

## Review Cadence

Review this threat model:

- Before the first product implementation PR that writes to GitHub.
- Before adding or changing reviewer backends.
- Before changing authentication, token handling, permissions, or `gh` usage.
- Before changing artifact storage scope, retention, or redaction behavior.
- Before changing review decision policy, dedupe behavior, anchoring behavior,
  or no-write-after-stop behavior.
- After any security-relevant bug, leaked data incident, or duplicate/stale
  review incident.

At each review, update assets, risks, mitigations, and quality invariants
together so the harness stays aligned with implementation.
