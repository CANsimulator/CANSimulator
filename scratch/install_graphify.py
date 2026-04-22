import os
from pathlib import Path

# Definitions from graphify __main__.py
_ANTIGRAVITY_RULES = """
This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- If the graphify MCP server is active, utilize tools like `query_graph`, `get_node`, and `shortest_path` for precise architecture navigation instead of falling back to `grep`
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
"""

_ANTIGRAVITY_WORKFLOW = """
**Command:** /graphify
**Description:** Turn any folder of files into a navigable knowledge graph

Follow the graphify skill installed at ~/.agent/skills/graphify/SKILL.md to run the full pipeline.

If no path argument is given, use `.` (current directory).
"""

_CLAUDE_MD_SECTION = """
# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
"""

_AGENTS_MD_SECTION = """
## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
"""

# Targets
home = Path.home()
project_root = Path(r"e:\projects\UDS_Simulator\CAN-Simulator")

# Antigravity
(project_root / ".agent" / "rules").mkdir(parents=True, exist_ok=True)
(project_root / ".agent" / "workflows").mkdir(parents=True, exist_ok=True)
(project_root / ".agent" / "rules" / "graphify.md").write_text(_ANTIGRAVITY_RULES)
(project_root / ".agent" / "workflows" / "graphify.md").write_text(_ANTIGRAVITY_WORKFLOW)

# Claude
claude_dir = home / ".claude"
claude_dir.mkdir(parents=True, exist_ok=True)
claude_md = claude_dir / "CLAUDE.md"
content = claude_md.read_text() if claude_md.exists() else ""
if "# graphify" not in content:
    claude_md.write_text(content + "\n" + _CLAUDE_MD_SECTION)

# Codex
agents_md = project_root / "AGENTS.md"
content = agents_md.read_text() if agents_md.exists() else ""
if "## graphify" not in content:
    agents_md.write_text(content + "\n" + _AGENTS_MD_SECTION)

print("Rules and registrations updated.")
