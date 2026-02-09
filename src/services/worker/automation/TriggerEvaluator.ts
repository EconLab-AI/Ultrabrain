/**
 * TriggerEvaluator - Evaluates trigger conditions against incoming events
 *
 * Supports:
 * - Event type matching
 * - Data key-value matching
 * - Text contains matching
 * - Tag matching
 */

export class TriggerEvaluator {
  evaluate(conditions: Record<string, any>, event: { type: string; data: any }): boolean {
    // Match event type
    if (conditions.event_type && conditions.event_type !== event.type) return false;

    // Match data conditions (simple key-value matching)
    if (conditions.data_matches) {
      for (const [key, value] of Object.entries(conditions.data_matches)) {
        if (event.data[key] !== value) return false;
      }
    }

    // Match text contains
    if (conditions.text_contains && typeof event.data.text === 'string') {
      if (!event.data.text.toLowerCase().includes(conditions.text_contains.toLowerCase())) return false;
    }

    // Match tag
    if (conditions.has_tag && Array.isArray(event.data.tags)) {
      if (!event.data.tags.includes(conditions.has_tag)) return false;
    }

    return true;
  }
}
