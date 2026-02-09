/**
 * WebhookManager - Generates and validates webhook paths and signatures
 *
 * Uses HMAC-SHA256 for webhook signature validation.
 */

import crypto from 'crypto';

export class WebhookManager {
  generateWebhookPath(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateSignature(payload: string, signature: string, secret: string): boolean {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sig = signature.replace('sha256=', '');
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
