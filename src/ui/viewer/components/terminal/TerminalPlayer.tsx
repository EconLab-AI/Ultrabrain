/**
 * TerminalPlayer - Asciicast v2 replay component
 *
 * Fetches .cast files and replays them using xterm.js.
 * Supports play/pause, speed control, seeking, and progress display.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';

interface AsciicastHeader {
  version: number;
  width: number;
  height: number;
  timestamp?: number;
}

type AsciicastEvent = [number, string, string]; // [time, type, data]

interface TerminalPlayerProps {
  recordingId: number;
  onClose?: () => void;
}

export function TerminalPlayer({ recordingId, onClose }: TerminalPlayerProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const eventsRef = useRef<AsciicastEvent[]>([]);
  const headerRef = useRef<AsciicastHeader | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(0);
  const startTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse asciicast v2 content
  const parseAsciicast = useCallback((content: string): { header: AsciicastHeader; events: AsciicastEvent[] } => {
    const lines = content.trim().split('\n');
    if (lines.length === 0) throw new Error('Empty recording');

    const header = JSON.parse(lines[0]) as AsciicastHeader;
    const events: AsciicastEvent[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      try {
        const event = JSON.parse(lines[i]) as AsciicastEvent;
        if (event[1] === 'o') { // Only output events
          events.push(event);
        }
      } catch {
        // Skip malformed lines
      }
    }

    return { header, events };
  }, []);

  // Fetch and parse recording
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/recordings/${recordingId}`);
        if (!res.ok) throw new Error(`Failed to fetch recording: ${res.status}`);
        const text = await res.text();
        if (cancelled) return;

        const { header, events } = parseAsciicast(text);
        headerRef.current = header;
        eventsRef.current = events;

        if (events.length > 0) {
          setTotalDuration(events[events.length - 1][0]);
        }

        setIsLoaded(true);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [recordingId, parseAsciicast]);

  // Initialize xterm
  useEffect(() => {
    if (!isLoaded || !termRef.current || !headerRef.current) return;

    const term = new Terminal({
      cols: headerRef.current.width || 80,
      rows: headerRef.current.height || 24,
      disableStdin: true,
      cursorBlink: false,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#c9d1d9',
        selectionBackground: '#264f78',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 13,
    });

    term.open(termRef.current);
    terminalRef.current = term;

    return () => {
      term.dispose();
      terminalRef.current = null;
    };
  }, [isLoaded]);

  // Playback engine
  const scheduleNext = useCallback(() => {
    const events = eventsRef.current;
    const idx = currentIndexRef.current;
    const terminal = terminalRef.current;

    if (!terminal || idx >= events.length) {
      setIsPlaying(false);
      return;
    }

    const event = events[idx];
    const elapsed = (Date.now() - startTimeRef.current) / 1000 * speed;

    if (event[0] <= elapsed) {
      terminal.write(event[2]);
      currentIndexRef.current = idx + 1;
      setCurrentTime(event[0]);
      setProgress(totalDuration > 0 ? (event[0] / totalDuration) * 100 : 0);

      // Immediately process next event if it's also due
      timerRef.current = setTimeout(scheduleNext, 0);
    } else {
      const waitMs = ((event[0] - elapsed) / speed) * 1000;
      timerRef.current = setTimeout(scheduleNext, Math.min(waitMs, 100));
    }
  }, [speed, totalDuration]);

  // Play/Pause control
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsPlaying(false);
    } else {
      if (currentIndexRef.current >= eventsRef.current.length) {
        // Restart from beginning
        currentIndexRef.current = 0;
        terminalRef.current?.reset();
        setProgress(0);
        setCurrentTime(0);
      }
      startTimeRef.current = Date.now() - (currentTime / speed) * 1000;
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, speed]);

  // Start/stop playback
  useEffect(() => {
    if (isPlaying) {
      scheduleNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, scheduleNext]);

  // Seek handler
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const targetTime = fraction * totalDuration;

    // Stop current playback
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset terminal and replay up to target time
    const terminal = terminalRef.current;
    if (!terminal) return;

    terminal.reset();
    currentIndexRef.current = 0;

    const events = eventsRef.current;
    for (let i = 0; i < events.length; i++) {
      if (events[i][0] > targetTime) {
        currentIndexRef.current = i;
        break;
      }
      terminal.write(events[i][2]);
      currentIndexRef.current = i + 1;
    }

    setCurrentTime(targetTime);
    setProgress(fraction * 100);

    if (isPlaying) {
      startTimeRef.current = Date.now() - (targetTime / speed) * 1000;
      scheduleNext();
    }
  }, [totalDuration, isPlaying, speed, scheduleNext]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Failed to load recording: {error}</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading recording...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Recording #{recordingId}</span>
        {onClose && (
          <button style={styles.closeBtn} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Terminal */}
      <div ref={termRef} style={styles.terminal} />

      {/* Controls */}
      <div style={styles.controls}>
        {/* Play/Pause */}
        <button style={styles.playBtn} onClick={togglePlay}>
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Time */}
        <span style={styles.time}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>

        {/* Progress bar */}
        <div style={styles.progressContainer} onClick={handleSeek}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        </div>

        {/* Speed */}
        <select
          style={styles.speedSelect}
          value={speed}
          onChange={(e) => {
            const newSpeed = parseFloat(e.target.value);
            setSpeed(newSpeed);
            if (isPlaying) {
              startTimeRef.current = Date.now() - (currentTime / newSpeed) * 1000;
            }
          }}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    background: '#0d1117',
    borderRadius: '8px',
    border: '1px solid #30363d',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#161b22',
    borderBottom: '1px solid #30363d',
  },
  title: {
    color: '#c9d1d9',
    fontSize: '13px',
    fontWeight: 500,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  terminal: {
    padding: '8px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#161b22',
    borderTop: '1px solid #30363d',
  },
  playBtn: {
    background: 'none',
    border: 'none',
    color: '#c9d1d9',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  time: {
    color: '#8b949e',
    fontSize: '12px',
    fontFamily: 'monospace',
    minWidth: '80px',
  },
  progressContainer: {
    flex: 1,
    cursor: 'pointer',
    padding: '4px 0',
  },
  progressTrack: {
    height: '4px',
    background: '#30363d',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#58a6ff',
    borderRadius: '2px',
    transition: 'width 0.1s linear',
  },
  speedSelect: {
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '4px',
    color: '#c9d1d9',
    fontSize: '12px',
    padding: '2px 4px',
    cursor: 'pointer',
  },
  loading: {
    color: '#8b949e',
    padding: '24px',
    textAlign: 'center' as const,
    fontSize: '14px',
  },
  error: {
    color: '#f85149',
    padding: '24px',
    textAlign: 'center' as const,
    fontSize: '14px',
  },
};
