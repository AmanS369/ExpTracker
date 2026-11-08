"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  MoreHorizontal,
  PieChart,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const primaryItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { isAI: true, label: "AI", icon: Sparkles },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/cards", label: "Cards", icon: CreditCard },
  ];

  const moreItems = [
    { href: "/lending", label: "Money Lending", icon: Users, desc: "Loans & repayments tracker" },
    { href: "/budgets", label: "Monthly Budgets", icon: PieChart, desc: "Monitor limits & alerts" },
    { href: "/settings", label: "Settings", icon: Settings, desc: "Account & preferences" },
  ];

  return (
    <>
      {/* More Menu Drawer */}
      <AnimatePresence>
        {showMore && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 w-full rounded-t-3xl bg-white p-6 shadow-2xl border-t border-slate-100 pb-24"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm">More Options</span>
                <button
                  onClick={() => setShowMore(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid gap-3 pt-4">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl p-3 transition",
                        isActive ? "bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl",
                          isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{item.label}</div>
                        <div className="text-xs text-slate-500">{item.desc}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistent Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-3 py-2 pb-safe">
        <div className="flex items-center justify-around">
          {primaryItems.map((item: any) => {
            const Icon = item.icon;
            if (item.isAI) {
              return (
                <button
                  key="ai-assistant-btn"
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("toggle-ai-assistant"));
                    }
                  }}
                  className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition duration-150 text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  <div className="relative">
                    <Icon className="h-5 w-5 stroke-[2.2] animate-pulse" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-500" />
                  </div>
                  <span className="text-[10px] mt-1 font-bold text-indigo-600">{item.label}</span>
                </button>
              );
            }

            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition duration-150",
                  isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-700"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[1.75]")} />
                <span className={cn("text-[10px] mt-1 font-medium", isActive && "font-bold")}>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition duration-150",
              showMore || pathname === "/budgets" || pathname === "/settings"
                ? "text-indigo-600"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </div>
    </>
  );
}

