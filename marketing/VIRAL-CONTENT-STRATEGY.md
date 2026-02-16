# UltraBrain Viral Content Strategy

## Plattform-Prioritaeten

| Plattform | Prioritaet | Format | Ziel |
|-----------|-----------|--------|------|
| **X (Twitter)** | #1 | Thread + Video | Dev-Community, Shares |
| **YouTube Shorts** | #1 | 30-60s Vertical | Reichweite, Wow-Faktor |
| **Reddit** | #2 | Post + Demo-Link | r/ClaudeAI, r/programming |

---

## 1. YouTube Short / X Video (30-60 Sekunden)

### KONZEPT: "Your AI Has Amnesia"

**Visuell**: Screen-Recording der `viral-demo.html` (Vollbild, 9:16 fuer Shorts / 16:9 fuer X)

#### Storyboard (Timecodes)

```
00:00 - 00:03  SCHWARZ. Text fadet ein: "Your AI has amnesia."
               Sound: Tiefer, dumpfer Bass-Drop

00:03 - 00:05  Text: "Every session starts from zero."
               Sound: Statisches Rauschen, leise

00:05 - 00:08  FADE: 3D-Gehirn beginnt sich zu formen
               Text: "We gave it a brain."
               Sound: Aufbauender Synth-Ton

00:08 - 00:15  BRAIN AWAKENING: Neuronen leuchten auf,
               Partikel werden angezogen, Pulse-Ring expandiert
               Connections flackern, Memory-Counter zaehlt hoch
               Sound: Epischer Build-up, Kristall-Klaenge

00:15 - 00:22  STATS erscheinen mit Impact:
               "<1.3ms Search" - BOOM
               "80% Token Savings" - BOOM
               "<2min Setup" - BOOM
               Sound: Drei aufeinanderfolgende Impact-Hits

00:22 - 00:28  Terminal-Typing: "claude plugin install ultrabrain"
               Feature-Pills erscheinen nacheinander
               Sound: Mechanisches Typing, soft

00:28 - 00:30  CTA: "Star on GitHub" Button + Logo
               Text: "Open Source. Free. Now."
               Sound: Satisfying Chime
```

#### Musik-Empfehlungen (Royalty-Free)
- Epidemic Sound: "Digital Horizons" Kategorie
- Artlist: Suche nach "Tech Cinematic Short"
- Alternative: Eigener Beat mit Sub-Bass + Crystal FX

#### Aufnahme-Methode
1. `viral-demo.html` in Chrome oeffnen (Vollbild, F11)
2. OBS Studio: Display Capture, 1080x1920 (Shorts) oder 1920x1080 (X)
3. 60fps aufnehmen, Timing passt automatisch (Timeline im Code)
4. Audio in DaVinci Resolve / CapCut hinzufuegen
5. Export: H.264, 30Mbps+

---

## 2. X (Twitter) - Launch-Thread

### Thread-Struktur (Max Viralitaet)

#### Tweet 1 (Hook - MUSS viral sein)
```
Your AI has amnesia.

Every Claude session starts from zero.
No memory of your architecture.
No memory of your bugs.
No memory of what you spent 3 hours explaining yesterday.

We fixed it. Open source. Free.

UltraBrain gives Claude a persistent brain.

[VIDEO: 30s Clip aus viral-demo.html]
```

#### Tweet 2 (Proof / Numbers)
```
The numbers:

< 1.3ms semantic search
80% token savings
< 2 min setup
0 Python dependencies

Built with LanceDB (Rust, in-process), not some slow Python wrapper.

Your memories don't leave your machine.
```

#### Tweet 3 (Demo / Visual)
```
It even has a 3D brain visualization.

Because why not.

[Screenshot: Viewer UI mit 3D Brain + Memory Feed]
```

#### Tweet 4 (How It Works - Technisch)
```
How it works:

1. You code with Claude
2. UltraBrain silently captures what happens
3. Claude Agent SDK compresses it into semantic observations
4. LanceDB embeds & indexes them
5. Next session: relevant memories auto-injected

You never touch a thing. It just works.
```

#### Tweet 5 (Claude Desktop Bridge)
```
Bonus: It bridges Claude Desktop and Claude Code.

Your Claude Desktop conversations become searchable knowledge in Claude Code.

First tool that connects both ecosystems.
```

#### Tweet 6 (Install CTA)
```
Install in 2 commands:

/plugin marketplace add EconLab-AI/Ultrabrain
/plugin install ultrabrain

That's it. No config. No API keys. No Python.

github.com/EconLab-AI/Ultrabrain

Star it. Fork it. Give your AI a brain.
```

---

## 3. X - Einzel-Tweets (Daily Content, 2 Wochen)

### Woche 1: Problem-Awareness

**Montag**
```
Unpopular opinion: The biggest bottleneck in AI-assisted coding isn't the model.

It's the amnesia.

Every session you waste 10+ minutes re-explaining your codebase.

That's 50 minutes per week.
43 hours per year.
Gone.
```

**Dienstag**
```
Claude: "I don't have context about your previous sessions"

Me: *explains architecture for the 47th time*

Claude: "Interesting! Let me help you with that."

There has to be a better way.
(There is.)
```

**Mittwoch**
```
AI coding tools in 2025:
- Better models
- Faster inference
- More context

AI coding tools that still can't do:
- Remember what you did yesterday
```

**Donnerstag**
```
Hot take: Memory is more important than intelligence.

A slightly dumber AI that remembers your entire project history
beats
a genius AI that forgets everything after each conversation.
```

**Freitag** (Reveal)
```
We spent 6 months building persistent memory for Claude.

< 1.3ms search latency
384-dim vector embeddings
In-process Rust engine
Zero Python
80% token savings

It's called UltraBrain and it's open source.

[Link]
```

### Woche 2: Feature Showcases

**Montag**
```
Things UltraBrain remembers so you don't have to:

- Your architectural decisions
- Bugs you already fixed
- That weird API behavior you discovered
- File structures you explained
- Your coding conventions

Automatically. Silently. In < 2ms.
```

**Dienstag** (Technical Flex)
```
LanceDB benchmark on my MacBook Pro M3:

Vector search: 1.3ms
Embedding generation: 12ms per text
Context injection: < 50ms total
Database: ~2MB per 1,000 observations
Memory footprint: ~45MB

We chose Rust (LanceDB) over Python for a reason.
```

**Mittwoch** (Visual)
```
UltraBrain has a real-time 3D brain visualization.

Every glowing node is a memory.
Every connection is a relationship.
Every pulse is your AI thinking.

[Screenshot/GIF of Brain3D]
```

**Donnerstag** (Social Proof / Usage)
```
After 1 week with UltraBrain:

Session 1: "Can you help me with the auth module?"
Claude: "Based on your previous work, the auth module uses JWT with refresh tokens in src/auth/. You fixed a token expiry bug last Tuesday."

This is the future of AI coding.
```

**Freitag** (Community CTA)
```
UltraBrain is MIT.

Not "open-source but actually we'll close it later."
Not "free tier with paywalled features."

Actually open source.

github.com/EconLab-AI/Ultrabrain

Contributions welcome. Star if you think AI should have memory.
```

---

## 4. Reddit Posts

### r/ClaudeAI

**Titel**: `I built persistent memory for Claude Code. It remembers your entire project history across sessions. Open source, free, <2ms search.`

**Body**:
```
Hey r/ClaudeAI,

I've been frustrated with starting every Claude session from scratch -
re-explaining architecture, re-describing bugs, losing context. So I built
UltraBrain: a persistent semantic memory plugin for Claude Code.

**What it does:**
- Silently captures your coding sessions
- Compresses observations using Claude Agent SDK
- Stores them in LanceDB (Rust, in-process vector DB)
- Auto-injects relevant memories into new sessions

**Key stats:**
- <1.3ms vector search latency
- 80% token savings vs raw context
- <2 min setup, zero config
- No Python dependencies
- Runs entirely local - your data stays on your machine

**Bonus features:**
- 3D brain visualization (Three.js)
- Bridges Claude Desktop and Claude Code
- Built-in Kanban board for task tracking
- Privacy tags for sensitive code
- 20+ language translations

**Install:**
```
/plugin marketplace add EconLab-AI/Ultrabrain
/plugin install ultrabrain
```

GitHub: [link]

Would love feedback from this community. What memory features would
you want most?
```

### r/programming

**Titel**: `We built a semantic memory system for AI coding assistants using LanceDB (Rust) + ONNX embeddings. <2ms search, zero Python. Open source.`

**Body**:
```
Technical deep-dive on a project we've been working on: UltraBrain.

**Problem:** AI coding assistants (Claude, etc.) have no persistent memory.
Every session starts fresh.

**Solution:** A 5-hook lifecycle system that:
1. Captures tool usage events in Claude Code
2. Semantically compresses them via Claude Agent SDK
3. Embeds with all-MiniLM-L6-v2 (384-dim, ONNX, in-process)
4. Stores in LanceDB (native Rust, not Python bindings)
5. Retrieves via vector similarity + FTS5 hybrid search

**Architecture:**
- TypeScript hooks (ESM) -> Express worker (port 37777)
- SQLite3 (FTS5) for metadata + full-text
- LanceDB for vector embeddings
- React + Three.js viewer UI

**Performance (M3 MacBook Pro, 1200 observations):**
- Vector search: 1.3ms
- Embedding: 12ms/text
- Token savings: ~80%
- DB size: ~2MB/1000 obs
- Worker RAM: ~45MB

**Why LanceDB over Chroma/Pinecone/etc:**
- Native Rust, in-process (no network calls)
- No Python runtime needed
- Columnar storage (Apache Arrow)
- Sub-millisecond queries at our scale

MIT, contributions welcome.

GitHub: [link]
```

### r/LocalLLaMA (Cross-pollination)

**Titel**: `Open source semantic memory layer for AI coding - LanceDB + ONNX embeddings, runs fully local, no cloud dependencies`

---

## 5. YouTube Short - Alternatives Konzept

### KONZEPT B: "Goldfish to Elephant" (Humor + Visual)

```
00:00  [Goldfish emoji animation] "Your AI's memory span"
00:03  [Cut to: Terminal, Claude saying "I don't have context"]
00:05  [Text: "UNTIL NOW"]
00:06  [3D Brain awakening animation from viral-demo.html]
00:10  [Quick cuts: Memory feed scrolling, stats appearing]
00:15  [Text: "1,247 memories stored"]
00:17  [Terminal: Claude responding with perfect project context]
00:22  [Elephant emoji animation] "Your AI's memory span now"
00:25  [Logo + "Open Source" + GitHub link]
00:28  [Text: "Link in bio"]
```

### KONZEPT C: "Before / After" (Satisfying Format)

```
00:00  SPLIT SCREEN
       LEFT: "Without UltraBrain" / RIGHT: "With UltraBrain"

00:02  LEFT: User typing long architecture explanation
       RIGHT: User just asks the question

00:06  LEFT: Claude: "I'll need more context..."
       RIGHT: Claude: "Based on your previous sessions, here's exactly what you need..."

00:12  LEFT: Timer counting up (5:00... 6:00... 7:00...)
       RIGHT: Timer: 0:03

00:15  CENTER: 3D Brain animation
       Text: "Give your AI a brain."

00:20  Stats + CTA
```

---

## 6. Hashtag-Strategie

### X Hashtags (Max 3 pro Tweet)
```
Primary:    #ClaudeCode #AI #OpenSource
Secondary:  #DevTools #CodingWithAI #AIMemory
Trending:   #BuildInPublic #Anthropic #Claude
Technical:  #VectorDatabase #LanceDB #TypeScript
```

### YouTube Tags
```
claude code, claude ai, ai memory, ai coding, claude code plugin,
semantic search, vector database, lancedb, open source ai tools,
ai developer tools, persistent memory, claude desktop, anthropic,
coding with ai 2025, ai coding assistant, ultrabrain
```

---

## 7. Optimale Posting-Zeiten

| Plattform | Beste Zeit (UTC) | Grund |
|-----------|-------------------|-------|
| X | 14:00-16:00 Di-Do | US Tech-Twitter Peak |
| X | 09:00-11:00 Di-Do | EU Dev-Community |
| YouTube | 15:00-17:00 Mi/Do | Shorts-Algorithmus |
| Reddit | 13:00-15:00 Di/Mi | r/programming Peak |

---

## 8. Engagement-Strategie

### Erste 30 Minuten nach Post (Kritisch fuer Algorithmus)
1. Eigene Reply mit technischem Detail posten
2. In 3-5 relevanten Communities teilen
3. Direkt-DMs an 10-15 Tech-Influencer
4. Auf jeden Kommentar in < 5 Min antworten

### Influencer-Targets (X)
- Claude/Anthropic Power-User
- AI Coding Tool Reviewer
- Open Source Advocates
- Dev Tool Newsletter-Autoren
- Tech YouTuber mit Shorts-Format

### Engagement-Hooks fuer Kommentare
- "What feature would you add?" (Diskussion)
- "How many hours do you waste re-explaining context?" (Relatable)
- "Should AI assistants have persistent memory by default?" (Meinungsfrage)

---

## 9. Asset-Checkliste

### Vor Launch erstellen:
- [x] `viral-demo.html` - Interaktive 3D Demo-Seite
- [ ] 30s Screen-Recording (9:16) fuer YouTube Shorts
- [ ] 30s Screen-Recording (16:9) fuer X Video
- [ ] 3x Screenshots (Brain UI, Memory Feed, Stats)
- [ ] GIF: Brain-Awakening-Sequence (5s Loop)
- [ ] OG-Image fuer Link-Previews (1200x630)
- [ ] Banner-Image fuer GitHub Repo (1280x640)

### Recording-Setup:
1. Chrome Vollbild, `viral-demo.html`
2. OBS Studio, 60fps, Display Capture
3. Audio: Epidemic Sound oder Artlist Track
4. Edit: CapCut (Shorts) / DaVinci Resolve (X)
5. Color Grade: Leichter Kontrast-Boost, Schaerfe +10%

---

## 10. Viral-Metriken & Ziele

### Woche 1 Ziele:
| Metrik | X | YouTube | Reddit |
|--------|---|---------|--------|
| Impressions | 100K+ | 50K+ | 30K+ |
| Engagement Rate | >5% | >8% | Top 5 Post |
| GitHub Stars | +200 | +100 | +150 |
| Shares/Reposts | 100+ | N/A | 50+ Upvotes |

### KPIs tracken:
- GitHub Stars pro Tag (vor/nach Content)
- npm Downloads pro Woche
- Traffic-Quelle in GitHub Insights
- Engagement-Rate pro Post-Format
- Follower-Wachstum

---

## 11. Iterationsstrategie

### A/B-Test Hooks (Erste Woche):
1. "Your AI has amnesia" (Problem)
2. "I gave Claude a brain" (Achievement)
3. "80% less tokens, infinite memory" (Value)
4. "Claude remembers everything now" (Capability)

-> Besten Hook fuer Folge-Content verwenden

### Content-Recycling:
- X Thread -> Blog Post -> Medium Artikel
- YouTube Short -> TikTok (gleicher Content)
- Reddit Post -> Dev.to Artikel (ausfuehrlicher)
- Best Comments -> Quote-Tweets mit Antworten
