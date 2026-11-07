import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AIConversation, AIChatMessage, AIPendingAction } from "@/models";
import { AIGuardrailService } from "./ai-guardrail.service";
import { AIContextService } from "./ai-context.service";
import { ToolExecutionService } from "./tool-execution.service";
import { LLMProviderFactory } from "../strategies/llm-provider.factory";
import { buildSystemPrompt } from "../prompts/system.prompt";
import { allAITools } from "../tools";
import { LLMMessage } from "../types/ai.types";

export interface SendMessageOptions {
  userId: string;
  conversationId?: string;
  message: string;
}

export interface ChatResponsePayload {
  conversationId: string;
  response: string;
  pendingAction?: {
    id: string;
    actionType: string;
    summaryText: string;
    arguments: Record<string, any>;
  };
}

export class AIChatService {
  private static MAX_TOOL_CALL_LOOPS = 5;
  private static MAX_HISTORY_MESSAGES = 15;

  static async sendMessage({
    userId,
    conversationId,
    message,
  }: SendMessageOptions): Promise<ChatResponsePayload> {
    await connectToDatabase();
    const uId = new mongoose.Types.ObjectId(userId);

    // 1. Guardrail Validation & Scope Restriction
    const guardrail = AIGuardrailService.validateAndClassify(message);
    if (!guardrail.allowed || guardrail.classification === "OUT_OF_SCOPE") {
      // Find or create conversation to store the exchange
      let conv = conversationId
        ? await AIConversation.findOne({ _id: new mongoose.Types.ObjectId(conversationId), userId: uId })
        : null;

      if (!conv) {
        conv = await AIConversation.create({
          userId: uId,
          title: message.slice(0, 35) || "Finance Conversation",
        });
      }

      await AIChatMessage.create({
        userId: uId,
        conversationId: conv._id,
        role: "user",
        content: message,
      });

      const canned =
        guardrail.cannedResponse ||
        "I am your personal finance assistant. I can only assist with personal expenses, money lent or owed, credit card debts, and budget management.";

      await AIChatMessage.create({
        userId: uId,
        conversationId: conv._id,
        role: "assistant",
        content: canned,
      });

      return {
        conversationId: conv._id.toString(),
        response: canned,
      };
    }

    // 2. Load or Create Conversation
    let conversation = conversationId
      ? await AIConversation.findOne({ _id: new mongoose.Types.ObjectId(conversationId), userId: uId })
      : null;

    if (!conversation) {
      conversation = await AIConversation.create({
        userId: uId,
        title: message.slice(0, 40) || "Financial Inquiry",
      });
    }

    // 3. Save User Message
    await AIChatMessage.create({
      userId: uId,
      conversationId: conversation._id,
      role: "user",
      content: message,
    });

    // 4. Build Context & System Prompt
    const context = await AIContextService.buildUserContext(userId);
    const systemPrompt = buildSystemPrompt(context);

    // 5. Load Recent Conversation History (bounded token budget)
    const historyMessages = await AIChatMessage.find({
      userId: uId,
      conversationId: conversation._id,
    })
      .sort({ createdAt: -1 })
      .limit(this.MAX_HISTORY_MESSAGES)
      .lean();

    historyMessages.reverse();

    // Map to LLM messages
    const llmMessages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages.map((h) => ({
        role: h.role as any,
        content: h.content,
        tool_call_id: h.toolCallId,
        tool_calls: h.toolCalls,
      })),
    ];

    // 6. Execute with Provider
    const provider = LLMProviderFactory.createProvider();
    let loops = 0;
    let finalContent = "";
    let capturedPendingAction: any = null;

    while (loops < this.MAX_TOOL_CALL_LOOPS) {
      loops++;
      const response = await provider.generateResponse({
        messages: llmMessages,
        tools: allAITools,
        temperature: 0.1,
      });

      if (response.content) {
        finalContent = response.content;
      }

      // If no tool calls requested, we have our final text
      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      // Model requested tool call(s)
      llmMessages.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: response.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });

      // Execute each tool call
      for (const tc of response.toolCalls) {
        const execution = await ToolExecutionService.executeTool(
          userId,
          conversation._id.toString(),
          tc.name,
          tc.arguments
        );

        if (execution.isPendingAction && execution.pendingActionId) {
          capturedPendingAction = {
            id: execution.pendingActionId,
            actionType: tc.name,
            summaryText: execution.summaryText || "Financial Action",
            arguments: tc.arguments,
          };
        }

        const toolResultContent = JSON.stringify(
          execution.success ? execution.data || { success: true } : { error: execution.error }
        );

        llmMessages.push({
          role: "tool",
          name: tc.name,
          tool_call_id: tc.id,
          content: toolResultContent,
        });

        // Save tool response in chat history
        await AIChatMessage.create({
          userId: uId,
          conversationId: conversation._id,
          role: "tool",
          content: toolResultContent,
          toolCallId: tc.id,
        });
      }
    }

    // If a write operation generated a pending action, ensure the assistant informs the user
    if (capturedPendingAction && (!finalContent || finalContent.trim().length === 0)) {
      finalContent = `I've prepared this action for you: **${capturedPendingAction.summaryText}**.\n\nPlease review and click **Confirm** below to save this transaction.`;
    }

    // 7. Save Assistant Message
    await AIChatMessage.create({
      userId: uId,
      conversationId: conversation._id,
      role: "assistant",
      content: finalContent || "I've reviewed your request. Let me know if you need any other financial insights.",
      pendingActionId: capturedPendingAction?.id
        ? new mongoose.Types.ObjectId(capturedPendingAction.id)
        : null,
    });

    // Update conversation timestamp
    conversation.updatedAt = new Date();
    await conversation.save();

    return {
      conversationId: conversation._id.toString(),
      response: finalContent,
      pendingAction: capturedPendingAction || undefined,
    };
  }
}

