/**
 * AI Assistant Configuration
 *
 * Implements 1-Hour Ephemeral Sliding Conversation Memory.
 * The TTL duration is configurable via AI_CONVERSATION_TTL_SECONDS (defaults to 3600 seconds).
 */

export const DEFAULT_AI_CONVERSATION_TTL_SECONDS = 3600; // 1 hour sliding inactivity window

export function getAIConversationTTLSeconds(): number {
  const envVal = process.env.AI_CONVERSATION_TTL_SECONDS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_AI_CONVERSATION_TTL_SECONDS;
}

export function computeSlidingExpiration(from: Date = new Date()): Date {
  const ttlSeconds = getAIConversationTTLSeconds();
  return new Date(from.getTime() + ttlSeconds * 1000);
}

