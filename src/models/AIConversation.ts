import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAIConversation extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIConversationSchema = new Schema<IAIConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, default: "Financial Assistant" },
    lastActivityAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// TTL Index: automatically removes expired conversations asynchronously in MongoDB
AIConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Fast lookup of user's active session
AIConversationSchema.index({ userId: 1, expiresAt: -1 });

export const AIConversation: Model<IAIConversation> =
  mongoose.models.AIConversation ||
  mongoose.model<IAIConversation>("AIConversation", AIConversationSchema);
