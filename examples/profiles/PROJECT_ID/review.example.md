# {PROJECT_ID} Review Profile

Use this profile to describe project-specific review priorities for
`{OWNER}/{REPO}`. Copy it to your local config directory as:

```text
~/.config/codex-co-reviewer/profiles/{PROJECT_ID}/review.md
```

Do not commit real project profiles to managed repositories. Real profiles may
contain private architecture notes, review preferences, or repository context.

## Review Priorities

- Focus first on correctness, regressions, data loss, security, privacy, and
  externally visible behavior changes.
- Prefer line-specific findings that point to changed PR lines.
- Include unanchored findings in the summary only when they are important for
  the reviewer to consider.
- Treat low-confidence concerns as optional questions unless the structured
  policy allows otherwise.
- Avoid style-only comments unless the style issue creates maintenance risk or
  violates an explicit project rule.

## Project Context

- Runtime: describe the primary runtime or framework here.
- Persistence: describe database, storage, or migration expectations here.
- External services: describe important API, queue, or webhook constraints here.
- Testing: describe the expected local verification command here.

## Local Rules

- Do not suggest GitHub review decisions directly.
- Do not request `APPROVE`.
- Do not bypass dedupe, changed-line anchoring, redaction, stop-state checks, or
  any GitHub write policy.
- Do not include secrets, tokens, private paths, or unredacted command output in
  review text.

Structured policy in `config.yaml` is authoritative for safety behavior. This
profile only guides review focus, project context, and wording.
