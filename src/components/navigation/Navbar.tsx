"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  PieChart,
  LogOut,
  User,
  Wallet,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface NavbarProps {
  user?: { name: string; email: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/lending", label: "Lending", icon: Users },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/cards", label: "Cards", icon: CreditCard },
    { href: "/budgets", label: "Budgets", icon: PieChart },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-slate-900">Expenser</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
                ₹ INR
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Money & Ledger Manager</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="max-w-[120px] truncate hidden sm:inline">{user?.name || "My Account"}</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Logout"
            className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

