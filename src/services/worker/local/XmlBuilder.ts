/**
 * XmlBuilder: Convert ParsedObservation[] to XML strings
 *
 * Generates synthetic XML that the existing parseObservations() parser understands.
 * This allows LocalAgent to reuse the entire ResponseProcessor pipeline
 * (storage, LanceSync, SSE broadcast, auto-labeling, kanban) with zero changes.
 */

import type { ParsedObservation } from '../../../sdk/parser.js';

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert a single ParsedObservation to XML string
 */
function observationToXml(obs: ParsedObservation): string {
  const factsXml = (obs.facts || []).map(f => `<fact>${escapeXml(f)}</fact>`).join('');
  const conceptsXml = (obs.concepts || []).map(c => `<concept>${escapeXml(c)}</concept>`).join('');
  const filesReadXml = (obs.files_read || []).map(f => `<file>${escapeXml(f)}</file>`).join('');
  const filesModifiedXml = (obs.files_modified || []).map(f => `<file>${escapeXml(f)}</file>`).join('');

  return `<observation>
  <type>${escapeXml(obs.type)}</type>
  <title>${escapeXml(obs.title || '')}</title>
  <subtitle>${escapeXml(obs.subtitle || '')}</subtitle>
  <facts>${factsXml}</facts>
  <narrative>${escapeXml(obs.narrative || '')}</narrative>
  <concepts>${conceptsXml}</concepts>
  <files_read>${filesReadXml}</files_read>
  <files_modified>${filesModifiedXml}</files_modified>
</observation>`;
}

/**
 * Convert an array of ParsedObservation to XML string.
 * The output is parseable by parseObservations() from sdk/parser.ts.
 */
export function buildXmlFromObservations(observations: ParsedObservation[]): string {
  if (observations.length === 0) return '';
  return observations.map(observationToXml).join('\n');
}

/**
 * Build a synthetic "Session started" init response XML.
 * This is what processAgentResponse() receives on session init.
 */
export function buildSyntheticInitResponse(project: string): string {
  return `<observation>
  <type>discovery</type>
  <title>Session started</title>
  <subtitle>Local extraction mode</subtitle>
  <facts><fact>Observations are extracted locally from structured hook data</fact><fact>Only session summaries use LLM calls</fact></facts>
  <narrative>Started a new session using local observation extraction for project ${escapeXml(project)}. Observations will be extracted directly from tool data with zero LLM tokens.</narrative>
  <concepts></concepts>
  <files_read></files_read>
  <files_modified></files_modified>
</observation>`;
}
