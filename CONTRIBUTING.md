# Contributing to UltraBrain

Thank you for your interest in contributing! UltraBrain is open source and we welcome contributions of all kinds — bug fixes, features, documentation, and ideas.

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Bun** runtime (auto-installed during setup)
- **Claude Code** installed

### Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/Ultrabrain.git
cd Ultrabrain

# Install dependencies
npm install

# Build everything + sync to local plugin + restart worker
npm run build-and-sync
```

The worker starts automatically on port 37777. Open http://localhost:37777 to see the dashboard.

## Architecture Overview

```
Claude Code Session
  |-- SessionStart Hook    --> Worker API --> Initialize session
  |-- UserPromptSubmit Hook --> Worker API --> Inject context from memory
  |-- PostToolUse Hook     --> Worker API --> Capture tool usage
  |-- Stop Hook            --> Worker API --> Compress observations via AI
  |-- SessionEnd Hook      --> Worker API --> Finalize session
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/hooks/` | TypeScript lifecycle hooks (built to ESM) |
| `src/services/worker-service.ts` | Express API server (port 37777) |
| `src/services/worker/http/routes/` | API route handlers |
| `src/services/sqlite/` | Database layer (Bun SQLite) |
| `src/services/sync/` | LanceDB vector search + embeddings |
| `src/ui/viewer/` | React dashboard (built to single HTML) |
| `plugin/` | Built output — don't edit directly |

### Key Patterns

- **Inline styles** for all UI components (no CSS modules)
- **BaseRouteHandler** pattern for API routes (`wrapHandler`, `badRequest`, `notFound`)
- **Bun SQLite** (`bun:sqlite`) for database — not better-sqlite3
- **`item_tags` junction table** with `item_type` discriminator for the tag system

## Making Changes

1. **Create a branch**: `git checkout -b feat/your-feature`
2. **Make changes** in `src/`
3. **Build**: `npm run build-and-sync`
4. **Test locally** — the worker auto-restarts, dashboard reloads
5. **Commit** with a descriptive message
6. **Push** and open a Pull Request

## Pull Request Guidelines

- Keep PRs focused on **one change**
- Write a clear description of **what** and **why**
- Include **screenshots** for UI changes
- Ensure `npm run build-and-sync` succeeds
- Follow existing code patterns

## Code Style

- TypeScript throughout (strict mode)
- Use existing patterns — look at similar files before creating new ones
- Keep it simple — avoid over-engineering

## Issue Labels

| Label | Description |
|-------|-------------|
| `good-first-issue` | Great for newcomers |
| `help-wanted` | We'd love community help |
| `bug` | Something isn't working |
| `enhancement` | New feature or improvement |
| `documentation` | Docs improvements |

## Need Help?

- Browse [open issues](https://github.com/EconLab-AI/Ultrabrain/issues)
- Check [GitHub Discussions](https://github.com/EconLab-AI/Ultrabrain/discussions) for Q&A
- Look for `good-first-issue` labels to get started

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
