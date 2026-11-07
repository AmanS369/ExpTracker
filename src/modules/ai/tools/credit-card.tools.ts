import { LLMToolDefinition } from "../types/ai.types";

export const creditCardToolDefinitions: LLMToolDefinition[] = [
  {
    name: "get_all_credit_cards",
    description: "Retrieve all credit cards with limits, current outstanding balances, available credit, and due dates.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_card_outstanding",
    description: "Retrieve outstanding balance and details for a specific credit card by name.",
    parameters: {
      type: "object",
      properties: {
        cardName: { type: "string", description: "Name or bank of the credit card" },
      },
      required: ["cardName"],
    },
  },
  {
    name: "get_total_card_debt",
    description: "Retrieve consolidated total credit card debt across all cards.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_upcoming_due_dates",
    description: "Retrieve upcoming credit card bill payment due dates and days left.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_card_expense",
    description: "Record a credit card purchase. Creates an expense and increases card outstanding. Requires user confirmation.",
    parameters: {
      type: "object",
      properties: {
        cardName: { type: "string", description: "Name of the credit card" },
        title: { type: "string", description: "Item or purchase title" },
        amount: { type: "number", description: "Amount in ₹" },
        categoryName: { type: "string", description: "Category of the expense (e.g. Shopping, Food)" },
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        notes: { type: "string", description: "Optional notes" },
      },
      required: ["cardName", "title", "amount"],
    },
  },
  {
    name: "record_card_payment",
    description: "Record a payment made towards a credit card bill. Decreases card liability. Requires user confirmation.",
    parameters: {
      type: "object",
      properties: {
        cardName: { type: "string", description: "Name of the credit card" },
        amount: { type: "number", description: "Payment amount in ₹" },
        paymentSource: {
          type: "string",
          enum: ["BANK_ACCOUNT", "UPI", "CASH", "OTHER"],
          description: "Source used to pay (default: BANK_ACCOUNT)",
        },
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        notes: { type: "string", description: "Optional notes" },
      },
      required: ["cardName", "amount"],
    },
  },
];
