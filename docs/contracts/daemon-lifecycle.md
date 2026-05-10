# Daemon Lifecycle Contract

## Scope

The daemon runs locally and controls polling, review job scheduling, child
processes, and shutdown state. Lifecycle behavior must preserve the
no-write-after-stop invariant.

## Start

`start` launches a background daemon by default. `start --foreground` runs the
same daemon loop in the foreground for development and debugging.

Startup must validate effective configuration, local paths, state access, and
backend availability before scheduling review work. Startup catch-up scans may
identify eligible missed requests, but they must use the same eligibility,
dedupe, and write preconditions as ordinary polling.

## Stop

`stop` is a fast shutdown request. Once stop is requested:

- No new review jobs may start.
- No GitHub write may be submitted.
- In-flight jobs enter shutdown handling.
- The stop state must be visible to orchestration and the GitHub gateway.

The gateway is the final guard and must refuse writes after stop is requested,
even if upstream orchestration missed the state change.

## In-Flight Jobs and Grace Period

In-flight jobs should receive a short configured grace period before child
process termination. The example config uses `stopGraceSeconds: 10`.

During the grace period, jobs may clean up local state, persist redacted local
artifacts, release locks, and mark PRs for recheck. They must not write to
GitHub.

If a PR state change is observed while a job is running, the daemon does not
cancel the job for that reason alone. It marks the PR for recheck after the
current job ends.

## Restart

`restart` is defined as fast `stop` followed by background `start`. The new
daemon instance must validate configuration and state before scheduling work.
It must rely on persisted dedupe and attempt state to avoid duplicate reviews
after restart.

## Invariant

No GitHub write after stop is requested. This invariant is safety-critical and
requires coverage in policy tests once product implementation begins.
