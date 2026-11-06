import { z } from "zod";

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

// Person schemas
export const personSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  phone: z.string().max(20).optional().default(""),
  email: z.string().email("Invalid email").optional().or(z.literal("")).default(""),
  notes: z.string().max(500).optional().default(""),
});

// Lending Transaction schemas
export const lendingTransactionSchema = z.object({
  personId: z.string().min(1, "Person is required"),
  type: z.enum(["LENT", "REPAYMENT"]),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "OTHER"]).default("UPI"),
  description: z.string().max(200).optional().default(""),
  notes: z.string().max(500).optional().default(""),
  transactionDate: z.string().min(1, "Transaction date is required"),
});

// Expense schemas
export const expenseSchema = z.object({
  title: z.string().min(1, "Title is required").max(100).trim(),
  amount: z.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "DEBIT_CARD", "CREDIT_CARD"]),
  creditCardId: z.string().optional().nullable(),
  transactionDate: z.string().min(1, "Date is required"),
  notes: z.string().max(500).optional().default(""),
});

// Category schema
export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50).trim(),
  icon: z.string().optional().default("Tag"),
  color: z.string().optional().default("#6366f1"),
});

// Credit Card schemas
export const creditCardSchema = z.object({
  cardName: z.string().min(1, "Card name is required").max(60).trim(),
  bankName: z.string().min(1, "Bank name is required").max(60).trim(),
  creditLimit: z.number().positive("Credit limit must be greater than 0"),
  statementDay: z.number().int().min(1).max(31, "Statement day must be between 1 and 31"),
  dueDay: z.number().int().min(1).max(31, "Due day must be between 1 and 31"),
  openingOutstanding: z.number().min(0, "Opening outstanding cannot be negative").default(0),
  lastFourDigits: z
    .string()
    .length(4, "Must be exactly 4 digits")
    .regex(/^\d{4}$/, "Must contain digits only")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500).optional().default(""),
  color: z.string().optional().default("#1e293b"),
});

export const creditCardPaymentSchema = z.object({
  creditCardId: z.string().min(1, "Credit card is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentSource: z.enum(["CASH", "BANK_ACCOUNT", "UPI", "OTHER"]).default("BANK_ACCOUNT"),
  notes: z.string().max(500).optional().default(""),
});

// Budget schemas
export const budgetSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(100).trim(),
  amount: z.number().positive("Budget amount must be greater than 0"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  categoryId: z.string().optional().nullable(),
});

