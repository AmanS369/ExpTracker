import mongoose, { Document, Model, Schema } from "mongoose";

export type MessageRole = "user" | "assistant" | "tool" | "system";

export interface IAIChatMessage extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  role: MessageRole;
  content: string;
  toolCalls?: any[];
  toolCallId?: string;
  pendingActionId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const AIChatMessageSchema = new Schema<IAIChatMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "AIConversation", required: true, index: true },
    role: { type: String, enum: ["user", "assistant", "tool", "system"], required: true },
    content: { type: String, required: true, default: "" },
    toolCalls: { type: [Schema.Types.Mixed], default: undefined },
    toolCallId: { type: String, default: undefined },
    pendingActionId: { type: Schema.Types.ObjectId, ref: "AIPendingAction", default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AIChatMessageSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });

export const AIChatMessage: Model<IAIChatMessage> =
  mongoose.models.AIChatMessage ||
  mongoose.model<IAIChatMessage>("AIChatMessage", AIChatMessageSchema);

