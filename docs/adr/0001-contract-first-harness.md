# ADR 0001: Contract-First Repository Harness

Date: 2026-05-11

Status: Accepted

## Context

`codex-co-reviewer` is built for Codex-led development. Codex will help design,
implement, verify, and maintain the repository, so the project needs durable
instructions that survive individual sessions and keep future work aligned.

The product will eventually perform externally visible GitHub review actions on
the user's behalf, including pull request reviews and inline comments. Those
actions depend on safety-sensitive behavior: authentication through `gh`,
review decision policy, dedupe, redaction, artifact storage, and stop-state
checks. These boundaries need to be explicit before product implementation
starts.

## Decision

Use a contract-first repository harness.

The harness keeps the root `AGENTS.md` short and points Codex to durable
project documents under `docs/`. Safety-sensitive behavior is described in
contracts under `docs/contracts/`, and significant architecture or process
decisions are recorded as ADRs under `docs/adr/`.

## Consequences

- `AGENTS.md` remains a concise entrypoint instead of carrying all durable
  project process and product policy.
- Durable repository knowledge lives under `docs/`, including architecture,
  development workflow, quality expectations, threat model, contracts, plans,
  and ADRs.
- Safety contracts under `docs/contracts/` define behavior that implementation
  must preserve before externally visible GitHub writes are allowed.
- Future executable tests can enforce the documented contracts as product
  implementation begins.
- Local Superpowers workflow artifacts remain ignored and are not treated as
  durable repository process.
