# UltraBrain — Persistent Memory System

You have persistent cross-session memory via UltraBrain. Context from past sessions is automatically injected at session start (visible as `<system-reminder>` blocks with "recent context"). Trust this context — it contains your past decisions, discoveries, and work history.

## Memory MCP Tools (use proactively)

Before re-investigating something you might already know, **search your memory first**:

- `search(query, project)` — Semantic search across all past observations and summaries
- `get_observations(ids)` — Load full details when the context index isn't enough
- `timeline(anchor, depth_before, depth_after)` — Get chronological context around a specific observation
- `list_projects()` — See all projects with stored knowledge
- `save_memory(text, title, project)` — Persist important decisions, architecture choices, or discoveries

## When to Use Memory

- **Before researching**: Check if you already investigated this topic in a past session
- **After decisions**: Save architecture decisions, technology choices, and design rationale
- **After bug fixes**: The fix context helps if the bug resurfaces
- **After discoveries**: Save non-obvious findings about the codebase or dependencies

## Context Economics

The `<system-reminder>` at session start shows a **semantic index** (titles, types, files, token costs). This is usually sufficient. Only fetch full observations via MCP tools when you need implementation details, rationale, or debugging context.
