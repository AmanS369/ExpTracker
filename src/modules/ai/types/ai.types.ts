export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface LLMMessage {
  role: MessageRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMRequest {
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: LLMToolCall[];
  finishReason?: string;
}

export interface UserAIContext {
  userId: string;
  userName: string;
  preferredCurrency: "INR";
  timezone: "Asia/Kolkata";
  currentDateIST: string;
  currentMonth: {
    monthNumber: number;
    year: number;
    totalExpensesPaise: number;
    remainingBudgetPaise: number;
    totalReceivablePaise: number;
    creditCardOutstandingPaise: number;
    netPositionPaise: number;
  };
  cardsCount: number;
  peopleCount: number;
}

export type ScopeClassification =
  | "FINANCE_QUERY"
  | "FINANCE_WRITE"
  | "FINANCE_CLARIFICATION"
  | "OUT_OF_SCOPE"
  | "UNSAFE_REQUEST";

