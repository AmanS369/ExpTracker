import { LLMToolDefinition } from "../types/ai.types";

export const lendingToolDefinitions: LLMToolDefinition[] = [
  {
    name: "get_lending_summary",
    description: "Retrieve overall lending summary: total money lent, total received, total pending receivables, and active debtor count.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_person_balance",
    description: "Retrieve a specific person's total lent, total received, and current outstanding balance.",
    parameters: {
      type: "object",
      properties: {
        personName: { type: "string", description: "Name of the person" },
      },
      required: ["personName"],
    },
  },
  {
    name: "get_all_debtors",
    description: "Retrieve a list of all people who currently owe money to the user with their pending balances.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_lending_history",
    description: "Retrieve lending/repayment transaction history for a person or all contacts.",
    parameters: {
      type: "object",
      properties: {
        personName: { type: ["string", "null"], description: "Optional name of the person" },
        limit: { type: ["number", "null"], description: "Number of transactions to fetch (default: 10)" },
      },
    },
  },
  {
    name: "create_lending",
    description: "Record money lent to someone. Generates a pending action requiring confirmation.",
    parameters: {
      type: "object",
      properties: {
        personName: { type: "string", description: "Name of the person borrowing money" },
        amount: { type: "number", description: "Amount lent in ₹" },
        paymentMethod: {
          type: ["string", "null"],
          enum: ["CASH", "UPI", "BANK_TRANSFER", "OTHER", null],
          description: "Payment method used (default: UPI)",
        },
        description: { type: ["string", "null"], description: "Reason or description for lending" },
        date: { type: ["string", "null"], description: "Date in YYYY-MM-DD format (defaults to today)" },
      },
      required: ["personName", "amount"],
    },
  },
  {
    name: "record_repayment",
    description: "Record a repayment received from someone. Generates a pending action requiring confirmation.",
    parameters: {
      type: "object",
      properties: {
        personName: { type: "string", description: "Name of the person returning money" },
        amount: { type: "number", description: "Repayment amount received in ₹" },
        paymentMethod: {
          type: ["string", "null"],
          enum: ["CASH", "UPI", "BANK_TRANSFER", "OTHER", null],
          description: "Payment method received in (default: UPI)",
        },
        description: { type: ["string", "null"], description: "Description or notes" },
        date: { type: ["string", "null"], description: "Date in YYYY-MM-DD format (defaults to today)" },
      },
      required: ["personName", "amount"],
    },
  },
];
