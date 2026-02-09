<h1 align="center">
  <br>
  <a href="https://github.com/EconLab-AI/Ultrabrain">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/EconLab-AI/Ultrabrain/main/docs/public/ultrabrain-logo-for-dark-mode.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/EconLab-AI/Ultrabrain/main/docs/public/ultrabrain-logo-for-light-mode.svg">
      <img src="https://raw.githubusercontent.com/EconLab-AI/Ultrabrain/main/docs/public/ultrabrain-logo-for-light-mode.svg" alt="UltraBrain" width="460">
    </picture>
  </a>
  <br>
</h1>

<p align="center">
  <strong>Persistent semantic memory for Claude Code & Claude Desktop. Native. Fast. Zero Python.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL%203.0-blue.svg" alt="License"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/version-1.0.0-7C3AED.svg" alt="Version"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/python-not%20required-success.svg" alt="No Python"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/search-%3C2ms-blueviolet.svg" alt="Search Speed"></a>
</p>

<p align="center">
  <a href="https://www.econlab-ai.com">Website</a> &middot;
  <a href="https://x.com/EconLab_DE">X / Twitter</a> &middot;
  <a href="https://github.com/EconLab-AI/Ultrabrain/issues">Issues</a>
</p>

<br>

<p align="center">
  UltraBrain gives Claude a persistent memory — across sessions, across days, across weeks. It automatically captures what you work on, compresses it into semantic observations using the Claude Agent SDK, and injects the right context when you need it. Claude remembers your architecture decisions, bug fixes, project history, and brainstorming sessions.
</p>

<p align="center">
  <strong>The first tool that bridges Claude Desktop and Claude Code through shared knowledge.</strong>
</p>

<br>

<p align="center">
  <img src="https://raw.githubusercontent.com/EconLab-AI/Ultrabrain/main/docs/public/screenshot-viewer.png" alt="UltraBrain Viewer — 3D Brain, Dark Theme, Real-time Memory Feed" width="800">
</p>

<br>

---

<br>

## Why UltraBrain?

Claude is powerful — but it forgets everything when a session ends. Every new conversation starts from zero. You re-explain your architecture, re-describe your conventions, re-contextualize your bugs.

**UltraBrain fixes that.** It runs silently in the background, building a semantic knowledge base of everything you work on. When a new session starts, the right context is already there.

And with the **Claude Desktop Integration**, you can brainstorm and plan in Claude Desktop, save that knowledge to UltraBrain, and have it automatically available in your next Claude Code session. No copy-pasting. No context loss.

<br>

<table>
  <thead>
    <tr>
      <th></th>
      <th>What UltraBrain Does</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Vector Engine</strong></td>
      <td>LanceDB — native Rust, runs in-process, no external dependencies</td>
    </tr>
    <tr>
      <td><strong>Search Latency</strong></td>
      <td><code>&lt;2ms</code> semantic vector search</td>
    </tr>
    <tr>
      <td><strong>Desktop Integration</strong></td>
      <td>MCP bridge + local session import from Claude Desktop's agent mode</td>
    </tr>
    <tr>
      <td><strong>Web Dashboard</strong></td>
      <td>Full project management suite: Kanban, bugs, todos, learnings, tags, and real-time feed</td>
    </tr>
    <tr>
      <td><strong>CLAUDE.md Manager</strong></td>
      <td>Browse, edit, and manage all 7 tiers of CLAUDE.md files per project</td>
    </tr>
    <tr>
      <td><strong>Ralph Loop</strong></td>
      <td>Autonomous iteration loops — launches Claude CLI in Terminal.app for hands-free task execution</td>
    </tr>
    <tr>
      <td><strong>Auto-Tagging</strong></td>
      <td>AI-powered labeling: bugs, todos, ideas, learnings, features, security, and more — auto-detected from content</td>
    </tr>
    <tr>
      <td><strong>Python Required</strong></td>
      <td><strong>No</strong> — pure TypeScript + Rust (via napi-rs)</td>
    </tr>
    <tr>
      <td><strong>Platform Support</strong></td>
      <td>macOS &middot; Linux &middot; Windows — full support everywhere</td>
    </tr>
    <tr>
      <td><strong>Token Savings</strong></td>
      <td><strong>~80%</strong> via progressive disclosure</td>
    </tr>
    <tr>
      <td><strong>Embedding</strong></td>
      <td>ONNX in-process (all-MiniLM-L6-v2, 384-dim)</td>
    </tr>
    <tr>
      <td><strong>Project Isolation</strong></td>
      <td>Each project gets its own knowledge silo — no cross-contamination</td>
    </tr>
    <tr>
      <td><strong>Setup</strong></td>
      <td>2 commands, zero configuration</td>
    </tr>
  </tbody>
</table>

<br>

---

<br>

## Quick Start

### Claude Code Plugin (2 commands)

```
/plugin marketplace add EconLab-AI/Ultrabrain

/plugin install ultrabrain
```

Restart Claude Code. Your sessions now have memory.

<br>

### Claude Desktop Integration

UltraBrain integrates with Claude Desktop in two ways:

#### 1. MCP Bridge (Real-time Knowledge Sharing)

The MCP server is **included with the plugin** — no separate installation needed. To connect Claude Desktop to your UltraBrain knowledge base, add this to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ultrabrain": {
      "command": "node",
      "args": [
        "~/.claude/plugins/cache/EconLab-AI/ultrabrain/1.0.0/scripts/mcp-server.cjs"
      ]
    }
  }
}
```

> **Note:** On macOS, replace `~` with your full home path (e.g. `/Users/yourname`). On Windows, use `%USERPROFILE%` or the full path.

Restart Claude Desktop. You now have access to these tools:

| Tool | Description |
|------|-------------|
| `list_projects()` | See all projects with stored knowledge |
| `save_memory(text, title, project)` | Save plans, decisions, or brainstorming results |
| `search(query, project)` | Search across your knowledge base |
| `timeline(anchor)` | Get chronological context around a result |
| `get_observations(ids)` | Fetch full details for specific memories |

**Example workflow:**
1. Brainstorm architecture in Claude Desktop
2. `save_memory(text="We decided to use event sourcing for the audit trail...", project="my-app")`
3. Open Claude Code in `my-app` — the decision is already in context

#### 2. Local Session Import (Historical Sessions)

UltraBrain can import your entire Claude Desktop **Local Agent Mode** conversation history — all sessions, all user prompts — directly into the memory database.

```bash
# Check if sessions are available
curl http://localhost:37777/api/claude-desktop/import/check

# Import all sessions (idempotent — safe to re-run)
curl -X POST http://localhost:37777/api/claude-desktop/import
```

Imported sessions appear in the viewer under the **Claude Desktop** tab with full metadata: project names, timestamps, models, and extracted user prompts.

<br>

---

<br>

## How It Works

UltraBrain runs silently in the background through **5 lifecycle hooks**:

```
SessionStart → UserPromptSubmit → PostToolUse → Stop (Summary) → SessionEnd
```

**Every session:**
1. **Captures** tool usage, file changes, and Claude's reasoning
2. **Compresses** raw data into semantic observations (via Claude Agent SDK)
3. **Embeds** observations into LanceDB for vector similarity search
4. **Injects** relevant context from past sessions into new ones

Claude sees a concise summary of your project history at the start of every session — decisions you've made, bugs you've fixed, architecture you've designed. No manual intervention required.

<br>

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Claude Code                          │
│                                                          │
│  SessionStart  UserPromptSubmit  PostToolUse  Stop       │
│       │              │               │          │        │
└───────┼──────────────┼───────────────┼──────────┼────────┘
        │              │               │          │
        ▼              ▼               ▼          ▼
┌─────────────────────────────────────────────────────────┐
│                  UltraBrain Worker                        │
│                  (Express on :37777)                      │
│                                                          │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ SQLite  │  │   LanceDB    │  │  Claude Agent SDK   │  │
│  │  (FTS5) │  │  (Vectors)   │  │  (Compression)      │  │
│  └─────────┘  └──────────────┘  └────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │       Web Dashboard (React)                       │    │
│  │       http://localhost:37777                       │    │
│  │                                                    │    │
│  │  Project Management · CLAUDE.md Manager            │    │
│  │  Kanban Board · Ralph Loop · Agent Teams           │    │
│  │  Memory Feed · Claude Desktop Import               │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  AutoLabeler · KanbanPopulator · Tag System       │    │
│  │  AI-powered observation classification            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │       MCP Server (stdio JSON-RPC)                 │    │
│  │       Claude Desktop Bridge                       │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │   Claude Desktop Local Session Importer           │    │
│  │   ~/Library/.../local-agent-mode-sessions → DB    │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
        │                    │
        ▼                    ▼
  ~/.ultrabrain/       ~/.ultrabrain/
  ultrabrain.db        vector-db/
```

<br>

---

<br>

## Key Features

### Persistent Memory
Context survives across sessions, days, and weeks. Claude knows what you built yesterday.

### Project Management Dashboard
A full-featured PM suite built into the web viewer at `http://localhost:37777`:

- **Overview** — High-level stats across all projects with project filtering (Claude Code projects only)
- **Current State** — Live project dashboard with recent activity and status
- **Bugs & Fixes** — Track all discovered bugs with tag-based filtering and search
- **Todos** — Task tracking with Kanban integration
- **Ideas** — Capture and organize feature ideas and brainstorming results
- **Learnings** — Chronological timeline of all captured knowledge, grouped by date
- **Tags** — Full tag management system with 13 built-in system tags
- **Kanban Board** — Drag-and-drop task management (Todo, In Progress, Done) with one-click backfill from observations

### CLAUDE.md Manager
Browse and edit all 7 tiers of the CLAUDE.md hierarchy per project — from managed policies to subdirectory rules. The editor shows file metadata (tokens, load frequency), line numbers, and tracks unsaved changes. Supports the full Claude Code context system:

| Level | File | Scope |
|-------|------|-------|
| Managed Policy | `/Library/Application Support/ClaudeCode/CLAUDE.md` | Organization-wide |
| Project Root | `./CLAUDE.md` | Team (in Git) |
| Project Rules | `./.claude/rules/*.md` | Team (in Git) |
| User Global | `~/.claude/CLAUDE.md` | Personal, all projects |
| Project Local | `./CLAUDE.local.md` | Personal, this project |
| Auto Memory | `~/.claude/projects/<project>/memory/MEMORY.md` | Claude's own notes |
| Subdirectory | `./subdir/CLAUDE.md` | On-demand |

### Ralph Loop (Autonomous Iteration)
Launch autonomous Claude sessions directly from the web UI. Configure a task description, set iteration limits and success criteria, then click Start — UltraBrain opens Terminal.app with `claude --dangerously-skip-permissions` pointed at your project directory. Ideal for repetitive tasks, multi-step refactors, and overnight batch work.

### Auto-Tagging & Classification
The **AutoLabeler** automatically classifies every observation with semantic tags based on content analysis. 13 built-in system tags: `bug`, `todo`, `idea`, `learning`, `decision`, `feature`, `fix`, `refactor`, `performance`, `security`, `devops`, `docs`, `planned-feature`. The **KanbanPopulator** converts tagged observations into actionable Kanban tasks automatically.

### Agent Teams Dashboard
Monitor and manage multi-agent team sessions. View active teams, their tasks, and coordination status across your projects.

### Claude Desktop Integration
Two-way integration: **MCP Bridge** for real-time knowledge sharing between Claude Desktop and Claude Code, plus **Local Session Import** to bring your entire Claude Desktop conversation history into UltraBrain. All sessions, prompts, and metadata are preserved.

### Semantic Vector Search
LanceDB + all-MiniLM-L6-v2 embeddings find the most relevant memories, not just keyword matches. Search in <2ms.

### Progressive Disclosure
Layered memory retrieval: summaries first, full details on demand. **~80% token savings** compared to loading everything.

### MCP Search Tools
Query your project history with natural language:

```typescript
search(query="authentication bug", type="bugfix", limit=10)
timeline(anchor=123, depth_before=5, depth_after=5)
get_observations(ids=[123, 456])
save_memory(text="API requires X-API-Key header", title="API Auth", project="my-api")
list_projects()
```

### Privacy Control
Use `<private>` tags to exclude sensitive content from storage. Tag stripping happens at the edge, before data reaches the database.

### Zero Configuration
Auto-installs dependencies, auto-creates database, auto-starts worker. Settings in `~/.ultrabrain/settings.json` for fine-tuning.

<br>

---

<br>

## Web Dashboard

The UltraBrain web dashboard at `http://localhost:37777` provides a comprehensive interface for managing your AI development workflow:

| Section | Description |
|---------|-------------|
| **Projects** | Browse all tracked projects with observation counts and activity timelines |
| **Project Management** | Full PM suite: Overview, Current State, Bugs, Todos, Ideas, Learnings, Tags, Kanban |
| **CLAUDE.md** | Visual editor for all CLAUDE.md files across the 7-tier hierarchy |
| **Claude Desktop** | View imported Claude Desktop sessions with metadata and prompts |
| **Ralph Loop** | Configure and launch autonomous Claude iteration loops |
| **Agent Teams** | Monitor multi-agent team sessions and coordination |
| **Feed** | Real-time stream of observations, summaries, and prompts with project filtering |

The dashboard uses a dark theme with monospace typography, inline styles (no CSS modules), and real-time SSE updates.

<br>

---

<br>

## Performance

Benchmarked on MacBook Pro M3, 1,200 observations in database:

| Metric | Result |
|---|---|
| Vector search latency | **1.3ms** |
| Embedding generation | **12ms** per text |
| Context injection | **<50ms** total |
| Token savings | **79.7%** vs raw context |
| Database size | **~2MB** per 1,000 observations |
| Memory footprint | **~45MB** worker process |

<br>

---

<br>

## System Requirements

- **Node.js** 18+
- **Claude Code** with plugin support
- **Bun** runtime (auto-installed if missing)

That's it. No Python. No pip. No external processes.

<br>

---

<br>

## Configuration

Settings are managed in `~/.ultrabrain/settings.json` (auto-created on first run):

| Setting | Default | Description |
|---|---|---|
| `ULTRABRAIN_WORKER_PORT` | `37777` | Worker API port |
| `ULTRABRAIN_PROVIDER` | `claude` | AI provider (claude/gemini/openrouter) |
| `ULTRABRAIN_CONTEXT_OBSERVATIONS` | `20` | Observations per context injection |
| `ULTRABRAIN_LOG_LEVEL` | `INFO` | Log verbosity |
| `ULTRABRAIN_DATA_DIR` | `~/.ultrabrain` | Data directory |

<br>

---

<br>

## Development

```bash
# Clone
git clone https://github.com/EconLab-AI/Ultrabrain.git
cd Ultrabrain

# Install
npm install

# Build
npm run build

# Test
bun test

# Build + sync to local plugin marketplace + restart worker
npm run build-and-sync
```

<br>

---

<br>

## Contributing

Contributions welcome. Please follow existing code patterns and include tests.

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a Pull Request

<br>

---

<br>

## License

**GNU Affero General Public License v3.0** (AGPL-3.0)

Copyright (C) 2026 [EconLab AI](https://www.econlab-ai.com). All rights reserved.

- Use, modify, and distribute freely
- Network server deployments must share source code
- Derivative works must use AGPL-3.0

The AGPL-3.0 license ensures UltraBrain remains open source while protecting against closed-source commercial exploitation. If you run a modified version of UltraBrain as a network service, you must make your source code available to users. This keeps the ecosystem fair and open for everyone.

See [LICENSE](LICENSE) for full details.

<br>

---

<br>

<p align="center">
  <a href="https://www.econlab-ai.com">EconLab AI</a> &middot;
  <a href="https://x.com/EconLab_DE">X / Twitter</a> &middot;
  <a href="https://github.com/EconLab-AI/Ultrabrain/issues">Issues</a>
</p>

<p align="center">
  <sub>Built by <a href="https://www.econlab-ai.com">EconLab AI</a> &middot; Powered by LanceDB &middot; Made with TypeScript</sub>
</p>
