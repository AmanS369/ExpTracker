import mongoose, { Document, Model, Schema } from "mongoose";

export type CCTransactionType = "PURCHASE" | "PAYMENT" | "REFUND" | "ADJUSTMENT";
export type CCPaymentSource = "CASH" | "BANK_ACCOUNT" | "UPI" | "OTHER";

export interface ICreditCardTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  creditCardId: mongoose.Types.ObjectId;
  type: CCTransactionType;
  amountPaise: number;
  expenseId?: mongoose.Types.ObjectId | null;
  paymentSource?: CCPaymentSource | string;
  transactionDate: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreditCardTransactionSchema = new Schema<ICreditCardTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    creditCardId: { type: Schema.Types.ObjectId, ref: "CreditCard", required: true, index: true },
    type: {
      type: String,
      enum: ["PURCHASE", "PAYMENT", "REFUND", "ADJUSTMENT"],
      required: true,
    },
    amountPaise: { type: Number, required: true, min: 1 },
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense", default: null, index: true },
    paymentSource: { type: String, default: "BANK_ACCOUNT" },
    transactionDate: { type: Date, required: true, default: Date.now, index: true },
    description: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
  }
);

CreditCardTransactionSchema.index({ userId: 1, creditCardId: 1, transactionDate: -1 });
CreditCardTransactionSchema.index({ userId: 1, transactionDate: -1 });

export const CreditCardTransaction: Model<ICreditCardTransaction> =
  mongoose.models.CreditCardTransaction ||
  mongoose.model<ICreditCardTransaction>("CreditCardTransaction", CreditCardTransactionSchema);

