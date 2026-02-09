import React from 'react';

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

interface ClaudeMdFileTreeProps {
  files: FileInfo[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  'managed-policy': '#6b7280',
  'project-root': '#3b82f6',
  'project-rules': '#8b5cf6',
  'user-global': '#10b981',
  'project-local': '#3b82f6',
  'auto-memory': '#f59e0b',
  'subdirectory': '#6366f1',
};

const LEVEL_LABELS: Record<string, string> = {
  'managed-policy': 'Managed',
  'project-root': 'Project',
  'project-rules': 'Rules',
  'user-global': 'Global',
  'project-local': 'Local',
  'auto-memory': 'Memory',
  'subdirectory': 'Subdir',
};

const FREQ_LABELS: Record<string, string> = {
  'every-message': 'every msg',
  'once-per-session': 'per session',
  'on-demand': 'on demand',
};

function basename(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

/** Group files by level for the tree display */
function groupByLevel(files: FileInfo[]): Map<string, FileInfo[]> {
  const groups = new Map<string, FileInfo[]>();
  for (const file of files) {
    const existing = groups.get(file.level) || [];
    existing.push(file);
    groups.set(file.level, existing);
  }
  return groups;
}

export function ClaudeMdFileTree({ files, selectedPath, onSelect }: ClaudeMdFileTreeProps) {
  const grouped = groupByLevel(files);

  // Order levels in hierarchy order
  const levelOrder = [
    'managed-policy',
    'project-root',
    'project-rules',
    'user-global',
    'project-local',
    'auto-memory',
    'subdirectory',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
      {levelOrder.map(level => {
        const levelFiles = grouped.get(level);
        if (!levelFiles || levelFiles.length === 0) return null;

        const color = LEVEL_COLORS[level] || '#6b7280';
        const label = LEVEL_LABELS[level] || level;

        return (
          <div key={level} style={{ marginBottom: '4px' }}>
            <div
              style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: 0.5,
                padding: '4px 8px 2px',
                fontWeight: 600,
              }}
            >
              {label}
            </div>

            {levelFiles.map(file => {
              const isSelected = selectedPath === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => file.exists && onSelect(file.path)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: file.exists ? 'pointer' : 'default',
                    opacity: file.exists ? 1 : 0.35,
                    background: isSelected ? (color + '22') : 'transparent',
                    borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {basename(file.path)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6rem',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: color + '22',
                        color: color,
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {label}
                    </span>
                  </div>

                  {file.exists && (
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.65rem', opacity: 0.5 }}>
                      <span>{file.lineCount} lines</span>
                      <span>~{file.estimatedTokens} tok</span>
                      <span>{FREQ_LABELS[file.loadFrequency] || file.loadFrequency}</span>
                    </div>
                  )}

                  {!file.exists && (
                    <div style={{ fontSize: '0.65rem', opacity: 0.4, fontStyle: 'italic' }}>
                      not created
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
