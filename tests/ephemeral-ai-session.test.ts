import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/ephemeral_test_db";

import mongoose from "mongoose";
import { AIConversation, AIChatMessage, AIPendingAction } from "../src/models";
import { AIChatService } from "../src/modules/ai/services/ai-chat.service";
import { AIContextService } from "../src/modules/ai/services/ai-context.service";
import { ToolExecutionService } from "../src/modules/ai/services/tool-execution.service";
import { LLMProviderFactory } from "../src/modules/ai/strategies/llm-provider.factory";
import { LLMProvider } from "../src/modules/ai/providers/interfaces/llm-provider.interface";
import { LLMRequest, LLMResponse } from "../src/modules/ai/types/ai.types";
import {
  getAIConversationTTLSeconds,
  computeSlidingExpiration,
  DEFAULT_AI_CONVERSATION_TTL_SECONDS,
} from "../src/modules/ai/config/ai.config";

// In-memory store simulating MongoDB collections for fast sandboxed tests
const convStore: any[] = [];
const msgStore: any[] = [];
const actionStore: any[] = [];

class MockEphemeralProvider implements LLMProvider {
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const lastMsg = request.messages[request.messages.length - 1];

    if (lastMsg.role === "tool") {
      return {
        content: "Here is your requested financial insight based on verified tools.",
      };
    }

    if (lastMsg.role === "user" && lastMsg.content.includes("borrow")) {
      return {
        content: "I will prepare a lending record for Rahul.",
        toolCalls: [
          {
            id: "call_lent_1",
            name: "create_lending",
            arguments: { personName: "Rahul", amount: 1500 },
          },
        ],
      };
    }

    return {
      content: `Echo response to: "${lastMsg.content}". Your financial state is secure.`,
    };
  }
}

describe("Ephemeral 1-Hour AI Conversation Session & Sliding Timeout", () => {
  const userA = "64a000000000000000000001";
  const userB = "64a000000000000000000002";

  before(() => {
    // 1. Mock Mongoose connection
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
    AIContextService.buildUserContext = async (uid: string) => ({
      userId: uid,
      userName: uid === userA ? "User Alice" : "User Bob",
      preferredCurrency: "INR",
      timezone: "Asia/Kolkata",
      currentDateIST: "07 November 2026",
      currentMonth: {
        monthNumber: 11,
        year: 2026,
        totalExpensesPaise: 500000,
        remainingBudgetPaise: 500000,
        totalReceivablePaise: 200000,
        creditCardOutstandingPaise: 100000,
        netPositionPaise: 100000,
      },
      cardsCount: 1,
      peopleCount: 2,
    });

    // 3. Mock AIConversation collection
    (AIConversation as any).create = async (doc: any) => {
      const record = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(doc.userId),
        title: doc.title,
        lastActivityAt: doc.lastActivityAt || new Date(),
        expiresAt: doc.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () {
          return this;
        },
      };
      convStore.push(record);
      return record;
    };

    (AIConversation as any).findOne = (query: any) => {
      const getFound = () => {
        return (
          convStore.find((c) => {
            if (query._id && c._id.toString() !== query._id.toString()) return false;
            if (query.userId && c.userId.toString() !== query.userId.toString()) return false;
            if (query.expiresAt?.$gt && !(new Date(c.expiresAt).getTime() > new Date(query.expiresAt.$gt).getTime()))
              return false;
            if (query.expiresAt?.$lte && !(new Date(c.expiresAt).getTime() <= new Date(query.expiresAt.$lte).getTime()))
              return false;
            return true;
          }) || null
        );
      };

      const chain: any = {
        sort: () => chain,
        lean: async () => getFound(),
        then: (onResolve: any, onReject: any) => Promise.resolve(getFound()).then(onResolve, onReject),
      };
      return chain;
    };

    (AIConversation as any).find = (query: any) => {
      const filtered = convStore.filter((c) => {
        if (query.userId && c.userId.toString() !== query.userId.toString()) return false;
        if (query.expiresAt?.$lte && !(c.expiresAt <= query.expiresAt.$lte)) return false;
        return true;
      });

      return {
        select: () => ({
          lean: async () => filtered.map((c) => ({ _id: c._id })),
        }),
      };
    };

    (AIConversation as any).deleteMany = async (query: any) => {
      let count = 0;
      if (query._id?.$in) {
        const idStrings = query._id.$in.map((id: any) => id.toString());
        for (let i = convStore.length - 1; i >= 0; i--) {
          if (idStrings.includes(convStore[i]._id.toString())) {
            convStore.splice(i, 1);
            count++;
          }
        }
      } else if (query.userId) {
        for (let i = convStore.length - 1; i >= 0; i--) {
          if (convStore[i].userId.toString() === query.userId.toString()) {
            convStore.splice(i, 1);
            count++;
          }
        }
      }
      return { deletedCount: count };
    };

    (AIConversation as any).updateOne = async (filter: any, update: any) => {
      const target = convStore.find((c) => {
        if (filter._id && c._id.toString() !== filter._id.toString()) return false;
        if (filter.userId && c.userId.toString() !== filter.userId.toString()) return false;
        return true;
      });
      if (target && update.$set) {
        Object.assign(target, update.$set);
      }
      return { acknowledged: true, modifiedCount: target ? 1 : 0 };
    };

    // 4. Mock AIChatMessage collection
    (AIChatMessage as any).create = async (doc: any) => {
      const record = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(doc.userId),
        conversationId: new mongoose.Types.ObjectId(doc.conversationId),
        role: doc.role,
        content: doc.content ?? "",
        name: doc.name,
        toolCalls: doc.toolCalls || doc.tool_calls,
        tool_calls: doc.toolCalls || doc.tool_calls,
        toolCallId: doc.toolCallId || doc.tool_call_id,
        tool_call_id: doc.toolCallId || doc.tool_call_id,
        pendingActionId: doc.pendingActionId,
        expiresAt: doc.expiresAt,
        createdAt: new Date(),
      };
      msgStore.push(record);
      return record;
    };

    (AIChatMessage as any).find = (query: any) => {
      const filtered = msgStore.filter((m) => {
        if (query.userId && m.userId.toString() !== query.userId.toString()) return false;
        if (query.conversationId && m.conversationId.toString() !== query.conversationId.toString()) return false;
        if (query.role?.$in && !query.role.$in.includes(m.role)) return false;
        return true;
      });

      return {
        sort: () => ({
          lean: async () => [...filtered],
          populate: () => ({
            lean: async () => [...filtered],
          }),
        }),
      };
    };

    (AIChatMessage as any).deleteMany = async (query: any) => {
      let count = 0;
      if (query.conversationId?.$in) {
        const idStrings = query.conversationId.$in.map((id: any) => id.toString());
        for (let i = msgStore.length - 1; i >= 0; i--) {
          if (idStrings.includes(msgStore[i].conversationId.toString())) {
            msgStore.splice(i, 1);
            count++;
          }
        }
      }
      return { deletedCount: count };
    };

    (AIChatMessage as any).updateMany = async (filter: any, update: any) => {
      for (const m of msgStore) {
        if (m.conversationId.toString() === filter.conversationId.toString()) {
          if (update.$set) Object.assign(m, update.$set);
        }
      }
    };

    // 5. Mock AIPendingAction collection
    (AIPendingAction as any).deleteMany = async (query: any) => {
      let count = 0;
      if (query.conversationId?.$in) {
        const idStrings = query.conversationId.$in.map((id: any) => id.toString());
        for (let i = actionStore.length - 1; i >= 0; i--) {
          if (idStrings.includes(actionStore[i].conversationId.toString())) {
            actionStore.splice(i, 1);
            count++;
          }
        }
      }
      return { deletedCount: count };
    };

    // 6. Mock provider
    (LLMProviderFactory as any).createProvider = () => new MockEphemeralProvider();
  });

  it("configures TTL default to 3600 seconds and respects custom AI_CONVERSATION_TTL_SECONDS", () => {
    delete process.env.AI_CONVERSATION_TTL_SECONDS;
    assert.equal(getAIConversationTTLSeconds(), DEFAULT_AI_CONVERSATION_TTL_SECONDS);

    process.env.AI_CONVERSATION_TTL_SECONDS = "1800";
    assert.equal(getAIConversationTTLSeconds(), 1800);

    const base = new Date("2026-11-07T10:00:00Z");
    const expiry = computeSlidingExpiration(base);
    assert.equal(expiry.getTime(), base.getTime() + 1800 * 1000);

    // Reset to 3600
    process.env.AI_CONVERSATION_TTL_SECONDS = "3600";
  });

  it("creates an active ephemeral session with sliding expiry on first interaction", async () => {
    convStore.length = 0;
    msgStore.length = 0;

    const res = await AIChatService.sendMessage({
      userId: userA,
      message: "Hello assistant",
    });

    assert.ok(res.conversationId);
    assert.ok(res.expiresAt);
    assert.ok(res.response.includes("Hello assistant"));

    // Check that conversation exists with expiresAt
    const session = await AIChatService.getActiveSession(userA);
    assert.ok(session.conversation);
    assert.equal(session.conversation?.id, res.conversationId);
    assert.equal(session.messages.length, 2); // 1 user + 1 assistant
  });

  it("resets the sliding expiration window on subsequent messages within the window", async () => {
    // Session exists
    const sessionBefore = await AIChatService.getActiveSession(userA);
    assert.ok(sessionBefore.conversation);
    const firstExpiry = new Date(sessionBefore.conversation!.expiresAt).getTime();

    // Fast-forward 10 minutes (simulate passage of time)
    const futureNow = new Date(Date.now() + 10 * 60 * 1000);

    const res2 = await AIChatService.sendMessage({
      userId: userA,
      conversationId: sessionBefore.conversation!.id,
      message: "What is my net balance?",
    });

    const secondExpiry = new Date(res2.expiresAt).getTime();
    // Sliding expiry must be pushed forward
    assert.ok(secondExpiry >= firstExpiry);

    // History contains both turns
    const sessionAfter = await AIChatService.getActiveSession(userA);
    assert.equal(sessionAfter.messages.length, 4); // 2 user + 2 assistant
  });

  it("expires the session and purges messages when inactivity exceeds TTL", async () => {
    const session = await AIChatService.getActiveSession(userA);
    assert.ok(session.conversation);

    // Force expire conversation by setting expiresAt to the past (simulate 1 hr inactivity)
    const pastTime = new Date(Date.now() - 5000);
    const targetConv = convStore.find((c) => c._id.toString() === session.conversation!.id);
    assert.ok(targetConv);
    targetConv.expiresAt = pastTime;

    // Call getActiveSession -> Should detect expiration and delete it
    const activeAfterTimeout = await AIChatService.getActiveSession(userA);
    assert.equal(activeAfterTimeout.conversation, null);
    assert.equal(activeAfterTimeout.messages.length, 0);

    // Verify messages in DB were purged
    const remainingMsgs = msgStore.filter(
      (m) => m.conversationId.toString() === targetConv._id.toString()
    );
    assert.equal(remainingMsgs.length, 0);
  });

  it("creates a fresh conversation when user sends message after expiration", async () => {
    // User sends a new message after previous session expired
    const resNew = await AIChatService.sendMessage({
      userId: userA,
      message: "Are my bills paid?",
    });

    assert.ok(resNew.conversationId);
    const newSession = await AIChatService.getActiveSession(userA);
    assert.ok(newSession.conversation);
    // Old expired conversation was NOT reused
    assert.equal(newSession.conversation!.id, resNew.conversationId);
    // Only contains messages from the new fresh session
    assert.equal(newSession.messages.length, 2);
  });

  it("maintains strict isolation between User A and User B ephemeral sessions", async () => {
    // Create session for User B
    const resB = await AIChatService.sendMessage({
      userId: userB,
      message: "User B private inquiry",
    });

    const sessionA = await AIChatService.getActiveSession(userA);
    const sessionB = await AIChatService.getActiveSession(userB);

    assert.notEqual(sessionA.conversation?.id, sessionB.conversation?.id);
    assert.equal(sessionB.messages[0].content, "User B private inquiry");

    // User A cannot retrieve User B's session
    assert.ok(!sessionA.messages.some((m) => m.content.includes("User B private inquiry")));
  });

  it("resets sliding expiration upon confirmed financial write action", async () => {
    // Create an action
    const conv = convStore.find((c) => c.userId.toString() === userA);
    assert.ok(conv);
    const initialExpiry = new Date(conv.expiresAt).getTime();

    const pendingAction = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(userA),
      conversationId: conv._id,
      actionType: "CREATE_EXPENSE",
      arguments: { title: "Coffee", amount: 150 },
      status: "PENDING",
      summaryText: "Add ₹150 for Coffee",
      expiresAt: new Date(Date.now() + 60000),
      save: async function () {
        return this;
      },
    };
    (AIPendingAction as any).findOne = async () => pendingAction;

    // Confirm action
    const mockExpense = require("../src/services/expense.service");
    mockExpense.ExpenseService.createExpense = async () => ({ _id: "exp_1" });

    await ToolExecutionService.confirmPendingAction(userA, pendingAction._id.toString());

    assert.equal(pendingAction.status, "CONFIRMED");
    // Verify sliding expiry on conversation was updated
    const updatedConv = convStore.find((c) => c._id.toString() === conv._id.toString());
    assert.ok(updatedConv);
    assert.ok(new Date(updatedConv.expiresAt).getTime() >= initialExpiry);
  });
});
