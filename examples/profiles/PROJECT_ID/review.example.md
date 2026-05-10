# {PROJECT_NAME} Review Process

Use this file as a fictional example of a project-specific review profile.
Real profiles should live in your local config directory, not in this
repository.

## Review Priorities

Review in this order:

1. Correctness and user-visible regressions.
2. Security, authentication, authorization, and data handling.
3. API compatibility and migration safety.
4. Test coverage for changed behavior.
5. Maintainability and clarity.

Do not block on formatting or style-only issues that automated tooling already
handles.

## Blocking Findings

Request changes for:

- logic bugs that can produce incorrect orders, payments, inventory, or account
  state
- authorization bypasses or missing server-side validation
- broken backwards compatibility in public APIs
- missing tests for new or changed business behavior
- unsafe error handling that hides failed writes or external service failures

## Optional Questions

Use optional questions for low-confidence concerns. Phrase them as checks for
intent rather than instructions. Do not let optional questions affect the final
review decision.

## Output Expectations

Prefer line-specific comments for actionable findings. Keep each comment short,
specific, and tied to the changed code. The summary review should include the
overall decision, verification evidence, and any optional questions.
