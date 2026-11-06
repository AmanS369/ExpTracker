import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Category, CreditCard, CreditCardTransaction, DEFAULT_CATEGORIES, Expense, IExpense } from "@/models";
import { rupeesToPaise } from "@/lib/utils/currency";
import { isValidObjectId } from "@/lib/security/sanitize";

export interface ExpenseFilterParams {
  search?: string;
  categoryId?: string;
  paymentMethod?: string;
  creditCardId?: string;
  startDate?: string;
  endDate?: string;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
}

export class ExpenseService {
  static async ensureDefaultCategories(userId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId)) return;

    const uId = new mongoose.Types.ObjectId(userId);
    const count = await Category.countDocuments({
      $or: [{ userId: uId }, { isDefault: true }],
    });

    if (count === 0) {
      const docs = DEFAULT_CATEGORIES.map((cat) => ({
        userId: uId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      }));
      await Category.insertMany(docs);
    }
  }

  static async getCategories(userId: string) {
    await connectToDatabase();
    await this.ensureDefaultCategories(userId);

    const uId = new mongoose.Types.ObjectId(userId);
    const categories = await Category.find({
      $or: [{ userId: uId }, { isDefault: true }],
    })
      .sort({ name: 1 })
      .lean();

    return categories.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: c.isDefault,
    }));
  }

  static async createCategory(userId: string, data: { name: string; icon?: string; color?: string }) {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const uId = new mongoose.Types.ObjectId(userId);
    const existing = await Category.findOne({
      userId: uId,
      name: { $regex: new RegExp(`^${data.name.trim()}$`, "i") },
    });

    if (existing) {
      throw new Error("Category with this name already exists");
    }

    const cat = await Category.create({
      userId: uId,
      name: data.name.trim(),
      icon: data.icon || "Tag",
      color: data.color || "#6366f1",
      isDefault: false,
    });

    return {
      _id: cat._id.toString(),
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isDefault: false,
    };
  }

  static async getExpenses(userId: string, params: ExpenseFilterParams) {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const uId = new mongoose.Types.ObjectId(userId);
    const query: Record<string, any> = { userId: uId };

    if (params.search && params.search.trim()) {
      query.title = { $regex: params.search.trim(), $options: "i" };
    }

    if (params.categoryId && isValidObjectId(params.categoryId)) {
      query.categoryId = new mongoose.Types.ObjectId(params.categoryId);
    }

    if (params.paymentMethod) {
      query.paymentMethod = params.paymentMethod;
    }

    if (params.creditCardId && isValidObjectId(params.creditCardId)) {
      query.creditCardId = new mongoose.Types.ObjectId(params.creditCardId);
    }

    if (params.startDate || params.endDate) {
      query.transactionDate = {};
      if (params.startDate) query.transactionDate.$gte = new Date(params.startDate);
      if (params.endDate) query.transactionDate.$lte = new Date(params.endDate);
    }

    const sortOrder = params.sort === "oldest" ? 1 : -1;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const [expenses, totalCount] = await Promise.all([
      Expense.find(query)
        .populate("categoryId", "name icon color")
        .populate("creditCardId", "cardName bankName lastFourDigits color")
        .sort({ transactionDate: sortOrder, createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(query),
    ]);

    return {
      expenses: expenses.map((e) => ({
        _id: e._id.toString(),
        title: e.title,
        amountPaise: e.amountPaise,
        paymentMethod: e.paymentMethod,
        transactionDate: e.transactionDate,
        notes: e.notes,
        category: e.categoryId
          ? {
              _id: (e.categoryId as any)._id.toString(),
              name: (e.categoryId as any).name,
              icon: (e.categoryId as any).icon,
              color: (e.categoryId as any).color,
            }
          : null,
        creditCard: e.creditCardId
          ? {
              _id: (e.creditCardId as any)._id.toString(),
              cardName: (e.creditCardId as any).cardName,
              bankName: (e.creditCardId as any).bankName,
              lastFourDigits: (e.creditCardId as any).lastFourDigits,
              color: (e.creditCardId as any).color,
            }
          : null,
      })),
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  static async createExpense(
    userId: string,
    data: {
      title: string;
      amount: number;
      categoryId: string;
      paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "DEBIT_CARD" | "CREDIT_CARD";
      creditCardId?: string | null;
      transactionDate: string;
      notes?: string;
    }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(data.categoryId)) {
      throw new Error("Invalid ID format");
    }

    const uId = new mongoose.Types.ObjectId(userId);
    const catId = new mongoose.Types.ObjectId(data.categoryId);
    const amountPaise = rupeesToPaise(data.amount);

    let ccId: mongoose.Types.ObjectId | null = null;
    if (data.paymentMethod === "CREDIT_CARD") {
      if (!data.creditCardId || !isValidObjectId(data.creditCardId)) {
        throw new Error("Credit Card selection is required for credit card expenses");
      }
      ccId = new mongoose.Types.ObjectId(data.creditCardId);
      const cardExists = await CreditCard.findOne({ _id: ccId, userId: uId });
      if (!cardExists) throw new Error("Selected credit card not found");
    }

    // Create expense
    const expense = await Expense.create({
      userId: uId,
      title: data.title.trim(),
      amountPaise,
      categoryId: catId,
      paymentMethod: data.paymentMethod,
      creditCardId: ccId,
      transactionDate: new Date(data.transactionDate),
      notes: data.notes?.trim() || "",
    });

    // If Credit Card, create corresponding CreditCardTransaction
    if (data.paymentMethod === "CREDIT_CARD" && ccId) {
      await CreditCardTransaction.create({
        userId: uId,
        creditCardId: ccId,
        type: "PURCHASE",
        amountPaise,
        expenseId: expense._id,
        transactionDate: new Date(data.transactionDate),
        description: data.title.trim(),
      });
    }

    return { _id: expense._id.toString(), title: expense.title };
  }

  static async updateExpense(
    userId: string,
    expenseId: string,
    data: {
      title: string;
      amount: number;
      categoryId: string;
      paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "DEBIT_CARD" | "CREDIT_CARD";
      creditCardId?: string | null;
      transactionDate: string;
      notes?: string;
    }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(expenseId) || !isValidObjectId(data.categoryId)) {
      throw new Error("Invalid ID format");
    }

    const uId = new mongoose.Types.ObjectId(userId);
    const expId = new mongoose.Types.ObjectId(expenseId);
    const catId = new mongoose.Types.ObjectId(data.categoryId);
    const amountPaise = rupeesToPaise(data.amount);

    let ccId: mongoose.Types.ObjectId | null = null;
    if (data.paymentMethod === "CREDIT_CARD") {
      if (!data.creditCardId || !isValidObjectId(data.creditCardId)) {
        throw new Error("Credit Card selection is required for credit card expenses");
      }
      ccId = new mongoose.Types.ObjectId(data.creditCardId);
    }

    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: expId, userId: uId },
      {
        $set: {
          title: data.title.trim(),
          amountPaise,
          categoryId: catId,
          paymentMethod: data.paymentMethod,
          creditCardId: ccId,
          transactionDate: new Date(data.transactionDate),
          notes: data.notes?.trim() || "",
        },
      },
      { new: true }
    );

    if (!updatedExpense) throw new Error("Expense not found");

    // Keep credit card transaction ledger in sync
    if (data.paymentMethod === "CREDIT_CARD" && ccId) {
      await CreditCardTransaction.findOneAndUpdate(
        { expenseId: expId, userId: uId },
        {
          $set: {
            creditCardId: ccId,
            type: "PURCHASE",
            amountPaise,
            transactionDate: new Date(data.transactionDate),
            description: data.title.trim(),
          },
        },
        { upsert: true }
      );
    } else {
      // If was previously a credit card purchase and now changed to Cash/UPI, remove CC transaction
      await CreditCardTransaction.deleteOne({ expenseId: expId, userId: uId });
    }

    return { _id: updatedExpense._id.toString(), title: updatedExpense.title };
  }

  static async deleteExpense(userId: string, expenseId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(expenseId)) throw new Error("Invalid ID format");

    const uId = new mongoose.Types.ObjectId(userId);
    const expId = new mongoose.Types.ObjectId(expenseId);

    const res = await Expense.deleteOne({ _id: expId, userId: uId });
    if (res.deletedCount === 0) throw new Error("Expense not found");

    // Clean up any linked CreditCardTransaction
    await CreditCardTransaction.deleteOne({ expenseId: expId, userId: uId });

    return { success: true };
  }
}

