import { LLMProvider } from "../interfaces/llm-provider.interface";
import { LLMRequest, LLMResponse } from "../../types/ai.types";

/**
 * GeminiProvider (Planned Adapter Contract)
 * Reserved for future Google Gemini integration as required by SRS Section 6.3.
 */
export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    this.model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    throw new Error(
      "Google Gemini provider adapter is planned for future releases. Please set AI_PROVIDER=groq."
    );
  }

  async *streamResponse(request: LLMRequest): AsyncIterable<string> {
    throw new Error(
      "Google Gemini provider adapter is planned for future releases. Please set AI_PROVIDER=groq."
    );
  }
}

