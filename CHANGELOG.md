# Changelog

## [1.0.0] - 2026-02-07

### Initial Release
- Persistent semantic memory for Claude Code
- LanceDB vector search engine (native Rust, in-process, <2ms latency)
- In-process embeddings via @xenova/transformers (all-MiniLM-L6-v2, 384-dim)
- 5 lifecycle hooks: SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd
- Progressive disclosure with ~80% token savings
- Full cross-platform support (macOS, Linux, Windows)
- Web viewer UI at http://localhost:37777
- 5 MCP search tools for querying project history
- Privacy control with `<private>` tags
- Zero-configuration auto-setup
