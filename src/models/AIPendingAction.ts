import mongoose, { Document, Model, Schema } from "mongoose";

export type PendingActionStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

export interface IAIPendingAction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  actionType: string;
  arguments: Record<string, any>;
  status: PendingActionStatus;
  summaryText?: string;
  expiresAt: Date;
  createdAt: Date;
}

const AIPendingActionSchema = new Schema<IAIPendingAction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "AIConversation", required: true, index: true },
    actionType: { type: String, required: true },
    arguments: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"],
      default: "PENDING",
      required: true,
      index: true,
    },
    summaryText: { type: String, default: "" },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AIPendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AIPendingActionSchema.index({ userId: 1, conversationId: 1, status: 1 });

export const AIPendingAction: Model<IAIPendingAction> =
  mongoose.models.AIPendingAction ||
  mongoose.model<IAIPendingAction>("AIPendingAction", AIPendingActionSchema);

