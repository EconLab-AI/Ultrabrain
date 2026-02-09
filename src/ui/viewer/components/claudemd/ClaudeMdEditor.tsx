import React, { useState, useEffect, useRef, useCallback } from 'react';

interface FileInfo {
  path: string;
  level: string;
  exists: boolean;
  content: string;
  lineCount: number;
  estimatedTokens: number;
  loadFrequency: 'every-message' | 'once-per-session' | 'on-demand';
  lastModified: number | null;
}

interface ClaudeMdEditorProps {
  file: FileInfo | null;
  onSave: (path: string, content: string) => void;
}

function basename(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

export function ClaudeMdEditor({ file, onSave }: ClaudeMdEditorProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      setOriginalContent(file.content);
    } else {
      setContent('');
      setOriginalContent('');
    }
  }, [file?.path, file?.content]);

  const hasChanges = content !== originalContent;
  const lineCount = content.split('\n').length;
  const estimatedTokens = Math.round(content.length / 4);

  const handleSave = useCallback(async () => {
    if (!file || !hasChanges) return;
    setSaving(true);
    try {
      onSave(file.path, content);
      setOriginalContent(content);
    } finally {
      setSaving(false);
    }
  }, [file, content, hasChanges, onSave]);

  const handleRevert = useCallback(() => {
    setContent(originalContent);
  }, [originalContent]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  if (!file) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          opacity: 0.4,
          fontSize: '0.85rem',
        }}
      >
        Select a file from the tree to edit
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color, #333)',
          fontSize: '0.8rem',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, flex: 1 }}>
          {basename(file.path)}
          {hasChanges && (
            <span style={{ color: '#f59e0b', marginLeft: '6px', fontSize: '0.7rem' }}>
              (unsaved)
            </span>
          )}
        </span>
        <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>
          {lineCount} lines | ~{estimatedTokens} tokens | {file.loadFrequency}
        </span>
        <button
          onClick={handleRevert}
          disabled={!hasChanges}
          style={{
            background: 'none',
            border: '1px solid var(--border-color, #444)',
            color: 'inherit',
            padding: '3px 10px',
            borderRadius: '4px',
            cursor: hasChanges ? 'pointer' : 'default',
            fontSize: '0.7rem',
            opacity: hasChanges ? 0.8 : 0.3,
          }}
        >
          Revert
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{
            background: hasChanges ? '#3b82f6' : 'transparent',
            border: hasChanges ? '1px solid #3b82f6' : '1px solid var(--border-color, #444)',
            color: hasChanges ? '#fff' : 'inherit',
            padding: '3px 12px',
            borderRadius: '4px',
            cursor: hasChanges ? 'pointer' : 'default',
            fontSize: '0.7rem',
            fontWeight: 500,
            opacity: hasChanges ? 1 : 0.3,
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Editor area with line numbers */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Line numbers gutter */}
        <div
          ref={lineNumbersRef}
          style={{
            width: '48px',
            flexShrink: 0,
            overflow: 'hidden',
            padding: '10px 0',
            borderRight: '1px solid var(--border-color, #333)',
            userSelect: 'none',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            lineHeight: '1.5',
            color: 'inherit',
            opacity: 0.3,
          }}
        >
          {lines.map((_, i) => (
            <div key={i} style={{ textAlign: 'right', paddingRight: '8px', height: '1.5em' }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{
            flex: 1,
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'inherit',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: '1.5',
            padding: '10px 12px',
            overflow: 'auto',
            whiteSpace: 'pre',
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
