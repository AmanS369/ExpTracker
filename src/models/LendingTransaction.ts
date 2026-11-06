import mongoose, { Document, Model, Schema } from "mongoose";

export type LendingType = "LENT" | "REPAYMENT";
export type LendingPaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";

export interface ILendingTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  personId: mongoose.Types.ObjectId;
  type: LendingType;
  amountPaise: number;
  paymentMethod: LendingPaymentMethod;
  description?: string;
  notes?: string;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LendingTransactionSchema = new Schema<ILendingTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true, index: true },
    type: { type: String, enum: ["LENT", "REPAYMENT"], required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "OTHER"],
      default: "UPI",
    },
    description: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    transactionDate: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
  }
);

LendingTransactionSchema.index({ userId: 1, personId: 1, transactionDate: -1 });
LendingTransactionSchema.index({ userId: 1, transactionDate: -1 });

export const LendingTransaction: Model<ILendingTransaction> =
  mongoose.models.LendingTransaction ||
  mongoose.model<ILendingTransaction>("LendingTransaction", LendingTransactionSchema);

