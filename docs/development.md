# Development

## Codex Operating Loop

This repository uses a contract-first harness for Codex-led development. Start
each task by reading `AGENTS.md`, `README.md`, this document, the architecture
document, and any relevant contract under `docs/contracts/` before changing
behavior that affects safety, policy, persistence, or GitHub writes.

Use this loop for repository work:

1. Confirm the task scope and inspect the current worktree with
   `git status --short --ignored`.
2. Read the durable docs that govern the touched behavior.
3. Preserve edits made by others. Do not revert previous commits or unrelated
   local changes.
4. Make the smallest change that satisfies the task and keeps harness contracts
   intact.
5. Update durable docs when behavior, commands, policies, storage, or safety
   boundaries change.
6. Run the required verification for the change.
7. Summarize changed files, verification, residual concerns, and any commit or
   PR identifiers requested by the user.

Local Superpowers artifacts under `docs/superpowers/` are workflow scratch
space and are ignored by git. Product implementation plans that are meant to
guide repository work must be written under durable `docs/plans/` instead.

## Approval Boundaries

Codex may implement local code, update docs, run verification, open draft PRs
when requested, respond to CI failures, and address ordinary review feedback.

Codex must ask for user approval before:

- Any externally visible GitHub write on the user's behalf.
- Changes to authentication, tokens, permissions, or `gh` usage.
- Changes to review decision policy, including `REQUEST_CHANGES`, dedupe,
  same-head skip, auto-approval, and low-confidence handling.
- Changes to artifact storage scope, redaction behavior, or sensitive-data
  handling.

Merge decisions are user-owned.

## Branch, PR, CI, and Review Feedback Loop

Development work should happen on a task branch. The default branch prefix for
Codex-created branches is `codex/` unless the user specifies another branch.

Before opening or updating a PR:

- Inspect the worktree for unrelated edits.
- Stage only intentional changes.
- Commit with a focused message.
- Run the repository's required verification command.
- Include verification results and known concerns in the PR description or
  response.

When CI fails, inspect the failing job and logs before changing code. Prefer the
smallest fix that addresses the failure. When review feedback arrives, separate
ordinary implementation feedback from policy-changing requests. Policy-changing
requests require explicit user approval when they touch the approval boundaries
above.

Address review feedback in this order:

1. Understand the reviewer comment in context.
2. Confirm whether it is already resolved by current code.
3. Implement the focused fix when needed.
4. Re-run relevant verification.
5. Report what changed and what remains.

## Documentation Update Rules

Docs are part of the harness contract. Keep them current as implementation
starts.

- Update `docs/architecture.md` when module boundaries, runtime flow, backend
  interfaces, worktree behavior, diagnostics, or safety-critical boundaries
  change.
- Update `docs/development.md` when the repository workflow, approval
  boundaries, branch process, PR process, or verification commands change.
- Update `docs/quality.md` when definition of done, test strategy,
  verification approach, schema checks, redaction checks, or invariants change.
- Update `docs/threat-model.md` when assets, risks, mitigations, or review
  cadence change.
- Add or update `docs/contracts/` before changing safety, policy, persistence,
  or GitHub write behavior.
- Record significant architecture decisions in `docs/adr/`.

Examples may use placeholder values such as `{PROJECT_ID}` or `{OWNER}/{REPO}`.
Real project profiles, tokens, and local state belong in the user's config or
data directories, not in this repository.

## Required Verification

Product and documentation changes use the single local verification command:

```sh
npm run verify
```

For documentation-only harness work, also scan durable docs for unfinished
placeholders:

```sh
rg --no-ignore -n "T[B]D|T[O]DO|fill[[:space:]]+in|implement[[:space:]]+later" AGENTS.md README.md docs .github || true
```

Task-specific verification may add targeted read-through commands, fixture
checks, or rendered document checks.
