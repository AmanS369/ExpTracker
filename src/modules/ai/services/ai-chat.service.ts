import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AIConversation, AIChatMessage, AIPendingAction } from "@/models";
import { AIGuardrailService } from "./ai-guardrail.service";
import { AIContextService } from "./ai-context.service";
import { ToolExecutionService } from "./tool-execution.service";
import { ConversationHistorySanitizer } from "./conversation-sanitizer";
import { LLMProviderFactory } from "../strategies/llm-provider.factory";
import { buildSystemPrompt } from "../prompts/system.prompt";
import { allAITools } from "../tools";
import { LLMMessage } from "../types/ai.types";
import { computeSlidingExpiration } from "../config/ai.config";

export interface SendMessageOptions {
  userId: string;
  conversationId?: string;
  message: string;
}

export interface ChatResponsePayload {
  conversationId: string;
  response: string;
  expiresAt: Date;
  pendingAction?: {
    id: string;
    actionType: string;
    summaryText: string;
    arguments: Record<string, any>;
  };
}

export class AIChatService {
  private static MAX_TOOL_CALL_LOOPS = 5;

  /**
   * Cleans up expired conversations and all their associated messages and pending actions.
   * Ensures expired conversations do not consume resources or leak into future turns.
   */
  static async cleanupExpiredSessions(userId: string): Promise<number> {
    await connectToDatabase();
    const uId = new mongoose.Types.ObjectId(userId);
    const now = new Date();

    const expiredConvs = await AIConversation.find({
      userId: uId,
      expiresAt: { $lte: now },
    })
      .select("_id")
      .lean();

    if (expiredConvs.length === 0) return 0;

    const convIds = expiredConvs.map((c) => c._id);
    await AIChatMessage.deleteMany({ conversationId: { $in: convIds } });
    await AIPendingAction.deleteMany({ conversationId: { $in: convIds } });
    const res = await AIConversation.deleteMany({ _id: { $in: convIds } });

    return res.deletedCount || 0;
  }

  /**
   * Retrieves the currently active, unexpired ephemeral conversation session for the user.
   * If the session has been inactive for > 1 hour, it is cleaned up and null is returned.
   */
  static async getActiveSession(userId: string) {
    await connectToDatabase();
    const uId = new mongoose.Types.ObjectId(userId);
    await this.cleanupExpiredSessions(userId);

    const now = new Date();
    const conversation = await AIConversation.findOne({
      userId: uId,
      expiresAt: { $gt: now },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!conversation) {
      return { conversation: null, messages: [] };
    }

    const rawMessages = await AIChatMessage.find({
      userId: uId,
      conversationId: conversation._id,
      role: { $in: ["user", "assistant"] },
    })
      .sort({ createdAt: 1 })
      .populate("pendingActionId")
      .lean();

    const visibleMessages = rawMessages
      .filter(
        (m) =>
          m.role === "user" ||
          (m.role === "assistant" && (m.content?.trim().length > 0 || m.pendingActionId))
      )
      .map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        pendingAction: m.pendingActionId
          ? {
              id: (m.pendingActionId as any)._id.toString(),
              actionType: (m.pendingActionId as any).actionType,
              summaryText: (m.pendingActionId as any).summaryText,
              arguments: (m.pendingActionId as any).arguments,
              status: (m.pendingActionId as any).status,
              expiresAt: (m.pendingActionId as any).expiresAt,
            }
          : null,
        createdAt: m.createdAt,
      }));

    return {
      conversation: {
        id: conversation._id.toString(),
        title: conversation.title,
        lastActivityAt: conversation.lastActivityAt,
        expiresAt: conversation.expiresAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: visibleMessages,
    };
  }

  /**
   * Explicitly clears/resets the user's active AI session on demand.
   */
  static async clearActiveSession(userId: string): Promise<boolean> {
    await connectToDatabase();
    const uId = new mongoose.Types.ObjectId(userId);

    const convs = await AIConversation.find({ userId: uId }).select("_id").lean();
    if (convs.length > 0) {
      const ids = convs.map((c) => c._id);
      await AIChatMessage.deleteMany({ conversationId: { $in: ids } });
      await AIPendingAction.deleteMany({ conversationId: { $in: ids } });
      await AIConversation.deleteMany({ _id: { $in: ids } });
    }

    return true;
  }

  /**
   * Sends a message to the AI assistant with 1-hour sliding ephemeral context memory.
   */
  static async sendMessage({
    userId,
    conversationId,
    message,
  }: SendMessageOptions): Promise<ChatResponsePayload> {
    await connectToDatabase();
    const uId = new mongoose.Types.ObjectId(userId);

    // 1. Clean up any expired sessions for this user
    await this.cleanupExpiredSessions(userId);

    const now = new Date();
    let slidingExpiresAt = computeSlidingExpiration(now);

    // 2. Identify or create the active, non-expired ephemeral conversation
    let conversation: any = null;

    if (conversationId && mongoose.isValidObjectId(conversationId)) {
      conversation = await AIConversation.findOne({
        _id: new mongoose.Types.ObjectId(conversationId),
        userId: uId,
        expiresAt: { $gt: now },
      });
    }

    if (!conversation) {
      // Find user's existing active unexpired session if any
      conversation = await AIConversation.findOne({
        userId: uId,
        expiresAt: { $gt: now },
      }).sort({ updatedAt: -1 });
    }

    if (!conversation) {
      // Create new ephemeral conversation
      conversation = await AIConversation.create({
        userId: uId,
        title: message.slice(0, 40) || "Financial Assistant",
        lastActivityAt: now,
        expiresAt: slidingExpiresAt,
      });
    }

    // 3. Guardrail Validation & Scope Restriction
    const guardrail = AIGuardrailService.validateAndClassify(message);
    if (!guardrail.allowed || guardrail.classification === "OUT_OF_SCOPE") {
      await AIChatMessage.create({
        userId: uId,
        conversationId: conversation._id,
        role: "user",
        content: message,
        expiresAt: slidingExpiresAt,
      });

      const canned =
        guardrail.cannedResponse ||
        "I am your personal finance assistant. I can only assist with personal expenses, money lent or owed, credit card debts, and budget management.";

      await AIChatMessage.create({
        userId: uId,
        conversationId: conversation._id,
        role: "assistant",
        content: canned,
        expiresAt: slidingExpiresAt,
      });

      // Update sliding inactivity expiration
      conversation.lastActivityAt = now;
      conversation.expiresAt = slidingExpiresAt;
      await AIConversation.updateOne(
        { _id: conversation._id },
        { $set: { lastActivityAt: now, expiresAt: slidingExpiresAt } }
      );

      return {
        conversationId: conversation._id.toString(),
        response: canned,
        expiresAt: slidingExpiresAt,
      };
    }

    // 4. Save User Message with current expiration
    await AIChatMessage.create({
      userId: uId,
      conversationId: conversation._id,
      role: "user",
      content: message,
      expiresAt: slidingExpiresAt,
    });

    // 5. Build Context & System Prompt
    const context = await AIContextService.buildUserContext(userId);
    const systemPrompt = buildSystemPrompt(context);

    // 6. Load and Sanitize Complete Conversation History
    const rawHistory = await AIChatMessage.find({
      userId: uId,
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    const sanitizedHistory = ConversationHistorySanitizer.sanitize(rawHistory as any, 10);

    const llmMessages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...sanitizedHistory,
    ];

    // 7. Execute with Provider
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

      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      const formattedToolCalls = response.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments:
            typeof tc.arguments === "string"
              ? tc.arguments
              : JSON.stringify(tc.arguments || {}),
        },
      }));

      // Persist Assistant Tool-Calls message with expiration
      await AIChatMessage.create({
        userId: uId,
        conversationId: conversation._id,
        role: "assistant",
        content: response.content || "",
        toolCalls: formattedToolCalls,
        tool_calls: formattedToolCalls,
        expiresAt: slidingExpiresAt,
      });

      llmMessages.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: formattedToolCalls,
      });

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

        // Persist tool response with matching tool_call_id, function name, and expiration
        await AIChatMessage.create({
          userId: uId,
          conversationId: conversation._id,
          role: "tool",
          name: tc.name,
          content: toolResultContent,
          toolCallId: tc.id,
          tool_call_id: tc.id,
          expiresAt: slidingExpiresAt,
        });

        llmMessages.push({
          role: "tool",
          name: tc.name,
          tool_call_id: tc.id,
          content: toolResultContent,
        });
      }
    }

    if (capturedPendingAction && (!finalContent || finalContent.trim().length === 0)) {
      finalContent = `I've prepared this action for you: **${capturedPendingAction.summaryText}**.\n\nPlease review and click **Confirm** below to save this transaction.`;
    }

    // 8. Save Assistant Final Response Message to MongoDB
    await AIChatMessage.create({
      userId: uId,
      conversationId: conversation._id,
      role: "assistant",
      content: finalContent || "I've reviewed your request. Let me know if you need any other financial insights.",
      pendingActionId: capturedPendingAction?.id
        ? new mongoose.Types.ObjectId(capturedPendingAction.id)
        : null,
      expiresAt: slidingExpiresAt,
    });

    // 9. Reset the 1-hour sliding inactivity window upon completion of response
    const completionNow = new Date();
    slidingExpiresAt = computeSlidingExpiration(completionNow);

    conversation.lastActivityAt = completionNow;
    conversation.expiresAt = slidingExpiresAt;
    conversation.updatedAt = completionNow;

    await AIConversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          lastActivityAt: completionNow,
          expiresAt: slidingExpiresAt,
          updatedAt: completionNow,
        },
      }
    );

    // Extend all messages in this conversation to match the new sliding expiry
    await AIChatMessage.updateMany(
      { conversationId: conversation._id },
      { $set: { expiresAt: slidingExpiresAt } }
    );

    return {
      conversationId: conversation._id.toString(),
      response: finalContent,
      expiresAt: slidingExpiresAt,
      pendingAction: capturedPendingAction || undefined,
    };
  }
}
