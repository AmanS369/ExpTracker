import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Budget, Category, Expense } from "@/models";
import { rupeesToPaise } from "@/lib/utils/currency";
import { isValidObjectId } from "@/lib/security/sanitize";

export interface CategoryBudgetStatus {
  _id?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  budgetAmountPaise: number;
  spentAmountPaise: number;
  remainingPaise: number;
  percentageUsed: number;
  alertLevel: "NORMAL" | "WARNING_70" | "DANGER_90" | "EXCEEDED_100";
}

export interface MonthlyBudgetOverview {
  month: number;
  year: number;
  totalBudgetPaise: number;
  totalSpentPaise: number;
  remainingPaise: number;
  percentageUsed: number;
  alertLevel: "NORMAL" | "WARNING_70" | "DANGER_90" | "EXCEEDED_100";
  categoryBudgets: CategoryBudgetStatus[];
}

export class BudgetService {
  static getAlertLevel(percentage: number): "NORMAL" | "WARNING_70" | "DANGER_90" | "EXCEEDED_100" {
    if (percentage >= 100) return "EXCEEDED_100";
    if (percentage >= 90) return "DANGER_90";
    if (percentage >= 70) return "WARNING_70";
    return "NORMAL";
  }

  static async getMonthlyBudgetOverview(userId: string, month: number, year: number): Promise<MonthlyBudgetOverview> {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const uId = new mongoose.Types.ObjectId(userId);

    // Calculate month date bounds
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Fetch budgets for this user for this month/year
    const budgets = await Budget.find({ userId: uId, month, year }).populate("categoryId", "name icon color").lean();

    // Fetch total expenses and category-wise expenses for this month/year
    const expenseAgg = await Expense.aggregate([
      {
        $match: {
          userId: uId,
          transactionDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          totalSpent: { $sum: "$amountPaise" },
        },
      },
    ]);

    const spentMap = new Map<string, number>();
    let totalSpentPaise = 0;
    for (const exp of expenseAgg) {
      const catId = exp._id ? exp._id.toString() : "uncategorized";
      spentMap.set(catId, exp.totalSpent);
      totalSpentPaise += exp.totalSpent;
    }

    // Find overall budget (categoryId is null)
    const overallBudgetDoc = budgets.find((b) => !b.categoryId);
    const totalBudgetPaise = overallBudgetDoc ? overallBudgetDoc.amountPaise : 0;

    const remainingPaise = totalBudgetPaise - totalSpentPaise;
    const percentageUsed = totalBudgetPaise > 0 ? Math.round((totalSpentPaise / totalBudgetPaise) * 100) : 0;
    const alertLevel = this.getAlertLevel(percentageUsed);

    // Build category budgets
    const categoryBudgets: CategoryBudgetStatus[] = [];
    for (const b of budgets) {
      if (b.categoryId) {
        const catObj = b.categoryId as any;
        const cId = catObj._id.toString();
        const spent = spentMap.get(cId) || 0;
        const remaining = b.amountPaise - spent;
        const pct = b.amountPaise > 0 ? Math.round((spent / b.amountPaise) * 100) : 0;

        categoryBudgets.push({
          _id: b._id.toString(),
          categoryId: cId,
          categoryName: catObj.name,
          categoryIcon: catObj.icon,
          categoryColor: catObj.color,
          budgetAmountPaise: b.amountPaise,
          spentAmountPaise: spent,
          remainingPaise: remaining,
          percentageUsed: pct,
          alertLevel: this.getAlertLevel(pct),
        });
      }
    }

    return {
      month,
      year,
      totalBudgetPaise,
      totalSpentPaise,
      remainingPaise,
      percentageUsed,
      alertLevel,
      categoryBudgets,
    };
  }

  static async setBudget(
    userId: string,
    data: {
      name: string;
      amount: number;
      month: number;
      year: number;
      categoryId?: string | null;
    }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const uId = new mongoose.Types.ObjectId(userId);
    const catId = data.categoryId && isValidObjectId(data.categoryId) ? new mongoose.Types.ObjectId(data.categoryId) : null;
    const amountPaise = rupeesToPaise(data.amount);

    const filter: Record<string, any> = {
      userId: uId,
      month: data.month,
      year: data.year,
      categoryId: catId,
    };

    const budget = await Budget.findOneAndUpdate(
      filter,
      {
        $set: {
          name: data.name.trim(),
          amountPaise,
        },
      },
      { upsert: true, new: true }
    ).lean();

    return { _id: budget._id.toString() };
  }

  static async deleteBudget(userId: string, budgetId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(budgetId)) throw new Error("Invalid ID format");

    const res = await Budget.deleteOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (res.deletedCount === 0) throw new Error("Budget not found");
    return { success: true };
  }
}

