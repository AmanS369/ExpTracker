import { ScopeClassification } from "../types/ai.types";

export interface GuardrailCheckResult {
  allowed: boolean;
  classification: ScopeClassification;
  reason?: string;
  cannedResponse?: string;
}

export class AIGuardrailService {
  private static MAX_MESSAGE_LENGTH = 2000;

  // Patterns attempting to hijack system prompts or bypass security
  private static INJECTION_PATTERNS = [
    /ignore (all )?(previous|above) instructions/i,
    /system prompt/i,
    /reveal (your )?prompt/i,
    /you are now/i,
    /jailbreak/i,
    /DAN mode/i,
    /developer mode/i,
    /show instructions/i,
    /drop collection/i,
    /db\./i,
  ];

  // Common out-of-scope inquiry patterns
  private static OUT_OF_SCOPE_PATTERNS = [
    /write (a |some )?(python|javascript|code|script|html|css|function|program)/i,
    /debug this code/i,
    /capital of /i,
    /who won the (world cup|election|match|super bowl)/i,
    /tell me a joke/i,
    /write a (poem|story|song|essay)/i,
    /what is the meaning of life/i,
    /translate to /i,
    /recipe for /i,
    /weather in /i,
  ];

  static validateAndClassify(message: string): GuardrailCheckResult {
    const trimmed = message?.trim();

    if (!trimmed) {
      return {
        allowed: false,
        classification: "UNSAFE_REQUEST",
        reason: "Empty message",
        cannedResponse: "Please enter a message to begin.",
      };
    }

    if (trimmed.length > this.MAX_MESSAGE_LENGTH) {
      return {
        allowed: false,
        classification: "UNSAFE_REQUEST",
        reason: "Message exceeds maximum allowed character length.",
        cannedResponse: `Message is too long (maximum ${this.MAX_MESSAGE_LENGTH} characters). Please shorten your inquiry.`,
      };
    }

    // Check Prompt Injection
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          allowed: false,
          classification: "UNSAFE_REQUEST",
          reason: "Prompt injection or system override detected.",
          cannedResponse:
            "I am your personal finance assistant. I operate strictly within financial management guidelines and cannot alter my core instructions.",
        };
      }
    }

    // Check Out of Scope
    for (const pattern of this.OUT_OF_SCOPE_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          allowed: false,
          classification: "OUT_OF_SCOPE",
          reason: "Out of personal finance scope.",
          cannedResponse:
            "I'm your personal finance assistant. I can help you with your expenses, budgets, money lent to others, and credit card management. How can I assist with your finances today?",
        };
      }
    }

    // Classify as write vs query
    const writeKeywords = /\b(add|record|create|spent|lent|pay|paid|settle|update|delete|remove|set budget)\b/i;
    if (writeKeywords.test(trimmed)) {
      return { allowed: true, classification: "FINANCE_WRITE" };
    }

    return { allowed: true, classification: "FINANCE_QUERY" };
  }
}

