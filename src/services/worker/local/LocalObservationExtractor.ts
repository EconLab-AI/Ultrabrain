/**
 * LocalObservationExtractor: Zero-token observation extraction from structured hook data
 *
 * Converts PostToolUse hook payloads (tool_name, tool_input, tool_response) directly
 * into ParsedObservation objects without any LLM calls.
 *
 * Features:
 * - Tool-specific extractors (Edit, Write, Read, Bash, Grep, Glob, WebSearch, WebFetch)
 * - Significance scoring (0.0-1.0) — below 0.2 = dropped
 * - Read batcher: accumulates sequential Read/Grep/Glob into one "Explored codebase" observation
 * - Type classification heuristics (bugfix, refactor, feature, discovery, change)
 */

import type { ParsedObservation } from '../../../sdk/parser.js';
import { logger } from '../../../utils/logger.js';
import { basename, dirname, extname } from 'path';

// Minimum significance to keep an observation (below this = dropped)
const MIN_SIGNIFICANCE = 0.2;

// Tools that produce zero observation value — skip entirely
const SKIP_TOOLS = new Set([
  'ToolSearch', 'AskUserQuestion', 'Skill', 'SlashCommand',
  'TodoWrite', 'TodoRead', 'ListMcpResourcesTool', 'ReadMcpResourceTool',
  'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'TaskOutput', 'TaskStop',
  'EnterPlanMode', 'ExitPlanMode', 'SendMessage', 'TeamCreate', 'TeamDelete',
  'NotebookEdit',
]);

// Number of sequential read-like ops before batching kicks in
const READ_BATCH_THRESHOLD = 3;

export interface HookPayload {
  tool_name: string;
  tool_input: any;
  tool_response: any;
  cwd?: string;
  prompt_number?: number;
}

interface ExtractedObservation extends ParsedObservation {
  significance: number;
}

/**
 * Extract human-readable name from file path
 * e.g. src/components/Header.tsx -> "Header component"
 */
function humanName(filePath: string): string {
  if (!filePath) return 'unknown file';
  const base = basename(filePath);
  const ext = extname(filePath);
  const name = base.replace(ext, '');

  // Determine suffix based on extension/path patterns
  if (filePath.includes('/components/') || ext === '.tsx' || ext === '.jsx') return `${name} component`;
  if (filePath.includes('/routes/') || filePath.includes('/http/')) return `${name} route`;
  if (filePath.includes('/hooks/')) return `${name} hook`;
  if (filePath.includes('.test.') || filePath.includes('.spec.')) return `${name} test`;
  if (ext === '.css' || ext === '.scss') return `${name} styles`;
  if (ext === '.json') return `${name} config`;
  if (ext === '.md') return `${name} docs`;
  if (ext === '.sql') return `${name} migration`;
  return name;
}

/**
 * Compute Jaccard similarity between two strings (word-level)
 */
function jaccardSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Classify an Edit operation into an observation type
 */
function classifyEdit(oldStr: string, newStr: string, filePath: string): string {
  const oldLen = (oldStr || '').length;
  const newLen = (newStr || '').length;

  // Bugfix indicators in new code
  const bugfixPatterns = /try\s*\{|catch\s*\(|\.catch\(|\?\.|\.finally\(|throw new|if\s*\(\s*!\s*|error\s*handling|fix(?:ed|es|ing)?/i;
  if (newStr && bugfixPatterns.test(newStr) && (!oldStr || !bugfixPatterns.test(oldStr))) {
    return 'bugfix';
  }

  // New file or entirely new content
  if (!oldStr || oldLen === 0) {
    return 'feature';
  }

  // Significant addition (new >> old)
  if (newLen > oldLen * 2) {
    return 'feature';
  }

  // Structural change with high similarity = refactor
  const similarity = jaccardSimilarity(oldStr, newStr);
  if (similarity > 0.4 && similarity < 0.95) {
    return 'refactor';
  }

  // Default for edits
  return 'change';
}

// ============================================================================
// Tool-specific extractors
// ============================================================================

function extractEdit(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const filePath = input?.file_path || '';
  const oldStr = input?.old_string || '';
  const newStr = input?.new_string || '';
  const type = classifyEdit(oldStr, newStr, filePath);

  const verb = type === 'bugfix' ? 'Fix' : type === 'refactor' ? 'Refactor' : type === 'feature' ? 'Extend' : 'Update';

  return {
    type,
    title: `${verb} ${humanName(filePath)}`,
    subtitle: filePath,
    facts: buildEditFacts(oldStr, newStr),
    narrative: buildEditNarrative(oldStr, newStr, filePath, type),
    concepts: detectConcepts(type, oldStr, newStr),
    files_read: [],
    files_modified: [filePath],
    significance: 0.7,
  };
}

function buildEditFacts(oldStr: string, newStr: string): string[] {
  const facts: string[] = [];
  if (!oldStr && newStr) {
    facts.push(`Added ${newStr.split('\n').length} lines of new code`);
  } else if (oldStr && newStr) {
    const removed = oldStr.split('\n').length;
    const added = newStr.split('\n').length;
    facts.push(`Replaced ${removed} lines with ${added} lines`);
  }

  // Extract key identifiers from the new code for richer context
  const identifiers = extractKeyIdentifiers(newStr);
  if (identifiers.length > 0) {
    facts.push(`Key changes: ${identifiers.slice(0, 3).join(', ')}`);
  }

  return facts;
}

/**
 * Extract meaningful identifiers from code for richer observation context.
 * Looks for function names, class names, variable assignments, imports, etc.
 */
function extractKeyIdentifiers(code: string): string[] {
  if (!code) return [];
  const ids: string[] = [];

  // Function/method definitions
  const funcMatch = code.match(/(?:function|async function|const|let|var)\s+(\w+)\s*[=(]/);
  if (funcMatch) ids.push(`${funcMatch[1]}()`);

  // Class definitions
  const classMatch = code.match(/(?:class|interface|type)\s+(\w+)/);
  if (classMatch) ids.push(classMatch[1]);

  // Import additions
  const importMatch = code.match(/import\s+(?:\{([^}]+)\}|(\w+))\s+from/);
  if (importMatch) ids.push(`import ${(importMatch[1] || importMatch[2]).trim()}`);

  // Export additions
  const exportMatch = code.match(/export\s+(?:function|const|class|interface)\s+(\w+)/);
  if (exportMatch) ids.push(`export ${exportMatch[1]}`);

  return ids;
}

/**
 * Detect relevant concepts from code changes for richer observation context.
 * Maps to the standard UltraBrain concept vocabulary.
 */
function detectConcepts(type: string, oldStr: string, newStr: string): string[] {
  const concepts: string[] = [];

  if (type === 'bugfix') {
    concepts.push('problem-solution');
    if (/\?\.|try|catch|null/.test(newStr)) concepts.push('gotcha');
  } else if (type === 'refactor') {
    concepts.push('what-changed');
    if (jaccardSimilarity(oldStr, newStr) > 0.5) concepts.push('pattern');
  } else if (type === 'feature') {
    concepts.push('how-it-works');
    if (!oldStr) concepts.push('why-it-exists');
  } else {
    concepts.push('what-changed');
  }

  return concepts;
}

function buildEditNarrative(oldStr: string, newStr: string, filePath: string, type: string): string {
  const name = humanName(filePath);
  const dir = dirname(filePath);

  // Build richer narrative based on actual code content
  const identifiers = extractKeyIdentifiers(newStr);
  const idContext = identifiers.length > 0 ? ` (${identifiers.slice(0, 2).join(', ')})` : '';

  if (type === 'bugfix') {
    // Try to describe what was fixed
    const hasNullCheck = /\?\.|!= ?null|!== ?null|!== ?undefined/.test(newStr);
    const hasTryCatch = /try\s*\{|catch\s*\(/.test(newStr);
    const hasValidation = /if\s*\(\s*!/.test(newStr);
    const detail = hasNullCheck ? 'null safety checks' : hasTryCatch ? 'error handling' : hasValidation ? 'input validation' : 'defensive logic';
    return `Fixed ${name} by adding ${detail}${idContext}. This prevents potential runtime errors in ${dir}.`;
  }

  if (type === 'refactor') {
    return `Refactored ${name}${idContext} to improve code structure and maintainability in ${dir}.`;
  }

  if (type === 'feature') {
    if (!oldStr || oldStr.length === 0) {
      return `Added new functionality to ${name}${idContext}. This extends the capabilities of ${dir}.`;
    }
    return `Extended ${name} with new functionality${idContext}. Builds on existing implementation in ${dir}.`;
  }

  return `Updated ${name}${idContext} in ${dir}.`;
}

function extractWrite(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const filePath = input?.file_path || '';
  const content = input?.content || '';
  const lineCount = content.split('\n').length;
  const identifiers = extractKeyIdentifiers(content);
  const idContext = identifiers.length > 0 ? ` Contains: ${identifiers.slice(0, 3).join(', ')}.` : '';

  return {
    type: 'feature',
    title: `Create ${humanName(filePath)}`,
    subtitle: filePath,
    facts: [`Created new file with ${lineCount} lines`, ...(identifiers.length > 0 ? [`Defines: ${identifiers.join(', ')}`] : [])],
    narrative: `Created new file ${humanName(filePath)} (${lineCount} lines) at ${filePath}.${idContext} This adds new functionality to ${dirname(filePath)}.`,
    concepts: [],
    files_read: [],
    files_modified: [filePath],
    significance: 0.7,
  };
}

function extractMultiEdit(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const filePath = input?.file_path || '';
  const edits = input?.edits || [];

  return {
    type: 'change',
    title: `Multi-edit ${humanName(filePath)}`,
    subtitle: `${edits.length} edits in ${filePath}`,
    facts: [`Applied ${edits.length} edits to ${basename(filePath)}`],
    narrative: `Made ${edits.length} simultaneous edits to ${humanName(filePath)}.`,
    concepts: [],
    files_read: [],
    files_modified: [filePath],
    significance: 0.7,
  };
}

function extractRead(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const filePath = input?.file_path || '';

  return {
    type: 'discovery',
    title: `Read ${humanName(filePath)}`,
    subtitle: filePath,
    facts: [`Read file ${basename(filePath)}`],
    narrative: `Examined ${humanName(filePath)} to understand its contents.`,
    concepts: [],
    files_read: [filePath],
    files_modified: [],
    significance: 0.15,
  };
}

function extractBash(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const command = input?.command || '';
  const description = input?.description || '';

  // Skip trivial commands
  if (/^(ls|pwd|echo|cd)\b/.test(command.trim())) {
    return {
      type: 'discovery',
      title: 'Run shell command',
      subtitle: command.substring(0, 80),
      facts: [],
      narrative: null,
      concepts: [],
      files_read: [],
      files_modified: [],
      significance: 0.05,
    };
  }

  // Classify based on command content
  let type = 'change';
  let significance = 0.4;

  if (/git\s+commit/.test(command)) {
    type = 'change';
    significance = 0.6;
  } else if (/npm\s+(install|add|i\s)/.test(command)) {
    type = 'feature';
    significance = 0.5;
  } else if (/npm\s+(run\s+)?(?:test|jest|vitest|pytest)/.test(command)) {
    type = 'discovery';
    significance = 0.4;
  } else if (/npm\s+run\s+build/.test(command)) {
    type = 'change';
    significance = 0.3;
  } else if (/(fix|bug|patch)/i.test(description || command)) {
    type = 'bugfix';
    significance = 0.5;
  }

  const title = description || `Run \`${command.substring(0, 60)}\``;

  // Build richer narrative from command context
  let narrative = description ? `${description}.` : `Ran shell command: ${command.substring(0, 100)}`;
  if (/git\s+commit/.test(command)) {
    const msgMatch = command.match(/-m\s+["']([^"']+)/);
    narrative = msgMatch ? `Committed changes: "${msgMatch[1]}".` : 'Committed pending changes to git.';
  } else if (/npm\s+(install|add)/.test(command)) {
    const pkgMatch = command.match(/(?:install|add)\s+([^\s-]+)/);
    narrative = pkgMatch ? `Installed dependency: ${pkgMatch[1]}.` : 'Installed project dependencies.';
  } else if (/npm\s+run\s+build/.test(command)) {
    narrative = 'Built the project to verify compilation and catch type errors.';
  } else if (/npm\s+(?:run\s+)?test/.test(command)) {
    narrative = 'Ran the test suite to verify functionality.';
  }

  // Check for response content that indicates success/failure
  const response = typeof payload.tool_response === 'string' ? payload.tool_response : JSON.stringify(payload.tool_response || '');
  if (response.length > 0 && response.length < 500) {
    const hasError = /error|failed|FAIL|ERR!/i.test(response);
    if (hasError) {
      narrative += ' The command reported errors.';
    }
  }

  return {
    type,
    title,
    subtitle: command.length > 80 ? command.substring(0, 80) + '...' : command,
    facts: [`Executed: ${command.substring(0, 120)}`],
    narrative,
    concepts: [],
    files_read: [],
    files_modified: [],
    significance,
  };
}

function extractGrep(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const pattern = input?.pattern || '';
  const searchPath = input?.path || '';

  return {
    type: 'discovery',
    title: `Search for "${pattern.substring(0, 40)}"`,
    subtitle: searchPath ? `in ${searchPath}` : 'in codebase',
    facts: [`Searched for pattern: ${pattern}`],
    narrative: `Searched codebase for "${pattern}"${searchPath ? ` in ${searchPath}` : ''}.`,
    concepts: [],
    files_read: [],
    files_modified: [],
    significance: 0.15,
  };
}

function extractGlob(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const pattern = input?.pattern || '';

  return {
    type: 'discovery',
    title: `Find files matching "${pattern.substring(0, 40)}"`,
    subtitle: pattern,
    facts: [`Searched for files matching: ${pattern}`],
    narrative: `Searched for files matching glob pattern "${pattern}".`,
    concepts: [],
    files_read: [],
    files_modified: [],
    significance: 0.12,
  };
}

function extractWebSearch(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const query = input?.query || '';

  return {
    type: 'discovery',
    title: `Web search: "${query.substring(0, 50)}"`,
    subtitle: null,
    facts: [`Searched web for: ${query}`],
    narrative: `Performed web search for "${query}" to gather external information.`,
    concepts: [],
    files_read: [],
    files_modified: [],
    significance: 0.5,
  };
}

function extractWebFetch(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const url = input?.url || '';

  return {
    type: 'discovery',
    title: `Fetch ${new URL(url).hostname}`,
    subtitle: url.substring(0, 80),
    facts: [`Fetched content from: ${url}`],
    narrative: `Fetched and analyzed content from ${url}.`,
    concepts: [],
    files_read: [],
    files_modified: [],
    significance: 0.45,
  };
}

function extractTask(payload: HookPayload): ExtractedObservation | null {
  const input = typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input;
  const description = input?.description || input?.prompt || '';

  return {
    type: 'change',
    title: `Delegate: ${(description as string).substring(0, 50)}`,
    subtitle: input?.subagent_type || null,
    facts: [`Spawned subagent: ${input?.subagent_type || 'general-purpose'}`],
    narrative: `Delegated task to subagent: ${description}.`,
    concepts: [],
    files_read: [],
    files_modified: [],
    significance: 0.4,
  };
}

// ============================================================================
// Dispatch table
// ============================================================================

const EXTRACTORS: Record<string, (payload: HookPayload) => ExtractedObservation | null> = {
  Edit: extractEdit,
  Write: extractWrite,
  MultiEdit: extractMultiEdit,
  Read: extractRead,
  Bash: extractBash,
  Grep: extractGrep,
  Glob: extractGlob,
  WebSearch: extractWebSearch,
  WebFetch: extractWebFetch,
  Task: extractTask,
};

// Tools that are "read-like" and should be batched
const READ_LIKE_TOOLS = new Set(['Read', 'Grep', 'Glob']);

// ============================================================================
// Main Extractor Class
// ============================================================================

export class LocalObservationExtractor {
  private readBatch: ExtractedObservation[] = [];
  private readBatchFiles: string[] = [];

  /**
   * Extract observations from a single hook payload.
   * Returns 0 or more observations (may batch reads).
   */
  extract(payload: HookPayload): ParsedObservation[] {
    const toolName = payload.tool_name;

    // Skip tools with zero observation value
    if (SKIP_TOOLS.has(toolName) || toolName.startsWith('mcp__')) {
      return [];
    }

    // Get extractor for this tool
    const extractor = EXTRACTORS[toolName];
    if (!extractor) {
      // Unknown tool — create generic observation
      logger.debug('LOCAL', `No extractor for tool: ${toolName}, creating generic observation`);
      return this.handleGenericTool(payload);
    }

    let obs: ExtractedObservation | null;
    try {
      obs = extractor(payload);
    } catch (err) {
      logger.debug('LOCAL', `Extractor failed for ${toolName}`, {}, err as Error);
      return [];
    }

    if (!obs || obs.significance < MIN_SIGNIFICANCE) {
      return [];
    }

    // Batch read-like tools
    if (READ_LIKE_TOOLS.has(toolName)) {
      return this.addToReadBatch(obs);
    }

    // Non-read tool: flush any pending read batch first, then return this observation
    const result: ParsedObservation[] = [];
    const flushed = this.flushReadBatch();
    if (flushed) result.push(flushed);
    result.push(this.stripSignificance(obs));
    return result;
  }

  /**
   * Flush any remaining batched observations (call at end of session / before summary)
   */
  flush(): ParsedObservation[] {
    const flushed = this.flushReadBatch();
    return flushed ? [flushed] : [];
  }

  private addToReadBatch(obs: ExtractedObservation): ParsedObservation[] {
    this.readBatch.push(obs);
    this.readBatchFiles.push(...obs.files_read);

    // If we haven't hit threshold, accumulate silently
    if (this.readBatch.length < READ_BATCH_THRESHOLD) {
      return [];
    }

    // Threshold reached — flush as a single batched observation
    const flushed = this.flushReadBatch();
    return flushed ? [flushed] : [];
  }

  private flushReadBatch(): ParsedObservation | null {
    if (this.readBatch.length === 0) return null;

    // Single read — return as-is
    if (this.readBatch.length === 1) {
      const single = this.stripSignificance(this.readBatch[0]);
      this.readBatch = [];
      this.readBatchFiles = [];
      return single;
    }

    // Multiple reads — batch into one observation
    const uniqueFiles = [...new Set(this.readBatchFiles)];
    const dirs = [...new Set(uniqueFiles.map(f => dirname(f)))];
    const count = this.readBatch.length;

    const batched: ParsedObservation = {
      type: 'discovery',
      title: `Explore codebase (${count} files)`,
      subtitle: dirs.length <= 3 ? dirs.join(', ') : `${dirs.length} directories`,
      facts: [`Examined ${count} files across ${dirs.length} directories`],
      narrative: `Explored ${count} files to understand the codebase structure and implementation.`,
      concepts: [],
      files_read: uniqueFiles,
      files_modified: [],
    };

    this.readBatch = [];
    this.readBatchFiles = [];
    return batched;
  }

  private handleGenericTool(payload: HookPayload): ParsedObservation[] {
    return [{
      type: 'change',
      title: `Use ${payload.tool_name}`,
      subtitle: null,
      facts: [`Used tool: ${payload.tool_name}`],
      narrative: `Used the ${payload.tool_name} tool.`,
      concepts: [],
      files_read: [],
      files_modified: [],
    }];
  }

  private stripSignificance(obs: ExtractedObservation): ParsedObservation {
    const { significance, ...parsed } = obs;
    return parsed;
  }
}
