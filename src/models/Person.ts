import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPerson extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PersonSchema = new Schema<IPerson>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
  }
);

PersonSchema.index({ userId: 1, createdAt: -1 });

export const Person: Model<IPerson> = mongoose.models.Person || mongoose.model<IPerson>("Person", PersonSchema);

