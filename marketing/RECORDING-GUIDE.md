# Recording Guide - UltraBrain Viral Video

## Schnellstart

### 1. Demo-Seite oeffnen
```bash
# Aus dem Projektverzeichnis:
open marketing/viral-demo.html
# oder:
google-chrome marketing/viral-demo.html --start-fullscreen
```

### 2. OBS Studio Setup

#### YouTube Shorts (9:16 Vertikal)
```
Einstellungen > Video:
  Basisaufloesung: 1080x1920
  Ausgabeaufloesung: 1080x1920
  FPS: 60

Einstellungen > Ausgabe:
  Encoder: x264 (oder NVENC/AMF)
  Bitrate: 30000 kbps
  Format: MKV (spaeter zu MP4 remuxen)
```

#### X Video (16:9 Horizontal)
```
Einstellungen > Video:
  Basisaufloesung: 1920x1080
  Ausgabeaufloesung: 1920x1080
  FPS: 60

Einstellungen > Ausgabe:
  Encoder: x264
  Bitrate: 20000 kbps
```

### 3. Aufnahme-Ablauf

1. OBS starten, Display Capture hinzufuegen
2. `viral-demo.html` in Chrome oeffnen
3. F11 fuer Vollbild
4. In OBS: Aufnahme starten
5. In Chrome: Seite neu laden (Ctrl+R) - Animation startet automatisch
6. 35 Sekunden warten (Animation ist ~30s)
7. Aufnahme stoppen

### 4. Post-Production

#### CapCut (Empfohlen fuer Shorts)
1. Video importieren
2. Audio-Track hinzufuegen (siehe Musik unten)
3. Schnitte bei Phasen-Uebergaengen setzen
4. Leichter Zoom-Effekt bei "Brain Awakening" (108%)
5. Export: 1080x1920, 30fps, H.264

#### DaVinci Resolve (Fuer X/YouTube)
1. Neues Projekt, Timeline 1920x1080 @ 60fps
2. Video auf Timeline
3. Color Grade: Lift Shadows leicht blau, Gain leicht warm
4. Audio: Bass-Drop bei 0:00, Build bei 0:08, Impacts bei 0:15
5. Export: H.264, 20Mbps

### 5. Audio-Empfehlungen

| Timing | Sound | Quelle |
|--------|-------|--------|
| 0:00 | Deep bass hit | freesound.org "cinematic bass" |
| 0:05 | Rising synth | Artlist "tech ambient" |
| 0:08 | Build-up begins | Epidemic Sound "digital" |
| 0:15 | Triple impact | freesound.org "impact hit" |
| 0:22 | Keyboard typing | freesound.org "typing" |
| 0:28 | Success chime | freesound.org "notification" |

### 6. Timeline-Anpassung

Die Animation-Timeline in `viral-demo.html` kann angepasst werden.
Im `<script>` Tag, Zeile mit `const timeline = [...]`:

```javascript
const timeline = [
  { t: 0,    phase: 0 },  // Dunkelheit (dauer: 1s)
  { t: 1000, phase: 1 },  // Hook-Text (dauer: 3.5s)
  { t: 4500, phase: 2 },  // Reveal-Text (dauer: 2.5s)
  { t: 7000, phase: 3 },  // Brain erwacht (dauer: 3.5s)
  { t: 10500, phase: 4 }, // Stats + Features (dauer: 3.5s)
  { t: 14000, phase: 5 }, // CTA (bleibt)
];
```

Fuer kuerzere Videos (15s TikTok): Timings halbieren.
Fuer laengere Videos (60s): Pausen verdoppeln.

### 7. Thumbnail-Erstellung

Fuer YouTube Shorts Thumbnail:
1. Demo-Seite bei Phase 3 pausieren (Brain voll sichtbar)
2. Screenshot machen
3. In Canva/Figma:
   - Text Overlay: "Your AI Has Amnesia" (gross, weiss, fett)
   - Roter Pfeil oder Emoji: Aufmerksamkeit
   - UltraBrain Logo unten rechts
   - Aspect Ratio: 1080x1920

### 8. Upload-Checkliste

#### YouTube Shorts
- [ ] Video: 1080x1920, < 60s
- [ ] Titel: "Your AI has amnesia. We fixed it. #shorts #ai #coding"
- [ ] Beschreibung: GitHub-Link + Kurztext
- [ ] Tags: (siehe VIRAL-CONTENT-STRATEGY.md)
- [ ] Thumbnail: Custom mit Text

#### X Video
- [ ] Video: 1920x1080, < 2:20
- [ ] Erster Tweet: Hook + Video
- [ ] Thread vorbereitet (6 Tweets)
- [ ] Link in letztem Tweet

#### Reddit
- [ ] Video als Link-Post
- [ ] Ausfuehrlicher Kommentar als Reply
- [ ] Subreddits: r/ClaudeAI, r/programming, r/LocalLLaMA
