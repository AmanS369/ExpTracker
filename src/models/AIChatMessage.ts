import mongoose, { Document, Model, Schema } from "mongoose";

export type MessageRole = "user" | "assistant" | "tool" | "system";

export interface StoredToolCallFunction {
  name: string;
  arguments: string;
}

export interface StoredToolCall {
  id: string;
  type: "function";
  function: StoredToolCallFunction;
}

export interface IAIChatMessage extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  role: MessageRole;
  content: string;
  name?: string;
  toolCalls?: StoredToolCall[];
  tool_calls?: StoredToolCall[];
  toolCallId?: string;
  tool_call_id?: string;
  pendingActionId?: mongoose.Types.ObjectId | null;
  expiresAt?: Date;
  createdAt: Date;
}

const AIChatMessageSchema = new Schema<IAIChatMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "AIConversation", required: true, index: true },
    role: { type: String, enum: ["user", "assistant", "tool", "system"], required: true },
    content: { type: String, default: "" },
    name: { type: String, default: undefined },
    toolCalls: { type: [Schema.Types.Mixed], default: undefined },
    tool_calls: { type: [Schema.Types.Mixed], default: undefined },
    toolCallId: { type: String, default: undefined },
    tool_call_id: { type: String, default: undefined },
    pendingActionId: { type: Schema.Types.ObjectId, ref: "AIPendingAction", default: null },
    expiresAt: { type: Date, default: undefined },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    minimize: false, // Ensure nested objects and empty fields are never stripped by Mongoose
  }
);

// TTL Index for automatic background deletion
AIChatMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AIChatMessageSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });

export const AIChatMessage: Model<IAIChatMessage> =
  mongoose.models.AIChatMessage ||
  mongoose.model<IAIChatMessage>("AIChatMessage", AIChatMessageSchema);
