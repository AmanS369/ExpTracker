import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/mock_db";

import mongoose from "mongoose";
import { AIChatMessage, AIConversation } from "../src/models";
import { AIChatService } from "../src/modules/ai/services/ai-chat.service";
import { AIContextService } from "../src/modules/ai/services/ai-context.service";
import { LLMProviderFactory } from "../src/modules/ai/strategies/llm-provider.factory";
import { LLMProvider } from "../src/modules/ai/providers/interfaces/llm-provider.interface";
import { LLMRequest, LLMResponse } from "../src/modules/ai/types/ai.types";

// In-memory message store simulating MongoDB persistence
const inMemoryMessages: any[] = [];
let conversationStore: any = null;

// Mock Provider that simulates a real multi-step tool calling model
class MockMultiTurnToolProvider implements LLMProvider {
  public toolExecutionCalls: any[] = [];

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const lastMsg = request.messages[request.messages.length - 1];

    if (lastMsg.role === "tool") {
      // Step 2: Model receives tool result and produces final answer
      return {
        content: "Based on your financial ledger, you spent ₹3,500 on Food & Dining this month.",
      };
    }

    // Step 1: Model requests a tool call
    if (lastMsg.role === "user" && lastMsg.content.includes("spend")) {
      return {
        content: "",
        toolCalls: [
          {
            id: "call_exp_mock_123",
            name: "get_expenses_by_category",
            arguments: { categoryName: "Food & Dining" },
          },
        ],
      };
    }

    // Default conversational reply
    return {
      content: "I have recorded your request and verified your account balances.",
    };
  }
}

describe("End-to-End Tool Calling Lifecycle & Multi-Turn Reload Integration Test", () => {
  const userId = "64a000000000000000000001";
  const conversationId = new mongoose.Types.ObjectId().toString();

  before(() => {
    // 1. Mock Mongoose connect & readyState getter
    Object.defineProperty(mongoose.Connection.prototype, "readyState", {
      get: () => 1,
      configurable: true,
    });
    if (!(global as any).mongooseCache) {
      (global as any).mongooseCache = {};
    }
    (global as any).mongooseCache.conn = mongoose;
    (global as any).mongooseCache.promise = Promise.resolve(mongoose);

    // 2. Mock AIContextService
    AIContextService.buildUserContext = async () => ({
      userId,
      userName: "Aman Gupta",
      preferredCurrency: "INR",
      timezone: "Asia/Kolkata",
      currentDateIST: "07 November 2026",
      currentMonth: {
        monthNumber: 11,
        year: 2026,
        totalExpensesPaise: 350000,
        remainingBudgetPaise: 650000,
        totalReceivablePaise: 1500000,
        creditCardOutstandingPaise: 2400000,
        netPositionPaise: -900000,
      },
      cardsCount: 2,
      peopleCount: 5,
    });

    // 3. Mock AIConversation
    conversationStore = {
      _id: new mongoose.Types.ObjectId(conversationId),
      userId: new mongoose.Types.ObjectId(userId),
      title: "Finance Chat",
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      save: async () => conversationStore,
    };
    const mockQuery = {
      sort: () => mockQuery,
      lean: async () => conversationStore,
      select: () => mockQuery,
      then: (fn: any) => fn(conversationStore),
    };
    (AIConversation as any).findOne = () => mockQuery;
    (AIConversation as any).create = () => Promise.resolve(conversationStore);
    (AIConversation as any).find = () => ({
      select: () => ({
        lean: async () => [],
      }),
    });
    (AIConversation as any).updateOne = async () => ({ acknowledged: true });
    (AIConversation as any).deleteMany = async () => ({ deletedCount: 0 });

    // 4. Mock AIChatMessage persistence with accurate Mongoose schema behaviors
    (AIChatMessage as any).create = async (doc: any) => {
      const stored = {
        _id: new mongoose.Types.ObjectId(),
        userId: doc.userId,
        conversationId: doc.conversationId,
        role: doc.role,
        content: doc.content ?? "",
        name: doc.name,
        toolCalls: doc.toolCalls || doc.tool_calls,
        tool_calls: doc.toolCalls || doc.tool_calls,
        toolCallId: doc.toolCallId || doc.tool_call_id,
        tool_call_id: doc.toolCallId || doc.tool_call_id,
        createdAt: new Date(),
      };
      inMemoryMessages.push(stored);
      return stored;
    };

    (AIChatMessage as any).find = () => ({
      sort: () => ({
        lean: async () => [...inMemoryMessages],
      }),
    });
    (AIChatMessage as any).updateMany = async () => ({ acknowledged: true });
    (AIChatMessage as any).deleteMany = async () => ({ deletedCount: 0 });

    // 5. Inject our mock provider into the factory
    (LLMProviderFactory as any).createProvider = () => new MockMultiTurnToolProvider();

    // 6. Mock ToolExecutionService
    const { ToolExecutionService } = require("../src/modules/ai/services/tool-execution.service");
    ToolExecutionService.executeTool = async (_u: string, _c: string, name: string, args: any) => ({
      success: true,
      data: { category: args.categoryName || "Food & Dining", totalPaise: 350000 },
    });
  });

  it("completes full lifecycle: user message -> assistant tool_calls -> tool result -> assistant final response", async () => {
    // 1. Send first user message requiring tool call
    const result1 = await AIChatService.sendMessage({
      userId,
      conversationId,
      message: "How much did I spend on food this month?",
    });

    assert.ok(result1.conversationId);
    assert.ok(result1.response.includes("Food & Dining"));

    // 2. Inspect persisted messages in the conversation
    // Expect exactly 4 records in order:
    // 1. user
    // 2. assistant (tool_calls)
    // 3. tool (result with matching tool_call_id & name)
    // 4. assistant (final response)
    assert.equal(inMemoryMessages.length, 4);

    // Message 1: user
    assert.equal(inMemoryMessages[0].role, "user");
    assert.equal(inMemoryMessages[0].content, "How much did I spend on food this month?");

    // Message 2: assistant with tool calls
    assert.equal(inMemoryMessages[1].role, "assistant");
    assert.ok(inMemoryMessages[1].tool_calls);
    const tcList = inMemoryMessages[1].tool_calls as any[];
    assert.equal(tcList.length, 1);
    assert.equal(tcList[0].id, "call_exp_mock_123");
    assert.equal(tcList[0].function.name, "get_expenses_by_category");

    // Message 3: tool result
    assert.equal(inMemoryMessages[2].role, "tool");
    assert.equal(inMemoryMessages[2].tool_call_id, "call_exp_mock_123");
    assert.equal(inMemoryMessages[2].name, "get_expenses_by_category");
    assert.ok(inMemoryMessages[2].content);

    // Message 4: assistant final text
    assert.equal(inMemoryMessages[3].role, "assistant");
    assert.ok(inMemoryMessages[3].content.includes("₹3,500"));

    // 3. Send Turn 2 in the same conversation (Conversation Reload)
    const result2 = await AIChatService.sendMessage({
      userId,
      conversationId,
      message: "Thank you for the update!",
    });

    assert.equal(result2.conversationId, conversationId);
    assert.ok(result2.response);

    // 4. Verify that inMemoryMessages contains Turn 1 + Turn 2 in proper sequence
    // 4 messages from turn 1 + 2 messages from turn 2 = 6 messages
    assert.equal(inMemoryMessages.length, 6);
    assert.equal(inMemoryMessages[4].role, "user");
    assert.equal(inMemoryMessages[4].content, "Thank you for the update!");
    assert.equal(inMemoryMessages[5].role, "assistant");
  });
});
