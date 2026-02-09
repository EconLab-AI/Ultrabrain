/**
 * ClaudeMdAnalyzer
 *
 * Rule-based analysis engine for CLAUDE.md files.
 * Zero LLM cost - all rules are deterministic pattern matching.
 * Returns optimization suggestions for the CLAUDE.md hierarchy.
 */

export interface ClaudeMdSuggestion {
  id: string;
  type: 'warning' | 'info' | 'optimization';
  title: string;
  description: string;
  filePath: string;
  priority: 'high' | 'medium' | 'low';
  tokenImpact?: number;
}

export interface ClaudeMdFileInfo {
  path: string;
  level: string;
  exists: boolean;
  content: string;
  lineCount: number;
  estimatedTokens: number;
  loadFrequency: 'every-message' | 'once-per-session' | 'on-demand';
  lastModified: number | null;
}

/**
 * Analyze CLAUDE.md files and return optimization suggestions.
 * All rules are deterministic - no LLM calls.
 */
export function analyzeClamdeMd(files: ClaudeMdFileInfo[], db?: any): ClaudeMdSuggestion[] {
  const suggestions: ClaudeMdSuggestion[] = [];
  let idCounter = 0;

  const existingFiles = files.filter(f => f.exists && f.content);

  for (const file of existingFiles) {
    const nextId = () => `suggestion-${++idCounter}`;

    // Rule 1: Line count warning - files over 200 lines
    if (file.lineCount > 200) {
      suggestions.push({
        id: nextId(),
        type: 'warning',
        title: 'File exceeds 200 lines',
        description: `${file.path} has ${file.lineCount} lines. Consider moving detailed sections to .claude/rules/ files to keep the main CLAUDE.md focused.`,
        filePath: file.path,
        priority: 'high',
        tokenImpact: file.estimatedTokens,
      });
    }

    // Rule 2: Token impact for every-message files
    if (file.loadFrequency === 'every-message' && file.estimatedTokens > 500) {
      suggestions.push({
        id: nextId(),
        type: 'info',
        title: 'High per-message token cost',
        description: `This file adds ~${file.estimatedTokens} tokens to EVERY message. Consider reducing content or moving to on-demand loading.`,
        filePath: file.path,
        priority: file.estimatedTokens > 2000 ? 'high' : 'medium',
        tokenImpact: file.estimatedTokens,
      });
    }

    // Rule 3: Dynamic content detection (dates, versions)
    const dynamicPatterns = [
      /\b\d{4}-\d{2}-\d{2}\b/,           // ISO dates
      /\b(v|version)\s*\d+\.\d+/i,        // version numbers
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
      /\bAktualisiert:\s*/i,              // German "Updated:"
      /\bUpdated:\s*/i,                    // English "Updated:"
      /\bLast modified:\s*/i,
    ];

    for (const pattern of dynamicPatterns) {
      if (pattern.test(file.content)) {
        suggestions.push({
          id: nextId(),
          type: 'optimization',
          title: 'Dynamic content detected',
          description: `Found date/version references that may become stale. Consider moving dynamic content to UltraBrain context injection for automatic updates.`,
          filePath: file.path,
          priority: 'low',
        });
        break; // Only one suggestion per file for dynamic content
      }
    }

    // Rule 4: Empty sections detection
    const emptyPatterns = [
      /^#+\s+.+\n\s*\n(?=^#+|\z)/gm,                    // Header followed by blank line then another header
      /<!--\s*(placeholder|TODO|fixme|coming soon)\s*-->/i, // Placeholder comments
      /^#+\s+.+\n\s*<!--[^>]*-->\s*\n/gm,                // Header with only a comment
    ];

    for (const pattern of emptyPatterns) {
      if (pattern.test(file.content)) {
        suggestions.push({
          id: nextId(),
          type: 'optimization',
          title: 'Empty sections detected',
          description: `Found empty or placeholder sections. Remove them to save tokens - every character costs in the context window.`,
          filePath: file.path,
          priority: 'medium',
        });
        break;
      }
    }

    // Rule 5: MEMORY.md over 200 lines
    if (file.level === 'auto-memory' && file.lineCount > 200) {
      suggestions.push({
        id: nextId(),
        type: 'warning',
        title: 'MEMORY.md exceeds 200-line limit',
        description: `Only the first 200 lines of MEMORY.md are loaded into context. Lines after 200 are truncated. Current: ${file.lineCount} lines.`,
        filePath: file.path,
        priority: 'high',
        tokenImpact: Math.round((file.lineCount - 200) / file.lineCount * file.estimatedTokens),
      });
    }
  }

  // Rule 6: Duplicate content detection across files
  for (let i = 0; i < existingFiles.length; i++) {
    for (let j = i + 1; j < existingFiles.length; j++) {
      const a = existingFiles[i];
      const b = existingFiles[j];

      // Compare non-trivial lines (skip blanks and short lines)
      const aLines = a.content.split('\n').filter(l => l.trim().length > 20);
      const bLines = new Set(b.content.split('\n').filter(l => l.trim().length > 20));

      let duplicateCount = 0;
      for (const line of aLines) {
        if (bLines.has(line)) duplicateCount++;
      }

      if (duplicateCount > 3) {
        const idCounter2 = ++idCounter;
        suggestions.push({
          id: `suggestion-${idCounter2}`,
          type: 'optimization',
          title: 'Duplicate content across files',
          description: `Found ${duplicateCount} duplicate lines between ${a.path} and ${b.path}. Remove the lower-priority duplicate to save tokens.`,
          filePath: b.path,
          priority: 'medium',
          tokenImpact: duplicateCount * 10, // rough estimate
        });
      }
    }
  }

  // Rule 7: Learning patterns from observations (requires db)
  if (db) {
    try {
      const recurring = db.prepare(`
        SELECT title, COUNT(*) as cnt
        FROM observations
        WHERE title IS NOT NULL
        GROUP BY title
        HAVING cnt >= 3
        ORDER BY cnt DESC
        LIMIT 5
      `).all() as Array<{ title: string; cnt: number }>;

      for (const pattern of recurring) {
        const idCounter3 = ++idCounter;
        suggestions.push({
          id: `suggestion-${idCounter3}`,
          type: 'info',
          title: 'Recurring pattern detected',
          description: `"${pattern.title}" appeared ${pattern.cnt} times in observations. Consider adding guidance for this to your CLAUDE.md.`,
          filePath: existingFiles[0]?.path || '',
          priority: 'low',
        });
      }
    } catch {
      // DB query failed - skip learning pattern suggestions
    }
  }

  // Sort by priority: high > medium > low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}
