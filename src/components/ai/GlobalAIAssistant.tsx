"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FloatingAIButton } from "./FloatingAIButton";
import { AIChatOverlay } from "./AIChatOverlay";
import { ClientChatMessage } from "./AIMessageList";

export function GlobalAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClientChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);

  // Fetch active session from backend
  const loadActiveSession = async () => {
    try {
      const res = await fetch("/api/ai/session");
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setConversationId(data.conversation.id);
          setExpiresAt(data.conversation.expiresAt);
          setMessages(data.messages || []);
        } else {
          // No active session or expired
          setConversationId(null);
          setExpiresAt(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("[GlobalAIAssistant] Failed to load session:", err);
    }
  };

  // Initial load
  useEffect(() => {
    loadActiveSession();

    // Listen for global custom events to open/toggle assistant from any navigation or page button
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);

    window.addEventListener("toggle-ai-assistant", handleToggle);
    window.addEventListener("open-ai-assistant", handleOpen);

    // If query param ?openAI=true is present, auto-open
    if (searchParams.get("openAI") === "true") {
      setIsOpen(true);
    }

    return () => {
      window.removeEventListener("toggle-ai-assistant", handleToggle);
      window.removeEventListener("open-ai-assistant", handleOpen);
    };
  }, [searchParams]);

  // Reload session when opened to ensure fresh sliding expiry check
  useEffect(() => {
    if (isOpen) {
      loadActiveSession();
    }
  }, [isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setError(null);
    const optimisticId = `user_${Date.now()}`;
    const newMsg: ClientChatMessage = {
      id: optimisticId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with AI Assistant");
      }

      setConversationId(data.conversationId);
      if (data.expiresAt) {
        setExpiresAt(data.expiresAt);
      }

      const assistantMsg: ClientChatMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        content: data.response,
        pendingAction: data.pendingAction || null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("[GlobalAIAssistant] Error sending message:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (actionId: string, confirmed: boolean) => {
    setActionProcessingId(actionId);
    setError(null);

    try {
      const res = await fetch("/api/ai/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, confirmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process confirmation");
      }

      // Update message state locally
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.pendingAction?.id === actionId) {
            return {
              ...msg,
              pendingAction: {
                ...msg.pendingAction,
                status: confirmed ? "CONFIRMED" : "CANCELLED",
              },
            };
          }
          return msg;
        })
      );

      // Refresh active session to capture updated sliding expiry
      await loadActiveSession();
    } catch (err: any) {
      console.error("[GlobalAIAssistant] Confirmation error:", err);
      setError(err.message || "Action confirmation failed.");
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleClearSession = async () => {
    try {
      await fetch("/api/ai/session", { method: "DELETE" });
      setConversationId(null);
      setExpiresAt(null);
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error("[GlobalAIAssistant] Clear session error:", err);
    }
  };

  return (
    <>
      <FloatingAIButton
        isOpen={isOpen}
        hasActiveSession={Boolean(conversationId && messages.length > 0)}
        onClick={() => setIsOpen(true)}
      />

      <AIChatOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        loading={loading}
        error={error}
        expiresAt={expiresAt}
        actionProcessingId={actionProcessingId}
        onSendMessage={handleSendMessage}
        onConfirmAction={handleConfirmAction}
        onClearSession={handleClearSession}
        messagesEndRef={messagesEndRef}
      />
    </>
  );
}

