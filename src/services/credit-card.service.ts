import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CreditCard, CreditCardTransaction, ICreditCard } from "@/models";
import { rupeesToPaise } from "@/lib/utils/currency";
import { isValidObjectId } from "@/lib/security/sanitize";
import { calculateDueStatus } from "@/lib/utils/date";

export interface CreditCardWithLedger {
  _id: string;
  cardName: string;
  bankName: string;
  creditLimitPaise: number;
  statementDay: number;
  dueDay: number;
  openingOutstandingPaise: number;
  lastFourDigits?: string;
  notes?: string;
  color?: string;
  currentOutstandingPaise: number;
  availableCreditPaise: number;
  dueInfo: {
    dueDate: string;
    status: string;
    daysLeft: number;
    label: string;
  };
  createdAt: Date;
}

export class CreditCardService {
  /**
   * Calculates the next payment due date for a given dueDay
   */
  static getNextDueDate(dueDay: number): Date {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    // Determine target month
    let targetYear = currentYear;
    let targetMonth = currentMonth;

    if (currentDay > dueDay) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    // Adjust for months with fewer days
    const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualDay = Math.min(dueDay, maxDaysInTargetMonth);

    return new Date(targetYear, targetMonth, actualDay, 23, 59, 59);
  }

  static async getCardsWithLedger(userId: string): Promise<CreditCardWithLedger[]> {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const uId = new mongoose.Types.ObjectId(userId);
    const cards = await CreditCard.find({ userId: uId }).sort({ cardName: 1 }).lean();

    // Ledger aggregation for each card
    const aggregates = await CreditCardTransaction.aggregate([
      { $match: { userId: uId } },
      {
        $group: {
          _id: "$creditCardId",
          totalPurchases: {
            $sum: { $cond: [{ $eq: ["$type", "PURCHASE"] }, "$amountPaise", 0] },
          },
          totalPayments: {
            $sum: { $cond: [{ $eq: ["$type", "PAYMENT"] }, "$amountPaise", 0] },
          },
          totalRefunds: {
            $sum: { $cond: [{ $in: ["$type", ["REFUND", "ADJUSTMENT"]] }, "$amountPaise", 0] },
          },
        },
      },
    ]);

    const aggMap = new Map<string, (typeof aggregates)[0]>();
    for (const agg of aggregates) {
      aggMap.set(agg._id.toString(), agg);
    }

    return cards.map((card) => {
      const cId = card._id.toString();
      const agg = aggMap.get(cId);

      const purchases = agg?.totalPurchases || 0;
      const payments = agg?.totalPayments || 0;
      const refunds = agg?.totalRefunds || 0;

      // Formula: Outstanding = Opening Outstanding + Card Purchases - Card Payments - Refunds
      const currentOutstandingPaise = Math.max(
        0,
        card.openingOutstandingPaise + purchases - payments - refunds
      );
      const availableCreditPaise = Math.max(0, card.creditLimitPaise - currentOutstandingPaise);

      const dueDate = this.getNextDueDate(card.dueDay);
      const isPaid = currentOutstandingPaise === 0;
      const dueStatus = calculateDueStatus(dueDate, isPaid);

      return {
        _id: cId,
        cardName: card.cardName,
        bankName: card.bankName,
        creditLimitPaise: card.creditLimitPaise,
        statementDay: card.statementDay,
        dueDay: card.dueDay,
        openingOutstandingPaise: card.openingOutstandingPaise,
        lastFourDigits: card.lastFourDigits,
        notes: card.notes,
        color: card.color,
        currentOutstandingPaise,
        availableCreditPaise,
        dueInfo: {
          dueDate: dueDate.toISOString(),
          status: dueStatus.status,
          daysLeft: dueStatus.daysLeft,
          label: dueStatus.label,
        },
        createdAt: card.createdAt,
      };
    });
  }

  static async getCardDetails(userId: string, cardId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(cardId)) throw new Error("Invalid ID format");

    const uId = new mongoose.Types.ObjectId(userId);
    const cId = new mongoose.Types.ObjectId(cardId);

    const card = await CreditCard.findOne({ _id: cId, userId: uId }).lean();
    if (!card) throw new Error("Credit card not found");

    const transactions = await CreditCardTransaction.find({ userId: uId, creditCardId: cId })
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    let purchases = 0;
    let payments = 0;
    let refunds = 0;

    for (const tx of transactions) {
      if (tx.type === "PURCHASE") purchases += tx.amountPaise;
      else if (tx.type === "PAYMENT") payments += tx.amountPaise;
      else refunds += tx.amountPaise;
    }

    const currentOutstandingPaise = Math.max(
      0,
      card.openingOutstandingPaise + purchases - payments - refunds
    );
    const availableCreditPaise = Math.max(0, card.creditLimitPaise - currentOutstandingPaise);

    const dueDate = this.getNextDueDate(card.dueDay);
    const isPaid = currentOutstandingPaise === 0;
    const dueStatus = calculateDueStatus(dueDate, isPaid);

    return {
      card: {
        _id: card._id.toString(),
        cardName: card.cardName,
        bankName: card.bankName,
        creditLimitPaise: card.creditLimitPaise,
        statementDay: card.statementDay,
        dueDay: card.dueDay,
        openingOutstandingPaise: card.openingOutstandingPaise,
        lastFourDigits: card.lastFourDigits,
        notes: card.notes,
        color: card.color,
        currentOutstandingPaise,
        availableCreditPaise,
        dueInfo: {
          dueDate: dueDate.toISOString(),
          status: dueStatus.status,
          daysLeft: dueStatus.daysLeft,
          label: dueStatus.label,
        },
      },
      transactions: transactions.map((t) => ({
        _id: t._id.toString(),
        type: t.type,
        amountPaise: t.amountPaise,
        expenseId: t.expenseId ? t.expenseId.toString() : null,
        paymentSource: t.paymentSource,
        transactionDate: t.transactionDate,
        description: t.description,
        createdAt: t.createdAt,
      })),
    };
  }

  static async createCard(
    userId: string,
    data: {
      cardName: string;
      bankName: string;
      creditLimit: number;
      statementDay: number;
      dueDay: number;
      openingOutstanding?: number;
      lastFourDigits?: string;
      notes?: string;
      color?: string;
    }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const card = await CreditCard.create({
      userId: new mongoose.Types.ObjectId(userId),
      cardName: data.cardName.trim(),
      bankName: data.bankName.trim(),
      creditLimitPaise: rupeesToPaise(data.creditLimit),
      statementDay: data.statementDay,
      dueDay: data.dueDay,
      openingOutstandingPaise: data.openingOutstanding ? rupeesToPaise(data.openingOutstanding) : 0,
      lastFourDigits: data.lastFourDigits?.trim() || "",
      notes: data.notes?.trim() || "",
      color: data.color || "#1e293b",
    });

    return { _id: card._id.toString(), cardName: card.cardName };
  }

  static async updateCard(
    userId: string,
    cardId: string,
    data: {
      cardName: string;
      bankName: string;
      creditLimit: number;
      statementDay: number;
      dueDay: number;
      openingOutstanding?: number;
      lastFourDigits?: string;
      notes?: string;
      color?: string;
    }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(cardId)) throw new Error("Invalid ID format");

    const card = await CreditCard.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(cardId), userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          cardName: data.cardName.trim(),
          bankName: data.bankName.trim(),
          creditLimitPaise: rupeesToPaise(data.creditLimit),
          statementDay: data.statementDay,
          dueDay: data.dueDay,
          openingOutstandingPaise: data.openingOutstanding ? rupeesToPaise(data.openingOutstanding) : 0,
          lastFourDigits: data.lastFourDigits?.trim() || "",
          notes: data.notes?.trim() || "",
          color: data.color || "#1e293b",
        },
      },
      { new: true }
    ).lean();

    if (!card) throw new Error("Card not found");
    return { _id: card._id.toString(), cardName: card.cardName };
  }

  static async deleteCard(userId: string, cardId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(cardId)) throw new Error("Invalid ID format");

    const details = await this.getCardDetails(userId, cardId);
    if (details.card.currentOutstandingPaise > 0) {
      throw new Error("Cannot delete credit card with an active outstanding balance.");
    }

    if (details.transactions.length > 0) {
      throw new Error("Cannot delete credit card with transaction history. Settle or remove transactions first.");
    }

    const res = await CreditCard.deleteOne({
      _id: new mongoose.Types.ObjectId(cardId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (res.deletedCount === 0) throw new Error("Card not found");
    return { success: true };
  }

  static async recordPayment(
    userId: string,
    data: {
      creditCardId: string;
      amount: number;
      paymentDate: string;
      paymentSource: "CASH" | "BANK_ACCOUNT" | "UPI" | "OTHER";
      notes?: string;
    }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(data.creditCardId)) throw new Error("Invalid ID format");

    const uId = new mongoose.Types.ObjectId(userId);
    const cId = new mongoose.Types.ObjectId(data.creditCardId);

    const card = await CreditCard.findOne({ _id: cId, userId: uId });
    if (!card) throw new Error("Credit card not found");

    const amountPaise = rupeesToPaise(data.amount);
    if (amountPaise <= 0) throw new Error("Payment amount must be greater than zero");

    const tx = await CreditCardTransaction.create({
      userId: uId,
      creditCardId: cId,
      type: "PAYMENT",
      amountPaise,
      paymentSource: data.paymentSource,
      transactionDate: new Date(data.paymentDate),
      description: data.notes?.trim() || `Payment towards ${card.cardName}`,
    });

    return {
      _id: tx._id.toString(),
      type: tx.type,
      amountPaise: tx.amountPaise,
      transactionDate: tx.transactionDate,
    };
  }

  static async deleteTransaction(userId: string, transactionId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(transactionId)) throw new Error("Invalid ID format");

    const tx = await CreditCardTransaction.findOne({
      _id: new mongoose.Types.ObjectId(transactionId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!tx) throw new Error("Transaction not found");
    if (tx.expenseId) {
      throw new Error("This credit card transaction is linked to an expense. Please delete the expense directly.");
    }

    await CreditCardTransaction.deleteOne({ _id: tx._id });
    return { success: true };
  }
}

