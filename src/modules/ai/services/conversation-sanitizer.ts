import { LLMMessage } from "../types/ai.types";

export interface RawHistoricalMessage {
  role?: string;
  content?: string | null;
  name?: string;
  toolCalls?: any[];
  tool_calls?: any[];
  toolCallId?: string;
  tool_call_id?: string;
  createdAt?: Date | string;
}

export class ConversationHistorySanitizer {
  /**
   * Sanitizes and normalizes raw conversation history for LLM consumption.
   *
   * Ensures:
   * 1. Preserves correct order: user -> assistant tool_calls -> tool result(s) -> assistant response.
   * 2. Resolves camelCase and snake_case properties (toolCalls vs tool_calls, toolCallId vs tool_call_id).
   * 3. Normalizes tool call argument strings.
   * 4. Enforces non-empty name on tool messages (Groq Harmony requirement).
   * 5. Filters out orphan tool results that lack a preceding assistant tool call.
   * 6. Resolves missing tool results for declared tool calls so Groq/OpenAI never fails on incomplete groups.
   * 7. Ensures history slicing never cuts midway through an assistant-tool execution group.
   * 8. Does NOT re-execute any tools; purely reconstructs conversation structure.
   */
  static sanitize(
    rawMessages: RawHistoricalMessage[],
    maxTurns?: number
  ): LLMMessage[] {
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return [];
    }

    // Step 1: Normalize each message into a uniform intermediate structure
    const normalizedList: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      name?: string;
      tool_call_id?: string;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }> = [];

    for (const raw of rawMessages) {
      if (!raw || typeof raw !== "object") continue;

      const role = raw.role;
      if (role !== "system" && role !== "user" && role !== "assistant" && role !== "tool") {
        continue;
      }

      const content = typeof raw.content === "string" ? raw.content : "";
      const rawToolCalls = raw.tool_calls || raw.toolCalls;
      const rawToolCallId = raw.tool_call_id || raw.toolCallId;
      const rawName = raw.name;

      if (role === "assistant") {
        let validToolCalls:
          | Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }>
          | undefined = undefined;

        if (Array.isArray(rawToolCalls) && rawToolCalls.length > 0) {
          validToolCalls = [];
          for (const tc of rawToolCalls) {
            const fn = tc.function || tc;
            const id = typeof tc.id === "string" && tc.id.trim() ? tc.id.trim() : null;
            const name = typeof fn.name === "string" && fn.name.trim() ? fn.name.trim() : null;

            if (!id || !name) continue;

            let argsString = "{}";
            if (typeof fn.arguments === "string") {
              try {
                // Verify valid JSON
                JSON.parse(fn.arguments);
                argsString = fn.arguments;
              } catch {
                argsString = JSON.stringify({ raw: fn.arguments });
              }
            } else if (typeof fn.arguments === "object" && fn.arguments !== null) {
              argsString = JSON.stringify(fn.arguments);
            }

            validToolCalls.push({
              id,
              type: "function",
              function: {
                name,
                arguments: argsString,
              },
            });
          }

          if (validToolCalls.length === 0) {
            validToolCalls = undefined;
          }
        }

        normalizedList.push({
          role: "assistant",
          content,
          tool_calls: validToolCalls,
        });
      } else if (role === "tool") {
        const toolCallId =
          typeof rawToolCallId === "string" && rawToolCallId.trim()
            ? rawToolCallId.trim()
            : null;

        if (!toolCallId) {
          // Tool message without a tool_call_id is invalid and cannot be mapped
          continue;
        }

        normalizedList.push({
          role: "tool",
          content: content || "{}",
          tool_call_id: toolCallId,
          name: typeof rawName === "string" && rawName.trim() ? rawName.trim() : undefined,
        });
      } else {
        // user or system message
        normalizedList.push({
          role,
          content,
        });
      }
    }

    // Step 2: Validate tool call lifecycles and prune orphans / incomplete tool groups
    const result: LLMMessage[] = [];
    let i = 0;

    while (i < normalizedList.length) {
      const msg = normalizedList[i];

      if (msg.role === "tool") {
        // Any tool message encountered here without an active assistant tool call is an orphan!
        console.warn(`[HistorySanitizer] Dropping orphan tool message: ${msg.tool_call_id}`);
        i++;
        continue;
      }

      if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
        // This assistant message initiated tool calls.
        // It must be followed by matching tool results.
        const declaredCalls = msg.tool_calls;
        const callIdMap = new Map<string, string>(); // callId -> toolName
        for (const dc of declaredCalls) {
          callIdMap.set(dc.id, dc.function.name);
        }

        // Collect subsequent tool result messages
        const matchingToolResults: LLMMessage[] = [];
        const seenCallIds = new Set<string>();
        let nextIdx = i + 1;

        while (nextIdx < normalizedList.length && normalizedList[nextIdx].role === "tool") {
          const tMsg = normalizedList[nextIdx];
          const tId = tMsg.tool_call_id!;

          if (callIdMap.has(tId) && !seenCallIds.has(tId)) {
            seenCallIds.add(tId);
            matchingToolResults.push({
              role: "tool",
              tool_call_id: tId,
              name: tMsg.name || callIdMap.get(tId) || "financial_tool",
              content: tMsg.content,
            });
          } else {
            // Orphan or duplicate tool result
            console.warn(`[HistorySanitizer] Dropping unexpected tool result: ${tId}`);
          }
          nextIdx++;
        }

        if (seenCallIds.size === 0) {
          // No tool results exist at all for this assistant tool call (e.g. system crashed).
          // If the message also has no content, dropping it entirely is safest.
          // If it has content, strip the unresponded tool_calls.
          if (msg.content.trim().length > 0) {
            result.push({
              role: "assistant",
              content: msg.content,
            });
          } else {
            console.warn("[HistorySanitizer] Dropping assistant tool-call message with zero tool results");
          }
        } else {
          // If some tool calls were responded to but others were missing:
          // Synthesize fallback tool results for missing calls to satisfy Groq/OpenAI requirements.
          for (const dc of declaredCalls) {
            if (!seenCallIds.has(dc.id)) {
              console.warn(`[HistorySanitizer] Synthesizing missing tool result for call: ${dc.id}`);
              matchingToolResults.push({
                role: "tool",
                tool_call_id: dc.id,
                name: dc.function.name,
                content: JSON.stringify({ error: "Result unavailable from previous session." }),
              });
            }
          }

          // Push the valid assistant tool call message
          result.push({
            role: "assistant",
            content: msg.content,
            tool_calls: declaredCalls,
          });

          // Push all matching tool results in declaration order
          for (const dc of declaredCalls) {
            const tr = matchingToolResults.find((r) => r.tool_call_id === dc.id);
            if (tr) {
              result.push(tr);
            }
          }
        }

        i = nextIdx;
        continue;
      }

      // Normal user, system, or plain assistant message
      result.push({
        role: msg.role,
        content: msg.content,
      });
      i++;
    }

    // Step 3: Apply turn bounding if maxTurns is provided
    // Bound turns cleanly so we never cut between assistant tool_calls and tool results
    if (maxTurns && maxTurns > 0) {
      // Find user turn indices
      const userIndices: number[] = [];
      result.forEach((m, idx) => {
        if (m.role === "user") userIndices.push(idx);
      });

      if (userIndices.length > maxTurns) {
        const sliceStart = userIndices[userIndices.length - maxTurns];
        return result.slice(sliceStart);
      }
    }

    return result;
  }
}

