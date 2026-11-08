"use client";

import React, { useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface AIMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function AIMessageInput({
  value,
  onChange,
  onSend,
  loading,
  disabled = false,
}: AIMessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height up to 120px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="relative border-t border-slate-100 bg-white p-3 sm:p-4">
      <div className="flex items-end gap-2 bg-slate-50 border border-slate-200/90 rounded-2xl px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or record an expense..."
          rows={1}
          disabled={loading || disabled}
          className="flex-1 max-h-[120px] resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden leading-relaxed py-1"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || loading || disabled}
          className="shrink-0 h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
          title="Send message (Enter)"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
        <span>Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">Shift+Enter</kbd> for newline</span>
        <span className="font-medium text-slate-400">1-hr ephemeral memory</span>
      </div>
    </div>
  );
}

