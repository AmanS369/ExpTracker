import { LLMToolDefinition } from "../types/ai.types";

export const expenseToolDefinitions: LLMToolDefinition[] = [
  {
    name: "get_expense_summary",
    description: "Retrieve expense summary and total spending for a month or date range.",
    parameters: {
      type: "object",
      properties: {
        month: { type: ["number", "null"], description: "Optional month number (1-12). Defaults to current month if omitted." },
        year: { type: ["number", "null"], description: "Optional year (e.g. 2026). Defaults to current year if omitted." },
        startDate: { type: ["string", "null"], description: "Optional start date in YYYY-MM-DD format" },
        endDate: { type: ["string", "null"], description: "Optional end date in YYYY-MM-DD format" },
      },
    },
  },
  {
    name: "get_expenses_by_category",
    description: "Retrieve spending broken down by category for a month or date range.",
    parameters: {
      type: "object",
      properties: {
        month: { type: ["number", "null"], description: "Optional month number (1-12). Defaults to current month if omitted." },
        year: { type: ["number", "null"], description: "Optional year (e.g. 2026). Defaults to current year if omitted." },
      },
    },
  },
  {
    name: "get_recent_expenses",
    description: "Retrieve the most recent expenses recorded by the user.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: ["number", "null"], description: "Number of expenses to fetch (default: 5, max: 20)" },
        categoryId: { type: ["string", "null"], description: "Optional category ID filter" },
      },
    },
  },
  {
    name: "create_expense",
    description: "Record a new expense. Generates a pending action that requires user confirmation.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title or item of the expense (e.g. 'Groceries', 'Coffee')" },
        amount: { type: "number", description: "Amount in Indian Rupees (₹)" },
        categoryName: { type: ["string", "null"], description: "Category name (e.g. 'Food & Dining', 'Groceries', 'Travel')" },
        paymentMethod: {
          type: ["string", "null"],
          enum: ["CASH", "UPI", "BANK_TRANSFER", "DEBIT_CARD", "CREDIT_CARD", null],
          description: "Payment method used (default: UPI)",
        },
        creditCardName: { type: ["string", "null"], description: "Name of credit card if paymentMethod is CREDIT_CARD" },
        date: { type: ["string", "null"], description: "Date in YYYY-MM-DD format. Defaults to today." },
        notes: { type: ["string", "null"], description: "Optional notes" },
      },
      required: ["title", "amount"],
    },
  },
  {
    name: "update_expense",
    description: "Update an existing expense. Generates a pending action requiring confirmation.",
    parameters: {
      type: "object",
      properties: {
        expenseId: { type: "string", description: "ID of the expense to update" },
        title: { type: ["string", "null"], description: "New title" },
        amount: { type: ["number", "null"], description: "New amount in ₹" },
        categoryName: { type: ["string", "null"], description: "New category name" },
        paymentMethod: {
          type: ["string", "null"],
          enum: ["CASH", "UPI", "BANK_TRANSFER", "DEBIT_CARD", "CREDIT_CARD", null],
        },
      },
      required: ["expenseId"],
    },
  },
  {
    name: "delete_expense",
    description: "Delete an expense. Generates a pending action requiring confirmation.",
    parameters: {
      type: "object",
      properties: {
        expenseId: { type: "string", description: "ID of the expense to delete" },
      },
      required: ["expenseId"],
    },
  },
];
