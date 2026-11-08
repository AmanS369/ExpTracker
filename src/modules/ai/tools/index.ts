import { LLMToolDefinition } from "../types/ai.types";
import { expenseToolDefinitions } from "./expense.tools";
import { lendingToolDefinitions } from "./lending.tools";
import { creditCardToolDefinitions } from "./credit-card.tools";
import { budgetToolDefinitions } from "./budget.tools";

export const allAITools: LLMToolDefinition[] = [
  ...expenseToolDefinitions,
  ...lendingToolDefinitions,
  ...creditCardToolDefinitions,
  ...budgetToolDefinitions,
];

export function getToolDefinition(name: string): LLMToolDefinition | undefined {
  return allAITools.find((t) => t.name === name);
}

export * from "./expense.tools";
export * from "./lending.tools";
export * from "./credit-card.tools";
export * from "./budget.tools";

