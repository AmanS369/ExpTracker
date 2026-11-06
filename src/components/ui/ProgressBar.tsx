"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface ProgressBarProps {
  value: number; // percentage (0 - 100+)
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, className, showLabel = false }: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const rawPercentage = Math.round((value / max) * 100);

  // Dynamic color depending on budget alert threshold
  let color = "bg-emerald-500";
  if (rawPercentage >= 100) {
    color = "bg-rose-500";
  } else if (rawPercentage >= 90) {
    color = "bg-amber-500";
  } else if (rawPercentage >= 70) {
    color = "bg-indigo-500";
  }

  return (
    <div className={cn("w-full space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>{rawPercentage}% consumed</span>
          <span>{rawPercentage >= 100 ? "Limit Exceeded" : `${100 - rawPercentage}% remaining`}</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full transition-colors", color)}
        />
      </div>
    </div>
  );
}

