"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Bot,
  User as UserIcon,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface PendingAction {
  id: string;
  actionType: string;
  summaryText: string;
  arguments: Record<string, any>;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  pendingAction?: PendingAction | null;
  createdAt: string;
}

const SUGGESTED_PROMPTS = [
  "How much did I spend this month?",
  "What is my total credit card outstanding?",
  "Who owes me money?",
  "Add an expense of ₹500 for groceries",
  "How much budget do I have remaining?",
  "Which credit card payment is due next?",
];

export default function AIAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load user's conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        const convs = data.conversations || [];
        setConversations(convs);
        if (convs.length > 0 && !activeConversationId) {
          setActiveConversationId(convs[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Load messages for active conversation
  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const handleCreateNewConversation = async () => {
    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      });
      if (res.ok) {
        const data = await res.json();
        const newConv = data.conversation;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        setMessages([]);
        if (inputRef.current) inputRef.current.focus();
      }
    } catch (err) {
      console.error("Error creating conversation:", err);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          const remaining = conversations.filter((c) => c.id !== convId);
          setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleClearCurrentMessages = async () => {
    if (!activeConversationId) return;
    if (!confirm("Clear all message history in this conversation?")) return;

    try {
      const res = await fetch(`/api/ai/conversations/${activeConversationId}/messages`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to clear messages:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage("");
    setLoading(true);

    // Optimistic user message
    const tempUserId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: activeConversationId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to receive AI response.");
      }

      // If active conversation wasn't set, set it now
      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
        fetchConversations();
      } else {
        // Reload messages from server to guarantee sync with pending actions
        await fetchMessages(data.conversationId);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${err.message || "Something went wrong while processing your request. Please try again."}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (actionId: string, confirmed: boolean) => {
    setActionProcessingId(actionId);
    try {
      const res = await fetch("/api/ai/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, confirmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process confirmation");

      // Update message status locally and refetch
      if (activeConversationId) {
        await fetchMessages(activeConversationId);
      }
    } catch (err: any) {
      alert(err.message || "Error processing action.");
    } finally {
      setActionProcessingId(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] md:h-[calc(100vh-6.5rem)] rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      {/* 1. Sidebar - Conversation History (Desktop & Mobile Drawer) */}
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-200 ease-in-out shrink-0 border-r border-slate-200/80 bg-slate-50/70 flex flex-col justify-between overflow-hidden`}
      >
        <div className="p-4 flex flex-col h-full">
          {/* New Chat Button */}
          <Button
            onClick={handleCreateNewConversation}
            size="sm"
            className="w-full justify-start gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-none mb-3"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </Button>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1 block">
              Recent Chats
            </span>

            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 px-2 py-4 text-center">No previous conversations</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer transition ${
                    activeConversationId === conv.id
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                    <span className="truncate">{conv.title}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 rounded transition"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Provider Badge */}
          <div className="pt-3 border-t border-slate-200/80 mt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-700">Groq Engine</span>
              </div>
              <Badge variant="success" className="text-[9px] py-0">
                Active
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white min-w-0">
        {/* Top Chat Header */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition"
              title={sidebarOpen ? "Hide conversations" : "Show conversations"}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900 leading-tight">AI Financial Assistant</h2>
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ready • Secured Ledger
                </span>
              </div>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearCurrentMessages}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            /* Welcome Screen (SRS 3.1) */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Hello! I'm your Personal Finance Assistant.
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6 max-w-md">
                Ask me anything about your expenses, money lent to others, credit card dues, or have me record a transaction for you.
              </p>

              {/* Suggested Prompts Grid */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-200 text-xs text-slate-700 transition flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isUser = msg.role === "user";

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                        isUser
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-600" />}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                      <div
                        className={`rounded-2xl p-4 text-sm leading-relaxed ${
                          isUser
                            ? "bg-indigo-600 text-white rounded-tr-none shadow-xs"
                            : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none shadow-xs"
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="markdown-prose prose prose-sm max-w-none text-slate-800 prose-p:leading-relaxed prose-headings:font-bold prose-table:text-xs">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Pending Action Confirmation Card (SRS Section 11) */}
                      {msg.pendingAction && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-amber-600" />
                              Confirmation Required
                            </span>
                            <Badge
                              variant={
                                msg.pendingAction.status === "CONFIRMED"
                                  ? "success"
                                  : msg.pendingAction.status === "CANCELLED"
                                  ? "danger"
                                  : "warning"
                              }
                              className="text-[10px]"
                            >
                              {msg.pendingAction.status}
                            </Badge>
                          </div>

                          <div className="text-xs font-semibold text-slate-800">
                            {msg.pendingAction.summaryText}
                          </div>

                          {msg.pendingAction.status === "PENDING" ? (
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm"
                                onClick={() => handleConfirmAction(msg.pendingAction!.id, true)}
                                isLoading={actionProcessingId === msg.pendingAction.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Confirm & Record
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfirmAction(msg.pendingAction!.id, false)}
                                disabled={actionProcessingId === msg.pendingAction.id}
                                className="text-xs py-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : msg.pendingAction.status === "CONFIRMED" ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Verified & Saved in Financial Ledger</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                              <XCircle className="w-4 h-4" />
                              <span>Action Cancelled</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing / Processing Indicator */}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-slate-50 border border-slate-200/80 px-4 py-3 flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Analyzing financial ledger...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 3. Bottom Message Input */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask a financial question or type an action (e.g. 'Add ₹250 for lunch')..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              isLoading={loading}
              size="md"
              className="h-11 px-4 rounded-2xl shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-1.5">
            Expenser AI verifies all transactions through server guardrails and integer paise precision.
          </p>
        </div>
      </div>
    </div>
  );
}

