# UltraBrain Video-Launch-Kampagne 2026

## Maximale Reichweite auf X (Professional) + YouTube

**Produkt:** UltraBrain v1.0.0 – Persistent Semantic Memory for Claude Code
**Account:** @EconLabAi (X Professional) / EconLab AI (YouTube)
**Video-Asset:** `youtube-short-remotion.mp4` (1080×1920, 40s, 30fps, 23.2 MB)
**Launch:** KW 8/2026 – Montag, 17. Februar 2026
**Erstellt:** 14. Februar 2026

---

## TEIL 1: X (PROFESSIONAL ACCOUNT) – VIDEO-POST KONFIGURATION

### 1.1 Warum X Professional + Premium entscheidend ist

Der X-Algorithmus 2026 gibt Premium-Accounts einen **2×–4× Sichtbarkeits-Boost**:

| Feature | Ohne Premium | Mit Premium/Professional |
|---------|-------------|-------------------------|
| In-Network Boost | 1× | 4× |
| Out-of-Network Boost | 1× | 2× |
| Reply-Priorisierung | Normal | Top of Thread |
| Video-Upload-Limit | 140s / 512 MB | bis 4h / 16 GB |
| Link-Post-Reichweite | ~0 Median Engagement (seit März 2026!) | Reduziert, aber sichtbar |
| For-You-Feed Placement | Nachrangig | Bevorzugt |

**→ Status prüfen:** Sicherstellen, dass @EconLabAi auf X Premium (mindestens) oder Premium+ steht. Ohne Premium ist organische Reichweite 2026 nahezu unmöglich.

---

### 1.2 Video-Technische Spezifikationen für X

Das Video `youtube-short-remotion.mp4` muss für X angepasst werden:

#### Aktuelle Specs des Videos
```
Format:     MP4
Auflösung:  1080×1920 (9:16 Portrait)
Dauer:      40 Sekunden
Framerate:  30 fps
Größe:      23.2 MB
```

#### X Video-Anforderungen 2026
```
Format:          MP4 oder MOV (✅ MP4 passt)
Codec:           H.264 Video + AAC Audio (✅ prüfen)
Max. Auflösung:  1920×1080 (Landscape) oder 1080×1920 (Portrait)
Framerate:       30 fps empfohlen (✅ passt)
Max. Dauer:      140s (Free) / 4h (Premium) → 40s ✅
Max. Größe:      512 MB (Free) / 16 GB (Premium) → 23.2 MB ✅
Aspect Ratio:    9:16 wird auf X im Feed als Hochformat angezeigt
```

#### Empfehlung: Zweites Landscape-Video erstellen
X zeigt Videos im Feed primär im **16:9 Landscape-Format** an. Ein 9:16 Video wird in einen kleinen Bereich gequetscht. Daher:

```bash
# 9:16 → 16:9 Konvertierung (Letter-Boxed mit Blur-Background)
ffmpeg -i youtube-short-remotion.mp4 \
  -vf "split[original][bg];[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=20[blurred];[blurred][original]overlay=(W-w)/2:(H-h)/2" \
  -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 192k \
  ultrabrain-x-landscape.mp4
```

**Alternative (besser):** Zweite Remotion-Render-Version in 1920×1080 erstellen, falls der Remotion-Source noch verfügbar ist.

**Entscheidung:**
- **Option A:** 9:16 Portrait direkt hochladen → funktioniert, aber kleiner im Feed
- **Option B:** 16:9 Version für X erstellen → größere Feed-Präsenz, mehr Dwell Time
- **Option C:** Beide Versionen – 16:9 für Launch-Post, 9:16 für Follow-up

---

### 1.3 Der Launch-Post: Algorithmus-Maximierte Konfiguration

#### Algorithmus-Score-Berechnung

```
Final Score = Σ (weight × P(action))
```

**Ziel: Jeden einzelnen Hebel maximieren:**

| Signal | Weight | Wie wir es triggern |
|--------|--------|---------------------|
| Reply → Author Reply | +75.0 | Frage am Ende, auf JEDEN Reply in <30min antworten |
| Bookmark | 5× Multiplikator | Framework/Numbers = Save-worthy |
| Quote Tweet | 4× Multiplikator | Kontroverser Take = quotable |
| Meaningful Reply (10+ Wörter) | 3× Multiplikator | Substanzielle Antworten geben |
| Dwell Time 2+ Min | +10.0 | Video + langer Text = Verweildauer |
| Profile Click → Like/Reply | +12.0 | Neugier auf Profil wecken |
| Repost | +1.0 | Teilbarer Insight |
| Video Watch 50%+ | +0.005 | 40s Video, Hook in Sekunde 1 |

#### Der Post-Text (Copy-Paste-Ready)

```
Your AI has amnesia.

Every Claude session starts from zero.
No memory of your architecture.
No memory of your bugs.
No memory of what you spent 3 hours explaining yesterday.

We fixed it. Open source. Free.

UltraBrain gives Claude a persistent brain.

The numbers:
→ < 1.3ms semantic search
→ 80% token savings
→ < 2 min setup
→ Zero Python dependencies
→ Fully local – your data never leaves your machine

What would YOU want your AI to remember?

Bookmark this. You'll need it.
```

**[VIDEO: ultrabrain-launch.mp4 – native Upload, KEIN Link]**

#### Warum dieser Text optimal ist (Signal-für-Signal)

| Element | Algo-Signal | Erklärung |
|---------|------------|-----------|
| "Your AI has amnesia." | **Dwell Time** | Sofortiger Scroll-Stop, provokante Aussage |
| Problem-Statement (5 Zeilen) | **Dwell Time + Replies** | Relatable Pain = emotionale Reaktion = Replies |
| "We fixed it. Open source. Free." | **Quote Tweet** | Quotable one-liner, 4× Multiplikator |
| Zahlen-Block (→ Aufzählung) | **Bookmark** | Save-worthy Data = 5× Multiplikator |
| "Fully local" | **Trust Signal** | Privacy-Concern = Diskussionsstarter |
| "What would YOU want your AI to remember?" | **Replies** | Direkte Frage = Reply-Generator = +75 Weight pro Reply mit Antwort |
| "Bookmark this." | **Bookmark CTA** | Expliziter CTA für 5× Multiplikator |

#### Post-Einstellungen auf X

| Einstellung | Wert | Grund |
|-------------|------|-------|
| **Sprache** | Englisch | 10× größere Zielgruppe als Deutsch |
| **Hashtags** | Max 1–2 im Hauptpost ODER in Self-Reply | Mehr als 3 Hashtags = -40% Reichweite. 1–2 relevante Hashtags steigern Engagement um 21%. |
| **Externe Links** | KEINE | -50% bis -90% Reichweite! Link kommt in Self-Reply |
| **Mentions** | KEINE im Hauptpost | Mentions im Hauptpost können als Spam gewertet werden |
| **Reply-Einstellungen** | "Everyone can reply" | Maximale Reply-Möglichkeit = maximaler Algo-Boost |
| **Video Upload** | Native (direkt auf X) | 3× mehr Engagement als externe Links |
| **Alt-Text für Video** | "UltraBrain: persistent semantic memory for Claude Code. 3D brain visualization with glowing nodes representing AI memories." | Accessibility + SEO |
| **Zeitpunkt** | Montag, 17.02.2026, 15:00 MEZ (= 9:00 AM EST) | US Tech Peak: 9–12 AM + 3–5 PM EST (Di–Do optimal) |

---

### 1.4 Self-Reply-Chain (Sofort nach Hauptpost)

Die Self-Reply-Chain ist KRITISCH. Hier kommen Links, Hashtags und technische Details hin – ohne den Hauptpost zu belasten.

#### Self-Reply #1 (direkt nach Post, ~15:01 MEZ): GitHub-Link
```
GitHub repo (star it):
github.com/EconLab-AI/Ultrabrain

Install in 2 commands:
/plugin marketplace add EconLab-AI/Ultrabrain
/plugin install ultrabrain

No config. No API keys. No Python.

Reply "installed" and I'll help you optimize your setup.
```

**Algo-Logik:** "Reply installed" generiert Replies → +75 Weight pro Reply mit Antwort. Der Link ist hier weniger schädlich als im Hauptpost.

#### Self-Reply #2 (~15:02 MEZ): Technischer Deep-Dive
```
For the nerds – why we chose LanceDB over ChromaDB:

→ Native Rust (napi-rs), no Python subprocess
→ In-process: zero network latency
→ Apache Arrow columnar storage
→ Sub-ms queries at 10k+ observations

The engine matters more than the model.

Agree?
```

**Algo-Logik:** Technisches Detail = Dwell Time, "Agree?" = Reply-Generator, Bookmark-Bait für Devs.

#### Self-Reply #3 (~15:03 MEZ): Hashtags + Discovery
```
#ClaudeCode #AI
```

**Algo-Logik:** 1–2 Hashtags können auch im Hauptpost stehen (steigert Engagement um 21%). In Self-Reply platziert, halten sie den Hauptpost clean. Beides funktioniert – mehr als 3 Hashtags vermeiden (-40% Reichweite).

---

### 1.5 Erste 2 Stunden nach Launch (Engagement-Protokoll)

Die ersten 2 Stunden sind ENTSCHEIDEND. Der X-Algorithmus wendet einen steilen Time-Decay-Faktor an: **ein Post verliert alle 6 Stunden die Hälfte seines Sichtbarkeits-Scores.**

#### Minuten-genaues Protokoll

| Zeit (MEZ) | Aktion | Plattform |
|------------|--------|-----------|
| 14:55 | Video-Upload vorbereiten, Text in Draft | X |
| 15:00 | **LAUNCH: Hauptpost mit Video veröffentlichen** | X |
| 15:01 | Self-Reply #1 (GitHub + Install) | X |
| 15:02 | Self-Reply #2 (Technisches Detail) | X |
| 15:03 | Self-Reply #3 (Hashtags) | X |
| 15:05 | YouTube Short live schalten (siehe Teil 2) | YouTube |
| 15:05–15:20 | 15 vorbereitete Influencer-DMs versenden | X |
| 15:00–17:00 | **AUF JEDEN REPLY ANTWORTEN** (< 5 Min Reaktionszeit) | X |
| 15:10 | In 3-5 Discord/Slack-Communities teilen | Discord/Slack |
| 15:15 | Reddit Posts (r/ClaudeAI, r/programming) | Reddit |
| 17:00–19:00 | Weiter Replies beantworten, Quote-Tweets auf gute Replies | X |
| 21:00 | Evening Boost: Quote eigenen Launch-Thread mit Insight | X |

#### Reply-Regeln (NICHT VERHANDELBAR)

1. **Auf JEDEN Reply antworten** – auch "nice!" bekommt eine substanzielle Antwort
2. **Mindestens 10 Wörter** pro Antwort → 3× Multiplikator für "Meaningful Reply"
3. **Fragen stellen** in Antworten → generiert Reply-Chains (+75 pro weitere Reply)
4. **Keine Template-Antworten** – jede Reply individuell
5. **Reaktionszeit < 5 Minuten** in den ersten 2 Stunden
6. **Quote-Tweet** die besten User-Replies mit eigener Perspektive → 4× Multiplikator

---

### 1.6 Profil-Optimierung vor Launch

Bevor der Post live geht, muss das X-Profil optimiert sein:

| Element | Optimierung |
|---------|-------------|
| **Display Name** | `Giuliano · EconLab AI` oder `EconLab AI 🧠` |
| **Bio** | `Building UltraBrain – persistent memory for Claude Code. Open source. From barber → DJ → AI developer. Building in public.` |
| **Location** | `Germany 🇩🇪 · Building with Claude` |
| **Website-Link** | `github.com/EconLab-AI/Ultrabrain` (oder econlab-ai.com) |
| **Pinned Tweet** | = Der Launch-Post (sofort nach Veröffentlichung pinnen!) |
| **Header-Banner** | UltraBrain 3D Brain + "Persistent Memory for Claude Code" |
| **Profilbild** | Klar erkennbar, professionell, konsistent mit GitHub/YouTube |

---

### 1.7 Post-Launch Content (Tag 2–7)

Jeder Folge-Post baut auf dem Launch-Momentum auf:

| Tag | Timing | Post-Typ | Hook |
|-----|--------|----------|------|
| **Di** | 15:30 | Problem Awareness | "Unpopular opinion: The biggest bottleneck in AI coding isn't the model. It's the amnesia." |
| **Mi** | 16:00 | Meme/Humor | Claude Dialog-Format, "explains architecture for the 47th time" |
| **Do** | 15:00 | Hot Take | "Memory is more important than intelligence. Agree or disagree?" |
| **Fr** | 15:30 | Build in Public | "We spent 6 months building this. Here's what we learned:" (5 Benchmarks) |
| **Sa** | 11:00 | Personal Story | "I went from being a barber to building AI tools." |
| **So** | 17:00 | Week 1 Recap | Zahlen + bestes User-Feedback + "What feature should we build next?" |

**Regel für jeden Post:** Immer mit einer Frage enden → Reply-Generator → +75 Weight.

---

## TEIL 2: YOUTUBE – SHORT + VIDEO KONFIGURATION

### 2.1 YouTube Shorts Algorithmus 2026 – Die Kernmechanik

Der YouTube Shorts Algorithmus funktioniert **unabhängig** vom regulären YouTube-Algorithmus. Entscheidende Signale:

| Signal | Gewichtung | Unsere Strategie |
|--------|-----------|------------------|
| **Viewed vs. Swiped Away** | Höchste Prio | Hook in den ersten 0.5 Sekunden |
| **Watch Completion Rate** | Sehr hoch | 40s Video mit durchgehender Spannung |
| **Replay Rate** | Hoch | 3D Brain = visuell faszinierend, Re-Watch-Trigger |
| **Likes in erster Stunde** | Hoch | CTA im Video + Cross-Promotion von X |
| **Shares** | Hoch | "Share with a dev friend" |
| **Trending Audio** | ~21% mehr Reichweite (nicht 2.5×) | Trending Sound in ersten 5 Sek prüfen, aber kein Gamechanger |
| **Comments** | Mittel-Hoch | Frage in Description |
| **Subscribe-after-Watch** | Mittel | CTA am Ende des Videos |

**Wichtige Änderung 2026:** YouTube Shorts können jetzt bis zu **3 Minuten** lang sein. Unser 40s Video liegt damit optimal im Sweet Spot (unter 60s = höchste Completion Rate).

---

### 2.2 YouTube Short – Komplette Upload-Konfiguration

#### Titel (Copy-Paste)

**Primärer Titel:**
```
Your AI Has Amnesia. We Fixed It. 🧠
```

**A/B Test-Varianten (für spätere Re-Uploads oder Repurposed Versions):**
```
I Gave Claude a Brain. Here's What Happened.
```
```
< 2ms Search. 80% Less Tokens. Open Source AI Memory.
```

**Titel-Optimierung:**
- Primäres Keyword ("AI") in den ersten 40 Zeichen (vor Mobile-Truncation)
- Unter 60 Zeichen gesamt
- Emotional + Curiosity Gap
- Emoji sparsam (max 1)

#### Beschreibung / Description (Copy-Paste)

```
UltraBrain gives Claude Code persistent semantic memory. Your AI finally remembers.

< 1.3ms vector search | 80% token savings | < 2 min setup | Zero Python | Fully local

Install:
/plugin marketplace add EconLab-AI/Ultrabrain
/plugin install ultrabrain

GitHub: https://github.com/EconLab-AI/Ultrabrain
Website: https://www.econlab-ai.com

Built with LanceDB (Rust), all-MiniLM-L6-v2 embeddings (ONNX), React + Three.js visualization.

What feature would YOU want your AI to remember? Comment below!

By EconLab AI (@EconLabAi on X)

#Shorts #ClaudeCode #AI #OpenSource #DevTools #CodingWithAI #AIMemory #VectorDatabase #LanceDB #Anthropic #Claude #AICoding #AITools #Programming #Developer #MachineLearning #SemanticSearch #BuildInPublic
```

**Description-Optimierung:**
- Primäres Keyword ("Claude Code persistent memory") in den ersten 25 Wörtern
- 150+ Wörter (YouTube SEO bevorzugt 250+, aber bei Shorts kürzer)
- Frage am Ende → Comment-Generator
- Install-Befehle direkt sichtbar → Conversion
- `#Shorts` Tag inkludiert (Pflicht für Shorts-Kategorisierung)
- 15-18 relevante Hashtags (YouTube erlaubt mehr als X)

#### Tags / Keywords (Copy-Paste in YouTube Studio)

```
claude code, claude ai, ai memory, ai coding, claude code plugin, semantic search, vector database, lancedb, open source ai tools, ai developer tools, persistent memory, claude desktop, anthropic, coding with ai 2026, ai coding assistant, ultrabrain, econlab, claude code tutorial, ai agent, mcp server, developer tools, ai tools 2026, claude code memory, ai productivity, rust vector database, onnx embeddings, three.js visualization, open source developer tools
```

**Tag-Optimierung:**
- Mix aus High-Volume ("ai coding", "claude ai") und Long-Tail ("claude code plugin", "rust vector database")
- Trending Keywords für 2026 ("ai tools 2026", "coding with ai 2026")
- Keine irreführenden Tags (negative Algo-Signale)
- Separate Keyword-Liste für Shorts vs. Long-Form

#### Thumbnail / Vorschaubild

YouTube Shorts haben kein Custom-Thumbnail im Shorts-Feed (der Algorithmus wählt einen Frame), ABER das Thumbnail erscheint auf der Kanalseite und in der regulären Suche.

**Empfohlenes Thumbnail (1080×1920):**
```
Hintergrund:    Frame aus Video bei Sekunde 8 (Brain Awakening)
Text oben:      "YOUR AI HAS AMNESIA" (weiß, fett, Impact/Bold)
Text unten:     "WE FIXED IT" (Cyan-Purple Gradient)
Style:          Dunkler Kontrast, Neon-Glow-Effekt
Branding:       EconLab AI Logo unten-links, dezent
```

**Erstellung:**
```bash
# Frame extrahieren
ffmpeg -ss 8 -i youtube-short-remotion.mp4 \
  -frames:v 1 thumbnail-base.png

# Text-Overlay mit ImageMagick oder Canva/Figma
```

#### Upload-Einstellungen in YouTube Studio

| Einstellung | Wert |
|-------------|------|
| **Sichtbarkeit** | Geplant → 17.02.2026, 15:05 MEZ (5 Min nach X Launch) |
| **Kategorie** | Science & Technology |
| **Sprache** | Englisch |
| **Untertitel** | Auto-generiert + manuell korrigiert (80% schauen ohne Ton!) |
| **Kommentare** | Aktiviert, nicht moderiert (maximales Engagement) |
| **Audience** | "Not made for kids" |
| **Paid Promotion** | Nein (organisch launchen, Paid später optional) |
| **Recording Date** | Aktuelles Datum |
| **Shorts Remix** | Erlauben (erhöht Reichweite durch Remixes) |
| **Embedding** | Erlauben |

---

### 2.3 YouTube Reguläres Video (Optional, aber empfohlen)

Zusätzlich zum Short kann dasselbe Video als **reguläres Video** hochgeladen werden, um beide Algorithmen zu bedienen:

| Aspekt | Short | Reguläres Video |
|--------|-------|-----------------|
| Format | 9:16 (1080×1920) | 16:9 (1920×1080) |
| Algorithmus | Shorts-Feed | Search + Suggested |
| Discovery | Swipe-basiert | Keyword-basiert |
| Monetarisierung | Shorts Revenue | Standard Revenue |

**Empfehlung:** Wenn eine 16:9 Version existiert oder erstellt werden kann, diese als separates reguläres Video hochladen mit SEO-optimiertem Titel und ausführlicher Beschreibung (250+ Wörter).

---

### 2.4 YouTube Kanal-Optimierung vor Launch

| Element | Optimierung |
|---------|-------------|
| **Kanalname** | EconLab AI |
| **Handle** | @EconLabAI (konsistent mit X) |
| **Kanalbeschreibung** | "Building open source AI tools. Creator of UltraBrain – persistent memory for Claude Code. Claude Code tutorials, AI dev tools, and building in public. From Germany." |
| **Kanal-Keywords** | claude code, ai tools, developer tools, open source, claude ai, ai memory |
| **Banner** | UltraBrain 3D Brain + Tagline + Social Links |
| **Links** | GitHub, X (@EconLabAi), Website |
| **Standardvideo** | Launch-Short als Channel Trailer |
| **Playlists** | "UltraBrain", "Claude Code Tutorials", "AI Dev Tools" |

---

## TEIL 3: CROSS-PLATFORM SYNCHRONISATION

### 3.1 Launch-Day Timeline (Montag, 17. Februar 2026)

```
14:30  Letzte Checks: Video-Uploads vorbereiten, Texte finalisieren
14:45  YouTube Short als "Geplant" einstellen (15:05 MEZ)
14:55  X Post in Draft: Text + Video vorbereitet
15:00  🚀 X LAUNCH: Hauptpost mit Video veröffentlichen
15:01  X: Self-Reply #1 (GitHub + Install CTA)
15:02  X: Self-Reply #2 (Technisches Detail)
15:03  X: Self-Reply #3 (Hashtags)
15:04  X: Launch-Post als Pinned Tweet setzen
15:05  YouTube Short geht live (geplant)
15:05  X: ENGAGEMENT-MODUS → auf jeden Reply antworten
15:10  Influencer-DMs versenden (15 Stück, vorbereitet)
15:15  Reddit: r/ClaudeAI Post
15:20  Reddit: r/programming Post
15:30  Discord/Slack Communities (3-5 Stück)
15:00–17:00  AKTIV: Jeden Reply beantworten (< 5 Min)
17:00–19:00  Weiter Replies beantworten
21:00  Evening Boost: Quote eigenen Thread mit neuem Insight
```

### 3.2 Content-Recycling-Pipeline

```
youtube-short-remotion.mp4 (Original 9:16)
├── X:  Native Video Upload im Launch-Post
├── YT: YouTube Short (Original Format)
├── YT: Reguläres Video (16:9 Version, falls erstellt)
├── GIF: Brain-Awakening 5s Loop → X Visual Posts (Tag 3, 5)
├── Screenshots: 3× Frames → X Image Posts
└── TikTok: Re-Upload (optional, gleicher Content)

Launch-Thread (X)
├── Reddit Posts (angepasster Ton)
├── Blog Post (Medium / Dev.to – Woche 2)
└── LinkedIn Artikel (professioneller Ton – Woche 2)
```

---

## TEIL 4: ERFOLGSMESSUNG & KPIs

### 4.1 Woche-1-Ziele

| Metrik | X | YouTube | GitHub |
|--------|---|---------|--------|
| Impressions | 100K+ | 50K+ | — |
| Engagement Rate | > 5% | > 8% | — |
| Replies/Kommentare | 200+ | 50+ | — |
| Bookmarks (X) / Saves (YT) | 500+ | — | — |
| Follower/Subscriber | +300 | +50 | — |
| GitHub Stars | — | — | **500+** |
| Video Watch Rate 50%+ | > 40% | > 60% | — |

### 4.2 X-Algorithmus-spezifische KPIs

| KPI | Ziel | Algo-Relevanz |
|-----|------|---------------|
| Reply-Rate pro Post | 20+ Replies | +75 Weight pro Author-Reply |
| Author-Reply-Rate | 100% aller Replies | Maximiert +75 Signal |
| Reply-Antwortzeit | < 5 Min (erste 2h), < 30 Min (danach) | Time-Decay-Faktor |
| Bookmark-Rate | > 3% | 5× Multiplikator |
| Quote-Tweet-Rate | > 2% | 4× Multiplikator |
| Thread Completion | > 40% | Dwell Time +10.0 |
| Profil-Klick-Rate | > 1% | +12.0 Weight |

### 4.3 YouTube Shorts KPIs

| KPI | Ziel | Algo-Relevanz |
|-----|------|---------------|
| Viewed vs. Swiped (Retention) | > 70% nicht geswiped | Primäres Ranking-Signal |
| Average View Duration | > 30s (von 40s) | Watch Completion |
| Replay Rate | > 5% | Re-Watch = Qualitätssignal |
| Likes in erster Stunde | > 50 | Early Engagement Boost |
| Comment Rate | > 2% | Interaktions-Signal |
| Share Rate | > 1% | Virales Signal |
| Subscribe-after-Watch | > 0.5% | Channel Growth Signal |

---

## TEIL 5: CHECKLISTEN

### 5.1 Vor-Launch-Checkliste (bis 16. Februar)

**Account-Setup:**
- [ ] X Premium/Professional aktiv und verifiziert
- [ ] X Bio aktualisiert mit UltraBrain-Mention
- [ ] X Header-Banner mit UltraBrain Branding
- [ ] YouTube-Kanal erstellt/optimiert (Name, Beschreibung, Links)
- [ ] YouTube Kanal-Keywords gesetzt

**Video-Assets:**
- [ ] `youtube-short-remotion.mp4` bereit (1080×1920, 40s)
- [ ] 16:9 Landscape-Version für X erstellt (optional, aber empfohlen)
- [ ] Thumbnail für YouTube Short erstellt (1080×1920)
- [ ] GIF: Brain-Awakening 5s Loop extrahiert
- [ ] 3 Screenshots aus Video extrahiert
- [ ] Untertitel/Captions für Video erstellt

**Content-Assets:**
- [ ] X Launch-Post Text finalisiert (siehe 1.3)
- [ ] Self-Reply-Chain Texte bereit (siehe 1.4)
- [ ] YouTube Titel + Description + Tags bereit (siehe 2.2)
- [ ] 15 Influencer-DMs personalisiert und in Drafts
- [ ] Reddit Posts (r/ClaudeAI, r/programming) vorbereitet
- [ ] Discord/Slack Nachrichten vorbereitet

**Technisch:**
- [ ] GitHub Repo README aktuell mit Screenshots
- [ ] npm Package published und installierbar getestet
- [ ] Plugin im Marketplace verfügbar und getestet
- [ ] Website econlab-ai.com mit UltraBrain-Sektion

### 5.2 Post-Checkliste (vor jedem X-Post)

- [ ] Starker Hook in Zeile 1–2?
- [ ] Erzeugt wahrscheinlich Replies/Diskussion?
- [ ] Bookmark-würdig (Framework, Zahlen, How-To)?
- [ ] KEINE externen Links im Hauptpost?
- [ ] KEINE Hashtags im Hauptpost (in Self-Reply)?
- [ ] KEINE Mentions im Hauptpost?
- [ ] "Everyone can reply" aktiviert?
- [ ] Video nativ hochgeladen (kein Link)?
- [ ] Endet mit einer Frage?
- [ ] Peak Time (15:00–17:00 MEZ)?
- [ ] Alt-Text für Bilder/Videos gesetzt?
- [ ] Letzte offene Replies beantwortet?

### 5.3 Algo-Cheat-Sheet (Quick Reference)

```
MAXIMIEREN:
+75.0   Reply + Author-Reply (JEDEN Reply beantworten!)
  5×    Bookmarks (Save-worthy Content erstellen)
  4×    Quote Tweets (Quotable One-Liner einbauen)
  3×    Meaningful Replies (10+ Wörter pro Antwort)
+12.0   Profile Click → Like/Reply
+10.0   Dwell Time 2+ Min (Video + langer Text)
  2-4×  Premium Account Boost (PFLICHT 2026!)

VERMEIDEN:
-369×   Reports (NIEMALS provozieren!)
 -80%   Offensive Text (clean bleiben)
-50-90% Externe Links im Hauptpost
 neg.   Blocks, Mutes, "Not Interested"
 neg.   Spam-Muster, Bot-Verhalten
 neg.   ALL CAPS Text
```

---

## TEIL 6: ALGORITHMUS-QUELLEN & REFERENZEN

Dieses Dokument basiert auf:

1. **X Open-Source Algorithm** (xai-org/x-algorithm) – offizielle Scoring-Gewichtungen
2. **X Platform Changes März 2026** – Link-Penalty für Non-Premium, Premium Visibility Boost
3. **YouTube Shorts Algorithm 2026** – Viewed vs. Swiped, 3-Min-Limit, Audio-Boost
4. **EconLab AI X-Strategie-Projekt** – Custom Algorithmus-Analyse und Optimierungsregeln

---

*Erstellt am 14.02.2026 von Claude für EconLab AI (@EconLabAi)*
*Kampagnen-Start: 17.02.2026, 15:00 MEZ*
