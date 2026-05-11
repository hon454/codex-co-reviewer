# AGENTS.md

This repository uses a contract-first harness for Codex-led development.
Start here, then follow the linked durable docs.

## First Reads

1. Read `README.md` for project purpose and current status.
2. Read `docs/architecture.md` for the product architecture.
3. Read `docs/development.md` for the Codex operating loop.
4. Read any relevant contract under `docs/contracts/` before changing behavior
   that affects safety, policy, persistence, or GitHub writes.

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

## Required Verification

Run the single local verification command before reporting product or
documentation changes complete:

```sh
npm run verify
```

For documentation-only harness work, also scan durable docs for unfinished
placeholders:

```sh
rg --no-ignore -n "T[B]D|T[O]DO|fill[[:space:]]+in|implement[[:space:]]+later" AGENTS.md README.md docs .github || true
```

## Durable Knowledge

- Durable harness docs live in `docs/`.
- Product specs live in `docs/specs/` and should be written before durable
  implementation plans for new behavior.
- Durable implementation plans live in `docs/plans/` and should explicitly
  link the spec or specs they implement.
- Contract docs live in `docs/contracts/`.
- Architecture decisions live in `docs/adr/`.
- Local Superpowers workflow artifacts under `docs/superpowers/` are ignored by
  git and are not durable repository process.
