"use client";

import React, { useState } from "react";
import { Sparkles, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AIMessageList, ClientChatMessage } from "./AIMessageList";
import { AIMessageInput } from "./AIMessageInput";

interface AIChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ClientChatMessage[];
  loading: boolean;
  error?: string | null;
  expiresAt?: string | null;
  actionProcessingId?: string | null;
  onSendMessage: (text: string) => Promise<void>;
  onConfirmAction: (actionId: string, confirmed: boolean) => Promise<void>;
  onClearSession: () => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function AIChatOverlay({
  isOpen,
  onClose,
  messages,
  loading,
  error,
  expiresAt,
  actionProcessingId,
  onSendMessage,
  onConfirmAction,
  onClearSession,
  messagesEndRef,
}: AIChatOverlayProps) {
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim() || loading) return;
    const text = inputText.trim();
    setInputText("");
    onSendMessage(text);
  };

  const handleSelectPrompt = (promptText: string) => {
    setInputText("");
    onSendMessage(promptText);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-x-2 bottom-2 top-14 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[620px] z-50 flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden"
        >
          {/* Header */}
          <div className="h-14 border-b border-slate-100 bg-white/95 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-tight">
                    Financial Assistant
                  </h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Personal Finance AI</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={onClearSession}
                  title="Start fresh conversation"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                title="Minimize assistant"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <AIMessageList
            messages={messages}
            loading={loading}
            error={error}
            actionProcessingId={actionProcessingId}
            onConfirmAction={onConfirmAction}
            onSelectPrompt={handleSelectPrompt}
            messagesEndRef={messagesEndRef}
          />

          {/* Input Footer */}
          <AIMessageInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            loading={loading}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

