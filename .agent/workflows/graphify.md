
**Command:** /graphify
**Description:** Turn any folder of files into a navigable knowledge graph

Follow the graphify skill installed at ~/.agent/skills/graphify/SKILL.md to run the full pipeline.

If no path argument is given, use `.` (current directory).

---

## graphify Workflow Rules

This project has a graphify knowledge graph at graphify-out/.

### Architecture Navigation
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- If the graphify MCP server is active, utilize tools like `query_graph`, `get_node`, and `shortest_path` for precise architecture navigation instead of falling back to `grep`
- After modifying code files in this session, run `/graphify update .` to keep the graph current (AST-only, no API cost)

### Command Variants
- `/graphify .` - Full pipeline on current directory
- `/graphify ./path` - Full pipeline on specific path
- `/graphify query "what connects X to Y?"` - BFS traversal - broad context
- `/graphify path "NodeA" "NodeB"` - Shortest path between two concepts
- `/graphify explain "ConceptName"` - Plain-language explanation
- `/graphify add <url>` - Add external document (paper, link, etc.)

