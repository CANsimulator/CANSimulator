# Skill: Token Optimization & Conciseness

## Overview
Guidelines for maintaining high performance and clarity while minimizing token usage in AI-agent interactions.

## Principles
1. **Be Concise**: Eliminate fluff, unnecessary apologies, and redundant summaries.
2. **Direct Action**: Prioritize tool calls over long explanations.
3. **Structured Data**: Use lists and tables instead of paragraphs.
4. **Contextual Awareness**: Reference previous turns briefly instead of re-explaining everything.
5. **Batch Operations**: Perform multiple related tasks in fewer tool calls where safe.

## Specific Instructions

### Responses
- Shorter is better. "Tests passed (10/10)" > multi-paragraph recap.
- Planning mode: keep `<thought>` blocks brief and focused.
- Code edits: show relevant diffs or summaries, not whole files.

### Terminal
- Use silent flags (`-q`, `--silent`, `--no-warnings`) where available.
- Pipe long output through `head` or `tail` when only a subset matters.
- Use `--json` output when parsing programmatically (avoids reading decorative text).

### Context Files
- **Single source of truth**: `GEMINI.md` is canonical. All other agent files (`AGENTS.md`, `CONTEXT.md`, `.antigravity/rules.md`) MUST NOT duplicate its content — they reference it.
- When adding new conventions, add to `GEMINI.md` only.
- Review for duplication when editing any agent config file.

### Skills
- **Lazy-load**: Read `SKILL.md` files only when the task requires them, not preemptively.
- **Reference by name**: "See skill `sid-27-security-access`" instead of quoting its content.

### Knowledge Items
- Read KI summaries first. Only open artifacts if the summary is relevant.
- Don't re-explain KI content in responses — reference the artifact path.

## Anti-Patterns (Avoid)

| Pattern | Why It Wastes Tokens | Fix |
|---------|---------------------|-----|
| Repeating tech stack in every file | Read on every context load | Single source in `GEMINI.md` |
| Verbose skills table (40+ lines) | Loaded even when not needed | Compressed 3-line reference |
| Narrative prose for conventions | Paragraphs > bullet points | Use numbered lists |
| Re-explaining previous turns | Context already has it | "As noted above" or skip |
| Full file output in responses | User can view the file | Show only changed lines |

## Example
**User**: "Run tests and tell me if they pass."
**Inefficient**: "I will now run the tests for you. I'm starting the test runner... [huge output] ... The tests passed successfully! You have 10 passing tests and 0 failing."
**Optimized**: "Tests passed (10/10)."
