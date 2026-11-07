import { LLMToolDefinition } from "../types/ai.types";

export const budgetToolDefinitions: LLMToolDefinition[] = [
  {
    name: "get_monthly_budget",
    description: "Retrieve monthly overall budget, total spent, remaining balance, and percentage consumed.",
    parameters: {
      type: "object",
      properties: {
        month: { type: "number", description: "Month (1-12)" },
        year: { type: "number", description: "Year (e.g. 2026)" },
      },
    },
  },
  {
    name: "get_budget_summary",
    description: "Retrieve complete budget utilization report including category-level budget statuses and alert levels.",
    parameters: {
      type: "object",
      properties: {
        month: { type: "number", description: "Month (1-12)" },
        year: { type: "number", description: "Year (e.g. 2026)" },
      },
    },
  },
  {
    name: "get_category_budget",
    description: "Retrieve budget and spending for a specific category.",
    parameters: {
      type: "object",
      properties: {
        categoryName: { type: "string", description: "Name of the category" },
        month: { type: "number", description: "Month (1-12)" },
        year: { type: "number", description: "Year (e.g. 2026)" },
      },
      required: ["categoryName"],
    },
  },
  {
    name: "create_budget",
    description: "Create or update a monthly budget or category budget. Generates a pending action requiring user confirmation.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Budget amount in ₹" },
        categoryName: { type: "string", description: "Optional category name (omit for overall monthly budget)" },
        month: { type: "number", description: "Month (1-12)" },
        year: { type: "number", description: "Year (e.g. 2026)" },
      },
      required: ["amount"],
    },
  },
];
