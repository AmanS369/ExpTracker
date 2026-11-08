
import Groq from "groq-sdk";
import { LLMProvider } from "../interfaces/llm-provider.interface";
import {
  LLMRequest,
  LLMResponse,
  LLMToolCall,
} from "../../types/ai.types";

type AnyRecord = Record<string, any>;

export class GroqProvider implements LLMProvider {
  private client: Groq | null = null;
  private model: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey) {
      this.client = new Groq({ apiKey });
    }

    this.model =
      process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  }

  /**
   * Validate and normalize tool definitions before sending them to Groq.
   */
  private normalizeTools(requestTools?: AnyRecord[]) {
    if (!requestTools || requestTools.length === 0) {
      return undefined;
    }

    return requestTools.map((tool, index) => {
      if (!tool || typeof tool !== "object") {
        throw new Error(`Invalid tool at index ${index}`);
      }

      // Support both internal and already-normalized tool structures.
      const definition = tool.function ?? tool;

      const name = definition.name;
      const description = definition.description;
      const parameters = definition.parameters;

      if (typeof name !== "string" || !name.trim()) {
        throw new Error(
          `Groq tool at index ${index} has a missing or invalid function name`
        );
      }

      if (typeof description !== "string" || !description.trim()) {
        throw new Error(
          `Groq tool "${name}" has a missing description`
        );
      }

      if (
        !parameters ||
        typeof parameters !== "object" ||
        parameters.type !== "object" ||
        !parameters.properties ||
        typeof parameters.properties !== "object"
      ) {
        throw new Error(
          `Groq tool "${name}" has an invalid JSON Schema`
        );
      }

      return {
        type: "function" as const,
        function: {
          name: name.trim(),
          description,
          parameters,
        },
      };
    });
  }

  /**
   * Normalize internal tool calls into the format expected by Groq.
   */
  private normalizeToolCalls(calls: AnyRecord[]) {
    if (!Array.isArray(calls)) {
      throw new Error("Invalid assistant tool_calls");
    }

    return calls.map((call, index) => {
      const fn = call.function ?? call;

      const name = fn.name;
      const id = call.id;
      const args = fn.arguments ?? call.arguments ?? {};

      if (typeof name !== "string" || !name.trim()) {
        throw new Error(
          `Assistant tool call at index ${index} has no function name`
        );
      }

      if (typeof id !== "string" || !id.trim()) {
        throw new Error(
          `Assistant tool call "${name}" has no call ID`
        );
      }

      let argumentsString: string;

      if (typeof args === "string") {
        // Ensure arguments contain valid JSON.
        JSON.parse(args);
        argumentsString = args;
      } else {
        argumentsString = JSON.stringify(args);
      }

      return {
        id,
        type: "function" as const,
        function: {
          name: name.trim(),
          arguments: argumentsString,
        },
      };
    });
  }

  /**
   * Normalize conversation messages into Groq-compatible messages.
   */
  private normalizeMessages(requestMessages: AnyRecord[]) {
    if (!Array.isArray(requestMessages)) {
      throw new Error("Invalid conversation messages");
    }

    const messages = requestMessages.map((message, index) => {
      if (!message || typeof message !== "object") {
        throw new Error(`Invalid message at index ${index}`);
      }

      const role = message.role;

      if (
        !["system", "user", "assistant", "tool"].includes(role)
      ) {
        throw new Error(
          `Unsupported message role at index ${index}: ${role}`
        );
      }

      const normalized: AnyRecord = {
        role,
        content: message.content ?? null,
      };

      if (role === "assistant" && message.tool_calls) {
        normalized.tool_calls = this.normalizeToolCalls(
          message.tool_calls
        );

        // Assistant tool-call messages may have null content.
        normalized.content = message.content ?? null;
      }

      if (role === "tool") {
        if (
          typeof message.tool_call_id !== "string" ||
          !message.tool_call_id.trim()
        ) {
          throw new Error(
            `Tool result at index ${index} is missing tool_call_id`
          );
        }

        normalized.tool_call_id = message.tool_call_id;
        // Groq Harmony templater strictly requires a name on all tool messages
        normalized.name =
          typeof message.name === "string" && message.name.trim()
            ? message.name.trim()
            : "financial_tool";
      }

      return normalized;
    });

    // Ensure every tool result belongs to an earlier assistant tool call.
    const pendingCalls = new Set<string>();

    for (const message of messages) {
      if (message.role === "assistant" && message.tool_calls) {
        for (const call of message.tool_calls) {
          if (pendingCalls.has(call.id)) {
            throw new Error(`Duplicate tool call ID: ${call.id}`);
          }
          pendingCalls.add(call.id);
        }
      }

      if (message.role === "tool") {
        if (!pendingCalls.has(message.tool_call_id)) {
          throw new Error(`Orphan tool result: ${message.tool_call_id}`);
        }
        pendingCalls.delete(message.tool_call_id);
      }
    }

    return messages;
  }

  async generateResponse(
    request: LLMRequest
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error(
        "GROQ_API_KEY is not configured."
      );
    }

    const messages = this.normalizeMessages(
      request.messages as AnyRecord[]
    );

    const tools = this.normalizeTools(
      request.tools as AnyRecord[] | undefined
    );

    // Log metadata only. Do not log financial message contents.
    console.info("[GroqProvider] Request metadata:", {
      model: this.model,
      messageCount: messages.length,
      messageRoles: messages.map((m) => m.role),
      toolNames: tools?.map((t) => t.function.name) ?? [],
      toolCount: tools?.length ?? 0,
    });

    try {
      const completion =
        await this.client.chat.completions.create({
          model: this.model,
          messages: messages as any,
          ...(tools?.length
            ? {
              tools: tools as any,
              tool_choice: "auto" as const,
            }
            : {}),
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 1500,
        });

      const choice = completion.choices[0];
      const message = choice?.message;

      let toolCalls: LLMToolCall[] | undefined;

      if (message?.tool_calls?.length) {
        toolCalls = message.tool_calls.map((tc) => {
          let parsedArgs: Record<string, any>;

          try {
            parsedArgs = JSON.parse(
              tc.function.arguments || "{}"
            );
          } catch {
            throw new Error(
              `Groq returned invalid JSON arguments for tool ${tc.function.name}`
            );
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
      console.error("[GroqProvider Error]", {
        message: err.message,
        status: err.status,
        requestId:
          err.headers?.["x-request-id"] ??
          err.headers?.get?.("x-request-id"),
      });

      // Preserve the original error and status information.
      throw err;
    }
  }

  async *streamResponse(
    request: LLMRequest
  ): AsyncIterable<string> {
    if (!this.client) {
      throw new Error("GROQ_API_KEY is not configured.");
    }

    const messages = this.normalizeMessages(
      request.messages as AnyRecord[]
    );

    const stream =
      await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        stream: true,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 1500,
      });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;

      if (content) {
        yield content;
      }
    }
  }
}
