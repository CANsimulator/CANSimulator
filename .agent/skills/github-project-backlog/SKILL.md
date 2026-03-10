# GitHub Project Backlog Skill

Create and manage GitHub issues and add them to the UDS project using `gh`.

## When to Use
Use this skill when you need to:
- Create a backlog from an artifact (audit, plan, spec)
- Batch-create issues with structured sections
- Add items to the "UDS" GitHub Project
- Assign issues to the repo owner

## Prerequisites
- GitHub CLI authenticated: `gh auth status`
- Repo remote configured: `origin` should point to `https://github.com/suduli/UDS-SIMULATION`

## Project Defaults
- Project: `UDS` (project number: `4`)
- Owner: `suduli`
- Repo: `suduli/UDS-SIMULATION`

## Issue Body Template
Use this structure for backlog items:

```
**Priority:** <Critical|High|Medium|Low>

**User Story:** <As a ...>

**Acceptance Criteria**
- <Happy path>
- <Edge case>

**AI Implementation Prompt**
~~~text
<paste self-contained prompt>
~~~
```

## Recommended Workflow
1. Prepare backlog items (title, priority, story, AC, AI prompt).
2. Create issues with `gh issue create`.
3. Add each issue to the project with `gh project item-add`.
4. Assign to `suduli`.
5. Log created issue URLs to `artifacts/logs/`.

## Example Commands
Create a single issue:

```
gh issue create \
  --repo suduli/UDS-SIMULATION \
  --title "Issue Title" \
  --assignee suduli \
  --body-file artifacts/logs/issue_body_example.md
```

Add to project:

```
gh project item-add 4 \
  --owner suduli \
  --url https://github.com/suduli/UDS-SIMULATION/issues/123
```

## Notes
- Prefer `--body-file` for long content to avoid shell quoting errors.
- Use `~~~text` fences inside the issue body to avoid nested backticks.
- If duplicates are created, close them immediately with a comment linking the canonical issue.
