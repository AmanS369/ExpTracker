import mongoose, { Document, Model, Schema } from "mongoose";

export type ExpensePaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "DEBIT_CARD" | "CREDIT_CARD";

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  amountPaise: number;
  categoryId: mongoose.Types.ObjectId;
  paymentMethod: ExpensePaymentMethod;
  creditCardId?: mongoose.Types.ObjectId | null;
  transactionDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    amountPaise: { type: Number, required: true, min: 1 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "DEBIT_CARD", "CREDIT_CARD"],
      required: true,
    },
    creditCardId: { type: Schema.Types.ObjectId, ref: "CreditCard", default: null, index: true },
    transactionDate: { type: Date, required: true, default: Date.now, index: true },
    notes: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
  }
);

ExpenseSchema.index({ userId: 1, transactionDate: -1 });
ExpenseSchema.index({ userId: 1, categoryId: 1 });
ExpenseSchema.index({ userId: 1, creditCardId: 1 });

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);

