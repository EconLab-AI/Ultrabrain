import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';

interface TerminalTabProps {
  onData: (data: string) => void;
  dataToWrite?: string;
  onResize?: (cols: number, rows: number) => void;
  isActive: boolean;
}

const XTERM_CSS = `
.xterm { position: relative; user-select: none; -ms-user-select: none; -webkit-user-select: none; }
.xterm.focus, .xterm:focus { outline: none; }
.xterm .xterm-helpers { position: absolute; top: 0; z-index: 5; }
.xterm .xterm-helper-textarea { padding: 0; border: 0; margin: 0; position: absolute; opacity: 0; left: -9999em; top: 0; width: 0; height: 0; z-index: -5; white-space: nowrap; overflow: hidden; resize: none; }
.xterm .composition-view { background: #000; color: #FFF; display: none; position: absolute; white-space: nowrap; z-index: 1; }
.xterm .composition-view.active { display: block; }
.xterm .xterm-viewport { background-color: #000; overflow-y: scroll; cursor: default; position: absolute; right: 0; left: 0; top: 0; bottom: 0; }
.xterm .xterm-screen { position: relative; }
.xterm .xterm-screen canvas { position: absolute; left: 0; top: 0; }
.xterm .xterm-scroll-area { visibility: hidden; }
.xterm-char-measure-element { display: inline-block; visibility: hidden; position: absolute; top: 0; left: -9999em; line-height: normal; }
.xterm.enable-mouse-events { cursor: default; }
.xterm.xterm-cursor-pointer, .xterm .xterm-cursor-pointer { cursor: pointer; }
.xterm.column-select.focus { cursor: crosshair; }
.xterm .xterm-accessibility, .xterm .xterm-message { position: absolute; left: 0; top: 0; bottom: 0; right: 0; z-index: 10; color: transparent; pointer-events: none; }
.xterm .live-region { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.xterm-dim { opacity: 0.5; }
.xterm-underline-1 { text-decoration: underline; }
.xterm-underline-2 { text-decoration: double underline; }
.xterm-underline-3 { text-decoration: wavy underline; }
.xterm-underline-4 { text-decoration: dotted underline; }
.xterm-underline-5 { text-decoration: dashed underline; }
.xterm-overline { text-decoration: overline; }
.xterm-strikethrough { text-decoration: line-through; }
.xterm-screen .xterm-decoration-container .xterm-decoration { z-index: 6; position: absolute; }
.xterm-screen .xterm-decoration-container .xterm-decoration.xterm-decoration-top-layer { z-index: 7; }
.xterm-decoration-overview-ruler { z-index: 8; position: absolute; top: 0; right: 0; pointer-events: none; }
.xterm-decoration-top { z-index: 2; position: relative; }
`;

let cssInjected = false;
function injectXtermCSS() {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.setAttribute('data-xterm-css', 'true');
  style.textContent = XTERM_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  backgroundColor: '#0a0a14',
  overflow: 'hidden',
};

export function TerminalTab({ onData, dataToWrite, onResize, isActive }: TerminalTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const lastDataRef = useRef<string>('');

  useEffect(() => {
    injectXtermCSS();

    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
      lineHeight: 1.2,
      theme: {
        background: '#0a0a14',
        foreground: '#e0e0e0',
        cursor: '#e0e0e0',
        cursorAccent: '#0a0a14',
        selectionBackground: '#3a3a6a80',
        black: '#1a1a2e',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#6366f1',
        magenta: '#ec4899',
        cyan: '#06b6d4',
        white: '#e0e0e0',
        brightBlack: '#4a4a6a',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#818cf8',
        brightMagenta: '#f472b6',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminal.onData((data) => {
      onData(data);
    });

    terminal.onResize(({ cols, rows }) => {
      onResize?.(cols, rows);
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // ResizeObserver for auto-fit
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors during teardown
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
  }, []);

  // Write incoming data to terminal
  useEffect(() => {
    if (dataToWrite && dataToWrite !== lastDataRef.current && terminalRef.current) {
      terminalRef.current.write(dataToWrite);
      lastDataRef.current = dataToWrite;
    }
  }, [dataToWrite]);

  // Re-fit when tab becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      // Slight delay to ensure DOM has rendered
      const timer = setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch {
          // Ignore
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return <div ref={containerRef} style={containerStyle} />;
}
