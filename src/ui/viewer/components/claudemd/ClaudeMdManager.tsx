import React, { useState, useEffect, useCallback } from 'react';
import { ClaudeMdFileTree } from './ClaudeMdFileTree';
import { ClaudeMdEditor } from './ClaudeMdEditor';
import { ClaudeMdSuggestions } from './ClaudeMdSuggestions';
import { ProjectFilter } from '../shared/ProjectFilter';

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

interface Suggestion {
  id: string;
  type: 'warning' | 'info' | 'optimization';
  title: string;
  description: string;
  filePath: string;
  priority: 'high' | 'medium' | 'low';
  tokenImpact?: number;
}

interface ClaudeMdManagerProps {
  currentProject: string;
  projects: string[];
  onProjectChange: (project: string) => void;
}

export function ClaudeMdManager({ currentProject, projects, onProjectChange }: ClaudeMdManagerProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [cwdError, setCwdError] = useState(false);
  const [manualCwd, setManualCwd] = useState('');

  const fetchFiles = useCallback(async (cwd?: string) => {
    if (!currentProject) return;
    setLoading(true);
    setCwdError(false);
    try {
      const params = new URLSearchParams({ project: currentProject });
      if (cwd) params.set('cwd', cwd);
      const res = await fetch(`/api/claude-md/files?${params}`);
      if (!res.ok) {
        setCwdError(true);
        setFiles([]);
      } else {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.files?.length === 0) setCwdError(true);
      }
    } catch {
      setCwdError(true);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const fetchSuggestions = useCallback(async () => {
    if (!currentProject) return;
    try {
      const params = new URLSearchParams({ project: currentProject });
      const res = await fetch(`/api/claude-md/suggestions?${params}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // Failed to fetch suggestions
    }
  }, [currentProject]);

  useEffect(() => {
    fetchFiles();
    fetchSuggestions();
  }, [fetchFiles, fetchSuggestions]);

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  const handleSave = useCallback(async (filePath: string, content: string) => {
    try {
      const params = new URLSearchParams({ path: filePath });
      const res = await fetch(`/api/claude-md/file?${params}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();

      if (data.success) {
        // Refresh files and suggestions after save
        fetchFiles();
        fetchSuggestions();
      }
    } catch {
      // Save failed
    }
  }, [fetchFiles, fetchSuggestions]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  }, []);

  const selectedFile = files.find(f => f.path === selectedPath) || null;
  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));

  // Token budget summary
  const totalEveryMessage = files
    .filter(f => f.exists && f.loadFrequency === 'every-message')
    .reduce((sum, f) => sum + f.estimatedTokens, 0);

  if (!currentProject) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>CLAUDE.md Manager</div>
        <div style={{ opacity: 0.5, fontSize: '0.85rem', marginBottom: '1rem' }}>Select a project to manage its CLAUDE.md files.</div>
        {projects.length > 0 && <ProjectFilter value={currentProject} onChange={onProjectChange} projects={projects} />}
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '2rem', opacity: 0.5 }}>Loading CLAUDE.md files...</div>;
  }

  if (cwdError && files.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>CLAUDE.md Manager</div>
        <ProjectFilter value={currentProject} onChange={onProjectChange} projects={projects} />
        <div style={{ marginTop: '1rem', padding: '16px', borderRadius: '8px', border: '1px solid #f59e0b40', background: '#f59e0b08' }}>
          <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
            Could not detect project directory for <strong>{currentProject}</strong>.
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '12px' }}>
            Enter the full path to the project directory:
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={manualCwd}
              onChange={e => setManualCwd(e.target.value)}
              placeholder="/Users/.../project-name"
              onKeyDown={e => { if (e.key === 'Enter' && manualCwd.trim()) fetchFiles(manualCwd.trim()); }}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #333)',
                background: 'var(--bg-secondary, #1a1a2e)',
                color: 'inherit',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => { if (manualCwd.trim()) fetchFiles(manualCwd.trim()); }}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #333)',
                background: 'var(--accent-color, #6366f1)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Load
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Token budget bar */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-color, #333)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '0.75rem',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600 }}>CLAUDE.md Manager</span>
        <ProjectFilter value={currentProject} onChange={onProjectChange} projects={projects} />
        <span style={{ opacity: 0.5 }}>
          {files.filter(f => f.exists).length} files | ~{totalEveryMessage} tokens per message
        </span>
      </div>

      {/* Main content: tree + editor */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left panel: file tree */}
        <div
          style={{
            width: '240px',
            flexShrink: 0,
            borderRight: '1px solid var(--border-color, #333)',
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          <ClaudeMdFileTree
            files={files}
            selectedPath={selectedPath}
            onSelect={handleSelect}
          />
        </div>

        {/* Center: editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ClaudeMdEditor file={selectedFile} onSave={handleSave} />
          </div>

          {/* Bottom: suggestions */}
          {visibleSuggestions.length > 0 && (
            <div
              style={{
                borderTop: '1px solid var(--border-color, #333)',
                maxHeight: '200px',
                overflowY: 'auto',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  opacity: 0.6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Suggestions ({visibleSuggestions.length})
              </div>
              <ClaudeMdSuggestions
                suggestions={visibleSuggestions}
                onDismiss={handleDismiss}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
