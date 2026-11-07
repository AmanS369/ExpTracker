import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AIPendingAction } from "@/models/AIPendingAction";
import { ExpenseService } from "@/services/expense.service";
import { LendingService } from "@/services/lending.service";
import { CreditCardService } from "@/services/credit-card.service";
import { BudgetService } from "@/services/budget.service";
import { DashboardService } from "@/services/dashboard.service";
import { formatINR, rupeesToPaise } from "@/lib/utils/currency";
import { formatISTDate } from "@/lib/utils/date";
import { Category, CreditCard, Person } from "@/models";

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  isPendingAction?: boolean;
  pendingActionId?: string;
  summaryText?: string;
}

export class ToolExecutionService {
  /**
   * Dispatches and executes an authorized tool call for the authenticated user.
   */
  static async executeTool(
    userId: string,
    conversationId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolExecutionResult> {
    await connectToDatabase();
    const uId = new mongoose.Types.ObjectId(userId);

    try {
      switch (toolName) {
        // ==================== EXPENSE READ TOOLS ====================
        case "get_expense_summary": {
          const now = new Date();
          const month = args.month || now.getMonth() + 1;
          const year = args.year || now.getFullYear();
          const overview = await BudgetService.getMonthlyBudgetOverview(userId, month, year);
          return {
            success: true,
            data: {
              month,
              year,
              totalSpentINR: overview.totalSpentPaise / 100,
              totalSpentFormatted: formatINR(overview.totalSpentPaise),
              remainingBudgetINR: overview.remainingPaise / 100,
              remainingBudgetFormatted: formatINR(overview.remainingPaise),
              budgetUtilizationPercent: overview.percentageUsed,
            },
          };
        }

        case "get_expenses_by_category": {
          const now = new Date();
          const month = args.month || now.getMonth() + 1;
          const year = args.year || now.getFullYear();
          const overview = await BudgetService.getMonthlyBudgetOverview(userId, month, year);
          return {
            success: true,
            data: {
              month,
              year,
              categories: overview.categoryBudgets.map((c) => ({
                name: c.categoryName,
                spentINR: c.spentAmountPaise / 100,
                spentFormatted: formatINR(c.spentAmountPaise),
                budgetINR: c.budgetAmountPaise / 100,
                budgetFormatted: formatINR(c.budgetAmountPaise),
                percentageUsed: c.percentageUsed,
              })),
            },
          };
        }

        case "get_recent_expenses": {
          const limit = Math.min(20, Math.max(1, args.limit || 5));
          const result = await ExpenseService.getExpenses(userId, { limit });
          return {
            success: true,
            data: {
              count: result.expenses.length,
              expenses: result.expenses.map((e) => ({
                id: e._id,
                title: e.title,
                amountINR: e.amountPaise / 100,
                amountFormatted: formatINR(e.amountPaise),
                category: e.category?.name || "General",
                paymentMethod: e.paymentMethod,
                creditCard: e.creditCard?.cardName,
                date: formatISTDate(e.transactionDate),
              })),
            },
          };
        }

        // ==================== LENDING READ TOOLS ====================
        case "get_lending_summary": {
          const summary = await LendingService.getLendingDashboardSummary(userId);
          return {
            success: true,
            data: {
              totalLentINR: summary.totalLentPaise / 100,
              totalLentFormatted: formatINR(summary.totalLentPaise),
              totalReceivedINR: summary.totalReceivedPaise / 100,
              totalReceivedFormatted: formatINR(summary.totalReceivedPaise),
              totalPendingINR: summary.totalPendingPaise / 100,
              totalPendingFormatted: formatINR(summary.totalPendingPaise),
              borrowersPendingCount: summary.pendingPeopleCount,
            },
          };
        }

        case "get_person_balance": {
          const people = await LendingService.getPeopleWithBalances(userId);
          const searchName = String(args.personName || "").toLowerCase().trim();
          const match = people.find((p) => p.name.toLowerCase().includes(searchName));

          if (!match) {
            return {
              success: false,
              error: `No contact found matching "${args.personName}".`,
            };
          }

          return {
            success: true,
            data: {
              personId: match._id,
              name: match.name,
              totalLentINR: match.totalLentPaise / 100,
              totalLentFormatted: formatINR(match.totalLentPaise),
              totalReceivedINR: match.totalReceivedPaise / 100,
              totalReceivedFormatted: formatINR(match.totalReceivedPaise),
              outstandingINR: match.outstandingPaise / 100,
              outstandingFormatted: formatINR(match.outstandingPaise),
              status: match.outstandingPaise > 0 ? "OWES_YOU" : "SETTLED",
            },
          };
        }

        case "get_all_debtors": {
          const people = await LendingService.getPeopleWithBalances(userId);
          const debtors = people.filter((p) => p.outstandingPaise > 0);
          return {
            success: true,
            data: {
              debtorsCount: debtors.length,
              debtors: debtors.map((d) => ({
                name: d.name,
                outstandingINR: d.outstandingPaise / 100,
                outstandingFormatted: formatINR(d.outstandingPaise),
                phone: d.phone,
              })),
            },
          };
        }

        case "get_lending_history": {
          const people = await LendingService.getPeopleWithBalances(userId);
          let targetPersonId: string | undefined = undefined;

          if (args.personName) {
            const search = String(args.personName).toLowerCase().trim();
            const match = people.find((p) => p.name.toLowerCase().includes(search));
            if (match) targetPersonId = match._id;
          }

          if (targetPersonId) {
            const details = await LendingService.getPersonDetails(userId, targetPersonId);
            return {
              success: true,
              data: {
                personName: details.person.name,
                transactions: details.transactions.slice(0, args.limit || 10).map((t) => ({
                  type: t.type,
                  amountFormatted: formatINR(t.amountPaise),
                  date: formatISTDate(t.transactionDate),
                  method: t.paymentMethod,
                  description: t.description,
                })),
              },
            };
          }

          // General lending overview
          return {
            success: true,
            data: {
              contacts: people.map((p) => ({
                name: p.name,
                outstandingFormatted: formatINR(p.outstandingPaise),
                transactionCount: p.transactionCount,
              })),
            },
          };
        }

        // ==================== CREDIT CARD READ TOOLS ====================
        case "get_all_credit_cards": {
          const cards = await CreditCardService.getCardsWithLedger(userId);
          return {
            success: true,
            data: {
              cardsCount: cards.length,
              cards: cards.map((c) => ({
                cardName: c.cardName,
                bankName: c.bankName,
                limitFormatted: formatINR(c.creditLimitPaise),
                outstandingINR: c.currentOutstandingPaise / 100,
                outstandingFormatted: formatINR(c.currentOutstandingPaise),
                availableCreditFormatted: formatINR(c.availableCreditPaise),
                dueDate: formatISTDate(c.dueInfo.dueDate),
                status: c.dueInfo.label,
              })),
            },
          };
        }

        case "get_card_outstanding": {
          const cards = await CreditCardService.getCardsWithLedger(userId);
          const search = String(args.cardName || "").toLowerCase().trim();
          const match = cards.find(
            (c) => c.cardName.toLowerCase().includes(search) || c.bankName.toLowerCase().includes(search)
          );

          if (!match) {
            return {
              success: false,
              error: `No credit card found matching "${args.cardName}".`,
            };
          }

          return {
            success: true,
            data: {
              cardName: match.cardName,
              bankName: match.bankName,
              outstandingINR: match.currentOutstandingPaise / 100,
              outstandingFormatted: formatINR(match.currentOutstandingPaise),
              availableCreditFormatted: formatINR(match.availableCreditPaise),
              limitFormatted: formatINR(match.creditLimitPaise),
              dueDate: formatISTDate(match.dueInfo.dueDate),
              dueStatus: match.dueInfo.label,
            },
          };
        }

        case "get_total_card_debt": {
          const cards = await CreditCardService.getCardsWithLedger(userId);
          const totalDebtPaise = cards.reduce((sum, c) => sum + c.currentOutstandingPaise, 0);
          return {
            success: true,
            data: {
              totalCards: cards.length,
              totalDebtINR: totalDebtPaise / 100,
              totalDebtFormatted: formatINR(totalDebtPaise),
              breakdown: cards.map((c) => ({
                card: c.cardName,
                outstanding: formatINR(c.currentOutstandingPaise),
              })),
            },
          };
        }

        case "get_upcoming_due_dates": {
          const cards = await CreditCardService.getCardsWithLedger(userId);
          return {
            success: true,
            data: {
              upcomingCards: cards
                .filter((c) => c.currentOutstandingPaise > 0)
                .map((c) => ({
                  cardName: c.cardName,
                  outstandingFormatted: formatINR(c.currentOutstandingPaise),
                  dueDate: formatISTDate(c.dueInfo.dueDate),
                  daysLeft: c.dueInfo.daysLeft,
                  status: c.dueInfo.label,
                })),
            },
          };
        }

        // ==================== BUDGET READ TOOLS ====================
        case "get_monthly_budget":
        case "get_budget_summary": {
          const now = new Date();
          const month = args.month || now.getMonth() + 1;
          const year = args.year || now.getFullYear();
          const overview = await BudgetService.getMonthlyBudgetOverview(userId, month, year);

          return {
            success: true,
            data: {
              month,
              year,
              totalBudgetINR: overview.totalBudgetPaise / 100,
              totalBudgetFormatted: formatINR(overview.totalBudgetPaise),
              totalSpentINR: overview.totalSpentPaise / 100,
              totalSpentFormatted: formatINR(overview.totalSpentPaise),
              remainingINR: overview.remainingPaise / 100,
              remainingFormatted: formatINR(overview.remainingPaise),
              percentageUsed: overview.percentageUsed,
              alertLevel: overview.alertLevel,
              categoryBudgets: overview.categoryBudgets.map((cb) => ({
                category: cb.categoryName,
                budgetFormatted: formatINR(cb.budgetAmountPaise),
                spentFormatted: formatINR(cb.spentAmountPaise),
                remainingFormatted: formatINR(cb.remainingPaise),
                percentageUsed: cb.percentageUsed,
              })),
            },
          };
        }

        case "get_category_budget": {
          const now = new Date();
          const month = args.month || now.getMonth() + 1;
          const year = args.year || now.getFullYear();
          const overview = await BudgetService.getMonthlyBudgetOverview(userId, month, year);
          const search = String(args.categoryName || "").toLowerCase().trim();
          const match = overview.categoryBudgets.find((c) => c.categoryName.toLowerCase().includes(search));

          if (!match) {
            return {
              success: false,
              error: `No budget configured for category "${args.categoryName}" in month ${month}/${year}.`,
            };
          }

          return {
            success: true,
            data: {
              categoryName: match.categoryName,
              budgetFormatted: formatINR(match.budgetAmountPaise),
              spentFormatted: formatINR(match.spentAmountPaise),
              remainingFormatted: formatINR(match.remainingPaise),
              percentageUsed: match.percentageUsed,
              alertLevel: match.alertLevel,
            },
          };
        }

        // ==================== WRITE TOOLS (STRICT CONFIRMATION REQUIRED) ====================
        case "create_expense": {
          const amount = Number(args.amount);
          if (!amount || amount <= 0) throw new Error("Invalid expense amount.");

          // Find or match category
          const categories = await ExpenseService.getCategories(userId);
          const catName = (args.categoryName || "").toLowerCase().trim();
          const matchedCategory =
            categories.find((c) => c.name.toLowerCase().includes(catName)) || categories[0];

          // Check if credit card method
          let cardId: string | null = null;
          let matchedCardName: string | undefined = undefined;
          if (args.paymentMethod === "CREDIT_CARD" || args.creditCardName) {
            const cards = await CreditCardService.getCardsWithLedger(userId);
            const cardQuery = (args.creditCardName || "").toLowerCase().trim();
            const matchedCard = cardQuery
              ? cards.find((c) => c.cardName.toLowerCase().includes(cardQuery) || c.bankName.toLowerCase().includes(cardQuery))
              : cards[0];

            if (matchedCard) {
              cardId = matchedCard._id;
              matchedCardName = matchedCard.cardName;
            }
          }

          const actionSummary = `Add Expense of ₹${amount.toLocaleString("en-IN")} for "${args.title}" (${
            matchedCategory?.name || "General"
          }) paid via ${matchedCardName ? `Credit Card (${matchedCardName})` : args.paymentMethod || "UPI"}.`;

          const pendingAction = await AIPendingAction.create({
            userId: uId,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            actionType: "CREATE_EXPENSE",
            arguments: {
              title: args.title,
              amount,
              categoryId: matchedCategory?._id,
              categoryName: matchedCategory?.name,
              paymentMethod: cardId ? "CREDIT_CARD" : args.paymentMethod || "UPI",
              creditCardId: cardId,
              creditCardName: matchedCardName,
              transactionDate: args.date || new Date().toISOString().split("T")[0],
              notes: args.notes || "",
            },
            status: "PENDING",
            summaryText: actionSummary,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          });

          return {
            success: true,
            isPendingAction: true,
            pendingActionId: pendingAction._id.toString(),
            summaryText: actionSummary,
            data: {
              actionId: pendingAction._id.toString(),
              operation: "CREATE_EXPENSE",
              title: args.title,
              amountINR: amount,
              category: matchedCategory?.name,
              paymentMethod: cardId ? `Credit Card (${matchedCardName})` : args.paymentMethod || "UPI",
              date: args.date || "Today",
              requiresConfirmation: true,
            },
          };
        }

        case "create_lending": {
          const amount = Number(args.amount);
          if (!amount || amount <= 0) throw new Error("Invalid lending amount.");

          const people = await LendingService.getPeopleWithBalances(userId);
          const search = String(args.personName || "").toLowerCase().trim();
          let person = people.find((p) => p.name.toLowerCase().includes(search));

          const actionSummary = `Record lending ₹${amount.toLocaleString("en-IN")} to ${
            person ? person.name : args.personName
          } via ${args.paymentMethod || "UPI"}.`;

          const pendingAction = await AIPendingAction.create({
            userId: uId,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            actionType: "RECORD_LENDING",
            arguments: {
              personId: person?._id,
              personName: person?.name || args.personName,
              amount,
              paymentMethod: args.paymentMethod || "UPI",
              description: args.description || "Lent via AI assistant",
              transactionDate: args.date || new Date().toISOString().split("T")[0],
            },
            status: "PENDING",
            summaryText: actionSummary,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          });

          return {
            success: true,
            isPendingAction: true,
            pendingActionId: pendingAction._id.toString(),
            summaryText: actionSummary,
            data: {
              actionId: pendingAction._id.toString(),
              operation: "RECORD_LENDING",
              personName: person?.name || args.personName,
              amountINR: amount,
              paymentMethod: args.paymentMethod || "UPI",
              date: args.date || "Today",
              requiresConfirmation: true,
            },
          };
        }

        case "record_repayment": {
          const amount = Number(args.amount);
          if (!amount || amount <= 0) throw new Error("Invalid repayment amount.");

          const people = await LendingService.getPeopleWithBalances(userId);
          const search = String(args.personName || "").toLowerCase().trim();
          const person = people.find((p) => p.name.toLowerCase().includes(search));

          if (!person) {
            return {
              success: false,
              error: `Contact "${args.personName}" not found in your lending directory.`,
            };
          }

          if (person.outstandingPaise < rupeesToPaise(amount)) {
            return {
              success: false,
              error: `Repayment of ₹${amount} exceeds current pending balance of ${formatINR(
                person.outstandingPaise
              )}.`,
            };
          }

          const actionSummary = `Record repayment of ₹${amount.toLocaleString("en-IN")} received from ${
            person.name
          } via ${args.paymentMethod || "UPI"}.`;

          const pendingAction = await AIPendingAction.create({
            userId: uId,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            actionType: "RECORD_REPAYMENT",
            arguments: {
              personId: person._id,
              personName: person.name,
              amount,
              paymentMethod: args.paymentMethod || "UPI",
              description: args.description || "Repayment via AI assistant",
              transactionDate: args.date || new Date().toISOString().split("T")[0],
            },
            status: "PENDING",
            summaryText: actionSummary,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          });

          return {
            success: true,
            isPendingAction: true,
            pendingActionId: pendingAction._id.toString(),
            summaryText: actionSummary,
            data: {
              actionId: pendingAction._id.toString(),
              operation: "RECORD_REPAYMENT",
              personName: person.name,
              amountINR: amount,
              paymentMethod: args.paymentMethod || "UPI",
              date: args.date || "Today",
              requiresConfirmation: true,
            },
          };
        }

        case "create_card_expense": {
          const amount = Number(args.amount);
          const cards = await CreditCardService.getCardsWithLedger(userId);
          const search = String(args.cardName || "").toLowerCase().trim();
          const card = cards.find(
            (c) => c.cardName.toLowerCase().includes(search) || c.bankName.toLowerCase().includes(search)
          );

          if (!card) {
            return {
              success: false,
              error: `Credit card "${args.cardName}" was not found.`,
            };
          }

          const categories = await ExpenseService.getCategories(userId);
          const catName = (args.categoryName || "").toLowerCase().trim();
          const category = categories.find((c) => c.name.toLowerCase().includes(catName)) || categories[0];

          const actionSummary = `Record ₹${amount.toLocaleString("en-IN")} spent on ${card.cardName} for "${
            args.title
          }" (${category?.name || "General"}).`;

          const pendingAction = await AIPendingAction.create({
            userId: uId,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            actionType: "CREATE_CARD_EXPENSE",
            arguments: {
              title: args.title,
              amount,
              creditCardId: card._id,
              cardName: card.cardName,
              categoryId: category?._id,
              categoryName: category?.name,
              transactionDate: args.date || new Date().toISOString().split("T")[0],
              notes: args.notes || "",
            },
            status: "PENDING",
            summaryText: actionSummary,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          });

          return {
            success: true,
            isPendingAction: true,
            pendingActionId: pendingAction._id.toString(),
            summaryText: actionSummary,
            data: {
              actionId: pendingAction._id.toString(),
              operation: "CREATE_CARD_EXPENSE",
              cardName: card.cardName,
              title: args.title,
              amountINR: amount,
              category: category?.name,
              requiresConfirmation: true,
            },
          };
        }

        case "record_card_payment": {
          const amount = Number(args.amount);
          const cards = await CreditCardService.getCardsWithLedger(userId);
          const search = String(args.cardName || "").toLowerCase().trim();
          const card = cards.find(
            (c) => c.cardName.toLowerCase().includes(search) || c.bankName.toLowerCase().includes(search)
          );

          if (!card) {
            return {
              success: false,
              error: `Credit card "${args.cardName}" was not found.`,
            };
          }

          const actionSummary = `Record bill payment of ₹${amount.toLocaleString("en-IN")} towards ${
            card.cardName
          }. (Reduces card liability; not counted as an expense).`;

          const pendingAction = await AIPendingAction.create({
            userId: uId,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            actionType: "RECORD_CARD_PAYMENT",
            arguments: {
              creditCardId: card._id,
              cardName: card.cardName,
              amount,
              paymentSource: args.paymentSource || "BANK_ACCOUNT",
              paymentDate: args.date || new Date().toISOString().split("T")[0],
              notes: args.notes || "Bill payment recorded via AI assistant",
            },
            status: "PENDING",
            summaryText: actionSummary,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          });

          return {
            success: true,
            isPendingAction: true,
            pendingActionId: pendingAction._id.toString(),
            summaryText: actionSummary,
            data: {
              actionId: pendingAction._id.toString(),
              operation: "RECORD_CARD_PAYMENT",
              cardName: card.cardName,
              amountINR: amount,
              source: args.paymentSource || "BANK_ACCOUNT",
              requiresConfirmation: true,
            },
          };
        }

        case "create_budget": {
          const amount = Number(args.amount);
          const now = new Date();
          const month = args.month || now.getMonth() + 1;
          const year = args.year || now.getFullYear();

          let categoryId: string | null = null;
          let categoryName: string | undefined = undefined;

          if (args.categoryName) {
            const categories = await ExpenseService.getCategories(userId);
            const search = args.categoryName.toLowerCase().trim();
            const match = categories.find((c) => c.name.toLowerCase().includes(search));
            if (match) {
              categoryId = match._id;
              categoryName = match.name;
            }
          }

          const actionSummary = `Set ${categoryName ? `${categoryName} budget` : "monthly overall budget"} to ₹${amount.toLocaleString(
            "en-IN"
          )} for month ${month}/${year}.`;

          const pendingAction = await AIPendingAction.create({
            userId: uId,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            actionType: "SET_BUDGET",
            arguments: {
              name: categoryName ? `${categoryName} Budget` : "Monthly Overall Budget",
              amount,
              month,
              year,
              categoryId,
              categoryName,
            },
            status: "PENDING",
            summaryText: actionSummary,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          });

          return {
            success: true,
            isPendingAction: true,
            pendingActionId: pendingAction._id.toString(),
            summaryText: actionSummary,
            data: {
              actionId: pendingAction._id.toString(),
              operation: "SET_BUDGET",
              amountINR: amount,
              scope: categoryName ? `Category: ${categoryName}` : "Overall Monthly",
              month,
              year,
              requiresConfirmation: true,
            },
          };
        }

        case "delete_expense": {
          const actionSummary = `Delete expense with ID ${args.expenseId}.`;
          const pendingAction = await AIPendingAction.create({
            userId: uId,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            actionType: "DELETE_EXPENSE",
            arguments: { expenseId: args.expenseId },
            status: "PENDING",
            summaryText: actionSummary,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          });

          return {
            success: true,
            isPendingAction: true,
            pendingActionId: pendingAction._id.toString(),
            summaryText: actionSummary,
            data: { actionId: pendingAction._id.toString(), operation: "DELETE_EXPENSE", requiresConfirmation: true },
          };
        }

        default:
          return {
            success: false,
            error: `Tool "${toolName}" is not registered in the system.`,
          };
      }
    } catch (err: any) {
      console.error(`[ToolExecution Error for ${toolName}]:`, err);
      return { success: false, error: err.message || "Failed to execute tool." };
    }
  }

  /**
   * Executes a confirmed pending action after user explicitly approves.
   */
  static async confirmPendingAction(userId: string, actionId: string): Promise<any> {
    await connectToDatabase();
    const action = await AIPendingAction.findOne({
      _id: new mongoose.Types.ObjectId(actionId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!action) {
      throw new Error("Action not found or unauthorized.");
    }

    if (action.status !== "PENDING") {
      throw new Error(`Action is already ${action.status.toLowerCase()}.`);
    }

    if (new Date() > action.expiresAt) {
      action.status = "EXPIRED";
      await action.save();
      throw new Error("This action has expired. Please ask the assistant again.");
    }

    const { actionType, arguments: args } = action;
    let result: any = null;

    switch (actionType) {
      case "CREATE_EXPENSE": {
        result = await ExpenseService.createExpense(userId, {
          title: args.title,
          amount: args.amount,
          categoryId: args.categoryId,
          paymentMethod: args.paymentMethod,
          creditCardId: args.creditCardId,
          transactionDate: args.transactionDate,
          notes: args.notes,
        });
        break;
      }

      case "RECORD_LENDING": {
        let pId = args.personId;
        if (!pId) {
          // If person didn't exist yet, create contact
          const createdPerson = await LendingService.createPerson(userId, { name: args.personName });
          pId = createdPerson._id;
        }

        result = await LendingService.addTransaction(userId, {
          personId: pId,
          type: "LENT",
          amount: args.amount,
          paymentMethod: args.paymentMethod,
          description: args.description,
          transactionDate: args.transactionDate,
        });
        break;
      }

      case "RECORD_REPAYMENT": {
        result = await LendingService.addTransaction(userId, {
          personId: args.personId,
          type: "REPAYMENT",
          amount: args.amount,
          paymentMethod: args.paymentMethod,
          description: args.description,
          transactionDate: args.transactionDate,
        });
        break;
      }

      case "CREATE_CARD_EXPENSE": {
        result = await ExpenseService.createExpense(userId, {
          title: args.title,
          amount: args.amount,
          categoryId: args.categoryId,
          paymentMethod: "CREDIT_CARD",
          creditCardId: args.creditCardId,
          transactionDate: args.transactionDate,
          notes: args.notes,
        });
        break;
      }

      case "RECORD_CARD_PAYMENT": {
        result = await CreditCardService.recordPayment(userId, {
          creditCardId: args.creditCardId,
          amount: args.amount,
          paymentDate: args.paymentDate,
          paymentSource: args.paymentSource,
          notes: args.notes,
        });
        break;
      }

      case "SET_BUDGET": {
        result = await BudgetService.setBudget(userId, {
          name: args.name,
          amount: args.amount,
          month: args.month,
          year: args.year,
          categoryId: args.categoryId,
        });
        break;
      }

      case "DELETE_EXPENSE": {
        result = await ExpenseService.deleteExpense(userId, args.expenseId);
        break;
      }

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    action.status = "CONFIRMED";
    await action.save();

    return {
      success: true,
      actionType,
      summary: action.summaryText,
      result,
    };
  }

  /**
   * Cancels a pending action when rejected by user.
   */
  static async cancelPendingAction(userId: string, actionId: string) {
    await connectToDatabase();
    const action = await AIPendingAction.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(actionId),
        userId: new mongoose.Types.ObjectId(userId),
        status: "PENDING",
      },
      { $set: { status: "CANCELLED" } },
      { new: true }
    );

    if (!action) {
      throw new Error("Action not found or already processed.");
    }

    return { success: true, status: "CANCELLED" };
  }
}
