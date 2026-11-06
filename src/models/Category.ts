import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: "Tag" },
    color: { type: String, default: "#6366f1" },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ userId: 1, name: 1 });

export const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", icon: "Utensils", color: "#f97316" },
  { name: "Groceries", icon: "ShoppingCart", color: "#10b981" },
  { name: "Transportation", icon: "Car", color: "#06b6d4" },
  { name: "Shopping", icon: "ShoppingBag", color: "#ec4899" },
  { name: "Rent & Housing", icon: "Home", color: "#8b5cf6" },
  { name: "Bills & Utilities", icon: "Receipt", color: "#f59e0b" },
  { name: "Health & Medical", icon: "HeartPulse", color: "#ef4444" },
  { name: "Entertainment", icon: "Film", color: "#a855f7" },
  { name: "Travel", icon: "Plane", color: "#3b82f6" },
  { name: "Education", icon: "GraduationCap", color: "#14b8a6" },
  { name: "Subscriptions", icon: "Repeat", color: "#6366f1" },
  { name: "Other", icon: "MoreHorizontal", color: "#64748b" },
];

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

