import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { LendingTransaction, Person } from "@/models";
import { rupeesToPaise } from "@/lib/utils/currency";
import { isValidObjectId } from "@/lib/security/sanitize";

export interface PersonSummary {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  totalLentPaise: number;
  totalReceivedPaise: number;
  outstandingPaise: number;
  transactionCount: number;
  lastTransactionDate?: Date | null;
  createdAt: Date;
}

export class LendingService {
  static async getPeopleWithBalances(userId: string): Promise<PersonSummary[]> {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const uId = new mongoose.Types.ObjectId(userId);
    const people = await Person.find({ userId: uId }).sort({ name: 1 }).lean();

    // Aggregate transactions by personId
    const aggregates = await LendingTransaction.aggregate([
      { $match: { userId: uId } },
      {
        $group: {
          _id: "$personId",
          totalLentPaise: {
            $sum: { $cond: [{ $eq: ["$type", "LENT"] }, "$amountPaise", 0] },
          },
          totalReceivedPaise: {
            $sum: { $cond: [{ $eq: ["$type", "REPAYMENT"] }, "$amountPaise", 0] },
          },
          transactionCount: { $sum: 1 },
          lastTransactionDate: { $max: "$transactionDate" },
        },
      },
    ]);

    const aggMap = new Map<string, (typeof aggregates)[0]>();
    for (const agg of aggregates) {
      aggMap.set(agg._id.toString(), agg);
    }

    const result: PersonSummary[] = people.map((p) => {
      const pId = p._id.toString();
      const agg = aggMap.get(pId);
      const totalLentPaise = agg?.totalLentPaise || 0;
      const totalReceivedPaise = agg?.totalReceivedPaise || 0;
      const outstandingPaise = totalLentPaise - totalReceivedPaise;

      return {
        _id: pId,
        name: p.name,
        phone: p.phone,
        email: p.email,
        notes: p.notes,
        totalLentPaise,
        totalReceivedPaise,
        outstandingPaise,
        transactionCount: agg?.transactionCount || 0,
        lastTransactionDate: agg?.lastTransactionDate || null,
        createdAt: p.createdAt,
      };
    });

    // Sort by outstanding descending, then by name
    return result.sort((a, b) => b.outstandingPaise - a.outstandingPaise || a.name.localeCompare(b.name));
  }

  static async getPersonDetails(userId: string, personId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(personId)) {
      throw new Error("Invalid ID format");
    }

    const uId = new mongoose.Types.ObjectId(userId);
    const pId = new mongoose.Types.ObjectId(personId);

    const person = await Person.findOne({ _id: pId, userId: uId }).lean();
    if (!person) {
      throw new Error("Person not found");
    }

    const transactions = await LendingTransaction.find({ userId: uId, personId: pId })
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    let totalLentPaise = 0;
    let totalReceivedPaise = 0;
    for (const tx of transactions) {
      if (tx.type === "LENT") {
        totalLentPaise += tx.amountPaise;
      } else if (tx.type === "REPAYMENT") {
        totalReceivedPaise += tx.amountPaise;
      }
    }

    const outstandingPaise = totalLentPaise - totalReceivedPaise;

    return {
      person: {
        _id: person._id.toString(),
        name: person.name,
        phone: person.phone,
        email: person.email,
        notes: person.notes,
        createdAt: person.createdAt,
      },
      summary: {
        totalLentPaise,
        totalReceivedPaise,
        outstandingPaise,
        transactionCount: transactions.length,
      },
      transactions: transactions.map((t) => ({
        _id: t._id.toString(),
        type: t.type,
        amountPaise: t.amountPaise,
        paymentMethod: t.paymentMethod,
        description: t.description,
        notes: t.notes,
        transactionDate: t.transactionDate,
        createdAt: t.createdAt,
      })),
    };
  }

  static async createPerson(userId: string, data: { name: string; phone?: string; email?: string; notes?: string }) {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const person = await Person.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: data.name.trim(),
      phone: data.phone?.trim() || "",
      email: data.email?.trim() || "",
      notes: data.notes?.trim() || "",
    });

    return {
      _id: person._id.toString(),
      name: person.name,
      phone: person.phone,
      email: person.email,
      notes: person.notes,
    };
  }

  static async updatePerson(
    userId: string,
    personId: string,
    data: { name: string; phone?: string; email?: string; notes?: string }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(personId)) throw new Error("Invalid ID format");

    const person = await Person.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(personId), userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          name: data.name.trim(),
          phone: data.phone?.trim() || "",
          email: data.email?.trim() || "",
          notes: data.notes?.trim() || "",
        },
      },
      { new: true }
    ).lean();

    if (!person) throw new Error("Person not found");

    return {
      _id: person._id.toString(),
      name: person.name,
      phone: person.phone,
      email: person.email,
      notes: person.notes,
    };
  }

  static async deletePerson(userId: string, personId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(personId)) throw new Error("Invalid ID format");

    const uId = new mongoose.Types.ObjectId(userId);
    const pId = new mongoose.Types.ObjectId(personId);

    // Safeguard check
    const txCount = await LendingTransaction.countDocuments({ userId: uId, personId: pId });
    if (txCount > 0) {
      // Check if settled
      const aggregates = await LendingTransaction.aggregate([
        { $match: { userId: uId, personId: pId } },
        {
          $group: {
            _id: null,
            totalLent: { $sum: { $cond: [{ $eq: ["$type", "LENT"] }, "$amountPaise", 0] } },
            totalReceived: { $sum: { $cond: [{ $eq: ["$type", "REPAYMENT"] }, "$amountPaise", 0] } },
          },
        },
      ]);
      const balance = (aggregates[0]?.totalLent || 0) - (aggregates[0]?.totalReceived || 0);
      if (balance !== 0) {
        throw new Error("Cannot delete person with an active non-zero outstanding balance.");
      }
      // If balance is 0 but has transactions, also delete associated transactions cleanly
      await LendingTransaction.deleteMany({ userId: uId, personId: pId });
    }

    const res = await Person.deleteOne({ _id: pId, userId: uId });
    if (res.deletedCount === 0) throw new Error("Person not found");
    return { success: true };
  }

  static async addTransaction(
    userId: string,
    data: {
      personId: string;
      type: "LENT" | "REPAYMENT";
      amount: number; // in Rupees
      paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
      description?: string;
      notes?: string;
      transactionDate: string;
    }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(data.personId)) throw new Error("Invalid ID format");

    const uId = new mongoose.Types.ObjectId(userId);
    const pId = new mongoose.Types.ObjectId(data.personId);

    const person = await Person.findOne({ _id: pId, userId: uId });
    if (!person) throw new Error("Person not found");

    const amountPaise = rupeesToPaise(data.amount);
    if (amountPaise <= 0) throw new Error("Amount must be greater than zero");

    // Check outstanding if repayment
    if (data.type === "REPAYMENT") {
      const aggregates = await LendingTransaction.aggregate([
        { $match: { userId: uId, personId: pId } },
        {
          $group: {
            _id: null,
            totalLent: { $sum: { $cond: [{ $eq: ["$type", "LENT"] }, "$amountPaise", 0] } },
            totalReceived: { $sum: { $cond: [{ $eq: ["$type", "REPAYMENT"] }, "$amountPaise", 0] } },
          },
        },
      ]);
      const currentOutstanding = (aggregates[0]?.totalLent || 0) - (aggregates[0]?.totalReceived || 0);
      if (amountPaise > currentOutstanding) {
        throw new Error(
          `Repayment of ₹${(amountPaise / 100).toFixed(2)} exceeds current outstanding balance of ₹${(
            currentOutstanding / 100
          ).toFixed(2)}.`
        );
      }
    }

    const tx = await LendingTransaction.create({
      userId: uId,
      personId: pId,
      type: data.type,
      amountPaise,
      paymentMethod: data.paymentMethod,
      description: data.description?.trim() || "",
      notes: data.notes?.trim() || "",
      transactionDate: new Date(data.transactionDate),
    });

    return {
      _id: tx._id.toString(),
      type: tx.type,
      amountPaise: tx.amountPaise,
      paymentMethod: tx.paymentMethod,
      description: tx.description,
      notes: tx.notes,
      transactionDate: tx.transactionDate,
    };
  }

  static async updateTransaction(
    userId: string,
    transactionId: string,
    data: {
      type: "LENT" | "REPAYMENT";
      amount: number;
      paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
      description?: string;
      notes?: string;
      transactionDate: string;
    }
  ) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(transactionId)) throw new Error("Invalid ID format");

    const uId = new mongoose.Types.ObjectId(userId);
    const txId = new mongoose.Types.ObjectId(transactionId);
    const amountPaise = rupeesToPaise(data.amount);

    const tx = await LendingTransaction.findOneAndUpdate(
      { _id: txId, userId: uId },
      {
        $set: {
          type: data.type,
          amountPaise,
          paymentMethod: data.paymentMethod,
          description: data.description?.trim() || "",
          notes: data.notes?.trim() || "",
          transactionDate: new Date(data.transactionDate),
        },
      },
      { new: true }
    ).lean();

    if (!tx) throw new Error("Transaction not found");
    return {
      _id: tx._id.toString(),
      type: tx.type,
      amountPaise: tx.amountPaise,
      paymentMethod: tx.paymentMethod,
      description: tx.description,
      notes: tx.notes,
      transactionDate: tx.transactionDate,
    };
  }

  static async deleteTransaction(userId: string, transactionId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId) || !isValidObjectId(transactionId)) throw new Error("Invalid ID format");

    const res = await LendingTransaction.deleteOne({
      _id: new mongoose.Types.ObjectId(transactionId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (res.deletedCount === 0) throw new Error("Transaction not found");
    return { success: true };
  }

  static async getLendingDashboardSummary(userId: string) {
    await connectToDatabase();
    if (!isValidObjectId(userId)) throw new Error("Invalid User ID");

    const uId = new mongoose.Types.ObjectId(userId);
    const people = await this.getPeopleWithBalances(userId);

    let totalLentPaise = 0;
    let totalReceivedPaise = 0;
    let totalPendingPaise = 0;
    let pendingPeopleCount = 0;

    for (const p of people) {
      totalLentPaise += p.totalLentPaise;
      totalReceivedPaise += p.totalReceivedPaise;
      if (p.outstandingPaise > 0) {
        totalPendingPaise += p.outstandingPaise;
        pendingPeopleCount += 1;
      }
    }

    return {
      totalLentPaise,
      totalReceivedPaise,
      totalPendingPaise,
      peopleCount: people.length,
      pendingPeopleCount,
    };
  }
}

