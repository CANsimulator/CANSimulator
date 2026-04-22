# Graphify Installation Summary

**Status:** ✅ Graphify v0.4.23 installed and configured for all platforms

## Installation Complete

### Package Installed
- **graphifyy** v0.4.23 is already installed in your system Python
- All tree-sitter language parsers included (Python, TypeScript, Go, Rust, Java, C++, etc.)
- NetworkX and Leiden clustering libraries included

### Platforms Configured

#### 1. **Claude Code (Windows)**
- Configuration: `.claude/graphify.md`
- Usage: Type `/graphify` in Claude Code
- Graph location: `graphify-out/` in your project

#### 2. **Codex (OpenAI)**
- Configuration: `.codex/graphify.md`
- Usage: Type `$graphify` (dollar sign instead of slash) in Codex
- Features: Parallel extraction via multi_agent = true in ~/.codex/config.toml

#### 3. **VS Code Copilot Chat**
- Configuration: `.github/copilot-instructions.md`
- Usage: Type `/graphify` in VS Code chat panel
- Python-only skill (works on Windows PowerShell and macOS/Linux)

#### 4. **Google Antigravity**
- Configuration: `.agent/rules/graphify.md` and `.agent/workflows/graphify.md`
- Usage: Type `/graphify` in Google Antigravity
- Always-on rules with slash-command registration

## Quick Start

### Step 1: Build Your First Graph
```bash
# Using the CLI directly
python -m graphify . 

# Or from any AI assistant
/graphify .
```

### Step 2: Check the Output
```
graphify-out/
├── graph.html           # Interactive visualization - open in browser
├── GRAPH_REPORT.md      # Summary of god nodes and connections
├── graph.json           # Persistent graph for queries
└── cache/               # File hashes for incremental updates
```

### Step 3: Use in Your AI Assistant

#### Claude Code (Windows)
```
You: /graphify .
Claude: [builds graph and reads GRAPH_REPORT.md]
You: What's the architecture?
Claude: [Uses graph structure to guide answer instead of grepping files]
```

#### VS Code Copilot Chat
```
You: /graphify .
Copilot: [builds graph]
You: Which functions handle authentication?
Copilot: [Queries graph.json for auth-related nodes]
```

#### Google Antigravity
```
You: /graphify .
Antigravity: [builds graph and registers always-on rules]
You: Show me the flow from config to database
Antigravity: [Traverses graph relationships precisely]
```

#### Codex
```
You: $graphify .
Codex: [builds graph with parallel extraction]
You: What connects the auth flow to the database?
Codex: [Uses graph to find precise connections]
```

## Graph Commands Reference

All platforms support these `/graphify` subcommands:

| Command | Purpose |
|---------|---------|
| `/graphify .` | Build full graph on current directory |
| `/graphify ./path` | Build graph on specific folder |
| `/graphify query "what connects X to Y?"` | Find relationships via BFS |
| `/graphify path "NodeA" "NodeB"` | Shortest path between concepts |
| `/graphify explain "ConceptName"` | Plain-language explanation of a node |
| `/graphify add <url>` | Add external document (paper, link, video) |
| `/graphify update .` | Incremental update (code-only, no LLM) |
| `/graphify --watch .` | Auto-update as code changes |

## Configuration Files

```
.claude/graphify.md                    # Claude Code setup
.codex/graphify.md                     # Codex setup
.github/copilot-instructions.md        # VS Code Copilot Chat setup
.agent/rules/graphify.md               # Google Antigravity rules
.agent/workflows/graphify.md           # Google Antigravity workflows
```

All files contain:
- Rules for using the graph before searching files
- How to keep the graph updated
- Supported query commands

## Next Steps

1. ✅ **Build your first graph**
   ```bash
   python -m graphify .
   ```

2. ✅ **Open the interactive visualization**
   - Open `graphify-out/graph.html` in your browser
   - Click nodes, search, filter by community

3. ✅ **Read the audit report**
   - Open `graphify-out/GRAPH_REPORT.md`
   - See god nodes (highest-degree concepts)
   - Discover surprising connections

4. ✅ **Use in your AI assistant**
   - Type `/graphify .` in Claude Code, VS Code, Antigravity, or Codex
   - Ask architecture questions
   - Assistant will use the graph structure instead of grepping files

5. ✅ **Keep it updated** (optional)
   ```bash
   graphify hook install   # Auto-rebuild on git commits
   # Or manually:
   python -m graphify update .  # Re-extract changed files only
   ```

## Troubleshooting

### "graphify: command not found"
Use Python module syntax instead:
```bash
python -m graphify .
```

Or ensure it's in your PATH. On Windows, graphify CLI may not be auto-added to PATH:
```powershell
$env:APPDATA + "\Python\Python313\Scripts"  # Add to PATH
```

### Graph won't update
Ensure you're in the project root:
```bash
cd e:\projects\UDS_Simulator\CAN-Simulator
python -m graphify .
```

### AI assistant not using graph
- Verify `graphify-out/GRAPH_REPORT.md` exists
- Verify configuration files exist (`.claude/graphify.md`, etc.)
- Reload your AI assistant session
- Try typing `/graphify query "test"` to verify skill is registered

## Platform-Specific Details

### Claude Code (Windows)
- Auto-detects Windows via `--platform windows` flag
- Creates `CLAUDE.md` in project root
- Installs PreToolUse hooks for automatic graph integration

### Codex
- Uses `$` prefix instead of `/` for skills
- Requires `multi_agent = true` in `~/.codex/config.toml` for parallel extraction
- Creates `AGENTS.md` and `.codex/hooks.json`

### VS Code Copilot Chat
- Creates `.github/copilot-instructions.md` (auto-read every session)
- Python-only skill (no Node.js needed)
- Works in integrated terminal and chat panel

### Google Antigravity
- Creates `.agent/rules/graphify.md` (always-on) 
- Creates `.agent/workflows/graphify.md` (slash-command registration)
- No hook equivalent — rules injection is the always-on mechanism

## File Handling

Graphify extracts:
- **Code**: 25 languages via tree-sitter AST (Python, TypeScript, Go, Rust, etc.)
- **Docs**: Markdown, RST, HTML, TXT (and PDFs via optional `graphifyy[office]`)
- **Media**: Screenshots, diagrams, images in any language
- **Video/Audio**: Transcribed locally with Whisper (optional `graphifyy[video]`)

## Resources

- **GitHub**: https://github.com/safishamsi/graphify
- **PyPI Package**: graphifyy (double-y in the name)
- **Documentation**: README.md in the GitHub repo
- **Working Examples**: `worked/` folder with real outputs

---

**Installed:** graphifyy v0.4.23
**Configured Platforms:** Claude Code, Codex, VS Code Copilot Chat, Google Antigravity
**Next:** Run `python -m graphify .` to build your first graph!
