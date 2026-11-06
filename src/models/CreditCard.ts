import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICreditCard extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cardName: string;
  bankName: string;
  creditLimitPaise: number;
  statementDay: number;
  dueDay: number;
  openingOutstandingPaise: number;
  lastFourDigits?: string;
  notes?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreditCardSchema = new Schema<ICreditCard>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cardName: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    creditLimitPaise: { type: Number, required: true, min: 0 },
    statementDay: { type: Number, required: true, min: 1, max: 31 },
    dueDay: { type: Number, required: true, min: 1, max: 31 },
    openingOutstandingPaise: { type: Number, default: 0, min: 0 },
    lastFourDigits: { type: String, maxlength: 4, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    color: { type: String, default: "#1e293b" },
  },
  {
    timestamps: true,
  }
);

CreditCardSchema.index({ userId: 1, cardName: 1 });

export const CreditCard: Model<ICreditCard> =
  mongoose.models.CreditCard || mongoose.model<ICreditCard>("CreditCard", CreditCardSchema);

