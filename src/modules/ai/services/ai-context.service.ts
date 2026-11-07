import { UserAIContext } from "../types/ai.types";
import { DashboardService } from "@/services/dashboard.service";
import { formatISTDate } from "@/lib/utils/date";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/models";
import mongoose from "mongoose";

export class AIContextService {
  static async buildUserContext(userId: string): Promise<UserAIContext> {
    await connectToDatabase();
    const user = await User.findById(new mongoose.Types.ObjectId(userId)).lean();
    const dashboardData = await DashboardService.getDashboardData(userId);

    const now = new Date();
    const currentMonthNumber = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return {
      userId,
      userName: user?.name || "User",
      preferredCurrency: "INR",
      timezone: "Asia/Kolkata",
      currentDateIST: formatISTDate(now, "dd MMMM yyyy"),
      currentMonth: {
        monthNumber: currentMonthNumber,
        year: currentYear,
        totalExpensesPaise: dashboardData.summary.totalExpensesThisMonthPaise,
        remainingBudgetPaise: dashboardData.summary.remainingMonthlyBudgetPaise,
        totalReceivablePaise: dashboardData.summary.totalReceivablePaise,
        creditCardOutstandingPaise: dashboardData.summary.totalCreditCardOutstandingPaise,
        netPositionPaise: dashboardData.summary.netPositionPaise,
      },
      cardsCount: dashboardData.cardsCount,
      peopleCount: dashboardData.peopleCount,
    };
  }
}

