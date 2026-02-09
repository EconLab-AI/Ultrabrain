# UltraBrain: AI Development Instructions

UltraBrain is a Claude Code plugin providing persistent semantic memory across sessions. It captures tool usage, compresses observations using the Claude Agent SDK, embeds them into LanceDB for vector search, and injects relevant context into future sessions.

## Architecture

**5 Lifecycle Hooks**: SessionStart -> UserPromptSubmit -> PostToolUse -> Stop -> SessionEnd

**Hooks** (`src/hooks/*.ts`) - TypeScript -> ESM, built to `plugin/scripts/*-hook.js`

**Worker Service** (`src/services/worker-service.ts`) - Express API on port 37777, Bun-managed, handles AI processing asynchronously

**Database** (`src/services/sqlite/`) - SQLite3 at `~/.ultrabrain/ultrabrain.db`

**Search Skill** (`plugin/skills/mem-search/SKILL.md`) - HTTP API for searching past work, auto-invoked when users ask about history

**Vector Search** (`src/services/sync/LanceSync.ts`) - LanceDB vector embeddings for semantic search (native Rust, in-process)

**Embeddings** (`src/services/sync/EmbeddingService.ts`) - @xenova/transformers with all-MiniLM-L6-v2 (384-dim, in-process ONNX)

**Viewer UI** (`src/ui/viewer/`) - React interface at http://localhost:37777, built to `plugin/ui/viewer.html`

## Privacy Tags
- `<private>content</private>` - User-level privacy control (manual, prevents storage)

**Implementation**: Tag stripping happens at hook layer (edge processing) before data reaches worker/database. See `src/utils/tag-stripping.ts` for shared utilities.

## Build Commands

```bash
npm run build-and-sync        # Build, sync to marketplace, restart worker
```

## Configuration

Settings are managed in `~/.ultrabrain/settings.json`. The file is auto-created with defaults on first run.

## File Locations

- **Source**: `<project-root>/src/`
- **Built Plugin**: `<project-root>/plugin/`
- **Database**: `~/.ultrabrain/ultrabrain.db`
- **Vector DB**: `~/.ultrabrain/vector-db/` (LanceDB)

## Exit Code Strategy

Hooks use specific exit codes per Claude Code's hook contract:

- **Exit 0**: Success or graceful shutdown
- **Exit 1**: Non-blocking error (stderr shown to user, continues)
- **Exit 2**: Blocking error (stderr fed to Claude for processing)

## Requirements

- **Bun** (all platforms - auto-installed if missing)
- Node.js >= 18

## Important

No need to edit the changelog ever, it's generated automatically.
