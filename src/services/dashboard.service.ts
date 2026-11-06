import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Budget, CreditCard, CreditCardTransaction, Expense, LendingTransaction } from "@/models";
import { isValidObjectId } from "@/lib/security/sanitize";
import { LendingService } from "./lending.service";
import { CreditCardService } from "./credit-card.service";
import { BudgetService } from "./budget.service";

export interface ActivityItem {
  id: string;
  type: "LENT" | "REPAYMENT" | "EXPENSE" | "CC_PAYMENT";
  title: string;
  subtitle: string;
  amountPaise: number;
  date: Date;
  method?: string;
  categoryOrBank?: string;
  direction: "INCOMING" | "OUTGOING" | "NEUTRAL";
}

export class DashboardService {
  static async getDashboardData(userId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const uId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Receivables (Lending Summary)
    const lendingSummary = await LendingService.getLendingDashboardSummary(userId);
    const totalReceivablePaise = lendingSummary.totalPendingPaise;

    // 2. Credit Card Liabilities
    const cards = await CreditCardService.getCardsWithLedger(userId);
    let totalCreditCardOutstandingPaise = 0;
    for (const card of cards) {
      totalCreditCardOutstandingPaise += card.currentOutstandingPaise;
    }

    // 3. Current Month Budget & Expenses
    const budgetOverview = await BudgetService.getMonthlyBudgetOverview(userId, currentMonth, currentYear);
    const totalExpensesThisMonthPaise = budgetOverview.totalSpentPaise;
    const remainingMonthlyBudgetPaise = budgetOverview.remainingPaise;
    const monthlyBudgetTotalPaise = budgetOverview.totalBudgetPaise;

    // 4. Net Position (Receivables - CC Liabilities)
    const netPositionPaise = totalReceivablePaise - totalCreditCardOutstandingPaise;

    // 5. Category-wise expense breakdown for current month
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const categoryBreakdownAgg = await Expense.aggregate([
      {
        $match: {
          userId: uId,
          transactionDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          totalPaise: { $sum: "$amountPaise" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: "$cat" },
      { $sort: { totalPaise: -1 } },
    ]);

    const categoryBreakdown = categoryBreakdownAgg.map((c) => ({
      name: c.cat.name,
      amountPaise: c.totalPaise,
      color: c.cat.color || "#6366f1",
      icon: c.cat.icon || "Tag",
      count: c.count,
    }));

    // 6. Recent Activity Feed (Chronological across modules)
    const [recentExpenses, recentLending, recentCCPayments] = await Promise.all([
      Expense.find({ userId: uId })
        .populate("categoryId", "name icon color")
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(10)
        .lean(),
      LendingTransaction.find({ userId: uId })
        .populate("personId", "name")
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(10)
        .lean(),
      CreditCardTransaction.find({ userId: uId, type: "PAYMENT" })
        .populate("creditCardId", "cardName")
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const activities: ActivityItem[] = [];

    for (const exp of recentExpenses) {
      activities.push({
        id: `exp-${exp._id}`,
        type: "EXPENSE",
        title: exp.title,
        subtitle: (exp.categoryId as any)?.name || "Expense",
        amountPaise: exp.amountPaise,
        date: exp.transactionDate,
        method: exp.paymentMethod,
        categoryOrBank: (exp.categoryId as any)?.name,
        direction: "OUTGOING",
      });
    }

    for (const lend of recentLending) {
      const personName = (lend.personId as any)?.name || "Someone";
      activities.push({
        id: `lend-${lend._id}`,
        type: lend.type as "LENT" | "REPAYMENT",
        title: lend.type === "LENT" ? `Lent to ${personName}` : `Repayment from ${personName}`,
        subtitle: lend.description || (lend.type === "LENT" ? "Money Lent" : "Repayment Received"),
        amountPaise: lend.amountPaise,
        date: lend.transactionDate,
        method: lend.paymentMethod,
        categoryOrBank: personName,
        direction: lend.type === "LENT" ? "OUTGOING" : "INCOMING",
      });
    }

    for (const cc of recentCCPayments) {
      const cardName = (cc.creditCardId as any)?.cardName || "Credit Card";
      activities.push({
        id: `cc-${cc._id}`,
        type: "CC_PAYMENT",
        title: `Payment: ${cardName}`,
        subtitle: cc.description || "Credit card bill payment",
        amountPaise: cc.amountPaise,
        date: cc.transactionDate,
        method: cc.paymentSource,
        categoryOrBank: cardName,
        direction: "NEUTRAL", // CC payment reduces liability, not personal expense
      });
    }

    // Sort combined activities by date descending
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentActivity = activities.slice(0, 10);

    return {
      summary: {
        totalReceivablePaise,
        totalCreditCardOutstandingPaise,
        totalExpensesThisMonthPaise,
        remainingMonthlyBudgetPaise,
        monthlyBudgetTotalPaise,
        netPositionPaise,
      },
      categoryBreakdown,
      recentActivity,
      cardsCount: cards.length,
      peopleCount: lendingSummary.peopleCount,
    };
  }
}

