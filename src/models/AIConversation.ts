import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAIConversation extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const AIConversationSchema = new Schema<IAIConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, default: "New Conversation" },
  },
  {
    timestamps: true,
  }
);

AIConversationSchema.index({ userId: 1, updatedAt: -1 });

export const AIConversation: Model<IAIConversation> =
  mongoose.models.AIConversation ||
  mongoose.model<IAIConversation>("AIConversation", AIConversationSchema);

