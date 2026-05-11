# Product Specs

Durable product specs live in this directory. A spec describes what behavior,
contract, safety boundary, or user-visible capability the repository intends to
provide. Specs are the source of truth for implementation plans, tests, and
future documentation updates.

## When to Add a Spec

Add or update a spec before writing an implementation plan when work changes:

- User-visible behavior or commands.
- Safety, policy, persistence, artifact, or GitHub write behavior.
- Durable architecture module boundaries.
- Config, diagnostic, review, or daemon contracts.
- A completed implementation slice that needs to be recorded for future agents.

Small refactors that do not change behavior may not need a new spec, but they
must still preserve the existing specs and contracts.

## Naming

Use a stable capability-oriented name:

```text
NNNN-short-capability-name.md
```

The number identifies the spec record. It does not require a matching plan
number or filename. A single spec can have multiple implementation plans over
time, and a single plan can implement parts of multiple specs when the linkage
is explicit.

## Required Sections

Each spec should include:

- `Status`: proposed, accepted, implemented, superseded, or archived.
- `Purpose`: what problem the spec solves and why it exists.
- Behavior or contract sections specific to the capability.
- `Safety Requirements` when the change touches approval boundaries or
  sensitive local data.
- `Tests` or verification expectations.
- `Documentation Updates` when durable docs should change after implementation.
- `Acceptance Criteria`.
- `Implementation Plans`: links to durable plans that implement or revise the
  spec, or a note that the spec records an already implemented slice.

## Relationship to Plans

Specs come before plans for new work. Plans in `docs/plans/` must name the
specs they implement. Do not rely on filename matching as the contract; rely on
explicit links and coverage notes.

Use this relationship:

```text
spec = what and why
plan = how and in what order
tests = proof the plan satisfied the spec
ADR = why a significant architecture choice was made
contract = durable safety rule implementation must preserve
```

## Status Updates

When implementation completes, update the relevant spec status and link the
implemented plan or PR. If behavior changes materially, prefer a new spec or a
clearly marked revision rather than rewriting history in a way that hides the
old decision context.
