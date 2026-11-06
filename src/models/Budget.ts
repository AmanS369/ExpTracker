import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBudget extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  amountPaise: number;
  month: number; // 1 - 12
  year: number; // e.g. 2026
  categoryId?: mongoose.Types.ObjectId | null; // null represents overall monthly budget
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    amountPaise: { type: Number, required: true, min: 1 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
  },
  {
    timestamps: true,
  }
);

BudgetSchema.index({ userId: 1, month: 1, year: 1 });
BudgetSchema.index({ userId: 1, month: 1, year: 1, categoryId: 1 }, { unique: true });

export const Budget: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>("Budget", BudgetSchema);

