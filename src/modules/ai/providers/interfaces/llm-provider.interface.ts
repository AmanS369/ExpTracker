import { LLMRequest, LLMResponse } from "../../types/ai.types";

export interface LLMProvider {
  /**
   * Generates a non-streaming response, optionally calling tools.
   */
  generateResponse(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Optional streaming response interface
   */
  streamResponse?(request: LLMRequest): AsyncIterable<string>;
}
