"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Bot, User as UserIcon, Check, X, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface PendingActionData {
  id: string;
  actionType: string;
  summaryText: string;
  arguments: Record<string, any>;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  expiresAt?: string;
}

export interface ClientChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pendingAction?: PendingActionData | null;
  createdAt?: string;
}

interface AIMessageListProps {
  messages: ClientChatMessage[];
  loading: boolean;
  error?: string | null;
  actionProcessingId?: string | null;
  onConfirmAction: (actionId: string, confirmed: boolean) => Promise<void>;
  onSelectPrompt: (promptText: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const EXAMPLE_PROMPTS = [
  "How much did I spend this month?",
  "What is my credit card outstanding?",
  "Who owes me money?",
  "Add an expense of ₹350 for groceries",
  "How much budget do I have left?",
  "Which card payment is due next?",
];

export function AIMessageList({
  messages,
  loading,
  error,
  actionProcessingId,
  onConfirmAction,
  onSelectPrompt,
  messagesEndRef,
}: AIMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center text-center">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-base font-bold text-slate-900 tracking-tight">
          Financial Assistant
        </h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1 mb-5">
          Ask questions about your finances, analyze spending, or record new transactions. Context expires 1 hour after inactivity.
        </p>

        <div className="w-full max-w-xs space-y-2 text-left">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Suggested Prompts
          </div>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="w-full text-left text-xs text-slate-700 bg-slate-50/80 hover:bg-indigo-50/80 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/80 rounded-xl px-3 py-2 transition flex items-center justify-between group cursor-pointer"
            >
              <span className="truncate">{prompt}</span>
              <span className="text-slate-400 group-hover:text-indigo-600 ml-2">→</span>
            </button>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => {
        const isUser = msg.role === "user";

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`h-7 w-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                isUser
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-100"
              }`}
            >
              {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[85%] space-y-2`}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-xs"
                    : "bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-xs"
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-xs max-w-none text-slate-800 dark:prose-invert">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => (
                          <strong className="font-bold text-slate-900">{children}</strong>
                        ),
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-xs">{children}</li>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Action Confirmation Card (SRS Security 9.2) */}
              {msg.pendingAction && (
                <div className="p-3.5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-violet-50/70 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                    <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                      Authorization Required
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-800 bg-white/80 p-2.5 rounded-xl border border-indigo-100/80">
                    {msg.pendingAction.summaryText}
                  </p>

                  {msg.pendingAction.status === "PENDING" ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={actionProcessingId === msg.pendingAction.id}
                        onClick={() => onConfirmAction(msg.pendingAction!.id, true)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-xs cursor-pointer"
                      >
                        {actionProcessingId === msg.pendingAction.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        <span>Confirm</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionProcessingId === msg.pendingAction.id}
                        onClick={() => onConfirmAction(msg.pendingAction!.id, false)}
                        className="text-xs h-8 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        <span>Cancel</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {msg.pendingAction.status === "CONFIRMED" ? (
                        <span className="text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                          ✓ Confirmed & Executed
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-lg">
                          Cancelled
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing / Loading Indicator */}
      {loading && (
        <div className="flex items-start gap-2.5">
          <div className="h-7 w-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
            <span className="text-xs text-slate-500 ml-1 font-medium">Checking ledger...</span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to process request</p>
            <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

