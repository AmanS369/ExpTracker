import Groq from "groq-sdk";
import { LLMProvider } from "../interfaces/llm-provider.interface";
import { LLMRequest, LLMResponse, LLMToolCall } from "../../types/ai.types";

export class GroqProvider implements LLMProvider {
  private client: Groq | null = null;
  private model: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.client = new Groq({ apiKey });
    }
    this.model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error(
        "GROQ_API_KEY is not configured. Please add GROQ_API_KEY to your environment variables."
      );
    }

    const messages = request.messages.map((m) => {
      const msg: any = { role: m.role, content: m.content || "" };
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      if (m.tool_calls) msg.tool_calls = m.tool_calls;
      if (m.name) msg.name = m.name;
      return msg;
    });

    const tools = request.tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        tool_choice: tools && tools.length > 0 ? "auto" : undefined,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 1500,
      });

      const choice = completion.choices[0];
      const message = choice?.message;

      let toolCalls: LLMToolCall[] | undefined;
      if (message?.tool_calls && message.tool_calls.length > 0) {
        toolCalls = message.tool_calls.map((tc) => {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments || "{}");
          } catch {
            parsedArgs = {};
          }
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: parsedArgs,
          };
        });
      }

      return {
        content: message?.content || null,
        toolCalls,
        finishReason: choice?.finish_reason,
      };
    } catch (err: any) {
      console.error("[GroqProvider Error]:", err);
      throw new Error(err.message || "Failed to communicate with Groq AI service.");
    }
  }

  async *streamResponse(request: LLMRequest): AsyncIterable<string> {
    if (!this.client) {
      throw new Error("GROQ_API_KEY is not configured.");
    }

    const messages = request.messages.map((m) => ({
      role: m.role as any,
      content: m.content,
    }));

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      temperature: request.temperature ?? 0.2,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

