"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface FloatingAIButtonProps {
  isOpen: boolean;
  hasActiveSession?: boolean;
  onClick: () => void;
}

export function FloatingAIButton({
  isOpen,
  hasActiveSession = false,
  onClick,
}: FloatingAIButtonProps) {
  if (isOpen) return null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Open AI Financial Assistant"
      title="Ask AI Financial Assistant"
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 text-white px-4 py-3.5 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 border border-white/20 backdrop-blur-xs transition duration-200 group cursor-pointer"
    >
      <div className="relative">
        <Sparkles className="w-5 h-5 text-white animate-pulse" />
        {hasActiveSession && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-indigo-700" />
        )}
      </div>

      <span className="text-xs font-bold tracking-tight hidden sm:inline-block">
        Ask AI
      </span>
    </motion.button>
  );
}

