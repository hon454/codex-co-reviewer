# Durable Implementation Plans

Durable implementation plans live in this directory. Use these plans for
repository work that should remain part of the project record: multi-step
implementation sequencing, cross-task coordination, and safety-relevant work
that future contributors should be able to inspect.

Plans are not the source of truth for product behavior. Durable specs in
`docs/specs/` define what should be built and why; plans define how to execute
that work. Plans in this directory must explicitly link the spec or specs they
implement and must align with `AGENTS.md`, `README.md`,
`docs/architecture.md`, `docs/development.md`, `docs/quality.md`,
`docs/threat-model.md`, and the contracts under `docs/contracts/`.

## Naming

Use a date and short execution-slice name:

```text
YYYY-MM-DD-short-plan-name.md
```

Do not require implementation plan filenames to match spec filenames. A spec
can have multiple plans, and a plan can implement parts of multiple specs when
the linkage is explicit.

## Required Links

Each plan must include:

- `Spec`: one or more links to durable specs under `docs/specs/`.
- `Goal`: the concrete implementation outcome.
- `Architecture`: the execution approach and module boundaries.
- Task-level file ownership, tests, commands, and expected results.
- Acceptance criteria mapped back to the linked spec.

Local Superpowers workflow artifacts under `docs/superpowers/` remain ignored
scratch space. They can help an individual Codex session reason through work,
but they are not durable repository process and should not be referenced as the
source of truth for implementation history.
