"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CreditCard,
  Receipt,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Plus,
  AlertCircle,
  Clock,
  ChevronRight,
  PieChart as PieIcon,
} from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate, formatRelativeTime } from "@/lib/utils/date";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface DashboardData {
  summary: {
    totalReceivablePaise: number;
    totalCreditCardOutstandingPaise: number;
    totalExpensesThisMonthPaise: number;
    remainingMonthlyBudgetPaise: number;
    monthlyBudgetTotalPaise: number;
    netPositionPaise: number;
  };
  categoryBreakdown: {
    name: string;
    amountPaise: number;
    color: string;
    icon: string;
    count: number;
  }[];
  recentActivity: {
    id: string;
    type: "LENT" | "REPAYMENT" | "EXPENSE" | "CC_PAYMENT";
    title: string;
    subtitle: string;
    amountPaise: number;
    date: string;
    method?: string;
    categoryOrBank?: string;
    direction: "INCOMING" | "OUTGOING" | "NEUTRAL";
  }[];
  cardsCount: number;
  peopleCount: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse py-4">
        <div className="h-28 rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 rounded-2xl bg-slate-200" />
          <div className="h-32 rounded-2xl bg-slate-200" />
          <div className="h-32 rounded-2xl bg-slate-200" />
          <div className="h-32 rounded-2xl bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-2xl bg-slate-200" />
          <div className="h-72 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Unable to load dashboard</h2>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <Button onClick={fetchDashboard} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const { summary, categoryBreakdown, recentActivity } = data;

  const chartData = categoryBreakdown.map((c) => ({
    name: c.name,
    value: c.amountPaise / 100,
    color: c.color,
  }));

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Overall Financial Position Banner (SRS 7.3) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md">
              <Wallet className="w-3.5 h-3.5" />
              <span>Partial Net Position</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white pt-1">
              {formatINR(summary.netPositionPaise)}
            </div>
            <p className="text-xs text-slate-300 max-w-md pt-1">
              Calculated as Money People Owe You ({formatINR(summary.totalReceivablePaise)}) minus Credit Card
              Liabilities ({formatINR(summary.totalCreditCardOutstandingPaise)}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/expenses">
              <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 shadow-none">
                <Plus className="w-4 h-4 mr-1 text-indigo-600" />
                Add Expense
              </Button>
            </Link>
            <Link href="/lending">
              <Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                <Users className="w-4 h-4 mr-1 text-indigo-300" />
                Lend Money
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </motion.div>

      {/* 2. Four Financial Summary Cards (SRS 7.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Money people owe you */}
        <Link href="/lending">
          <Card className="hover:border-indigo-300 transition group cursor-pointer h-full">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Money Owed To You</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{formatINR(summary.totalReceivablePaise)}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Receivable pending amount</span>
            </p>
          </Card>
        </Link>

        {/* Card 2: Credit Card Outstanding */}
        <Link href="/cards">
          <Card className="hover:border-rose-300 transition group cursor-pointer h-full">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Credit Card Dues</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600">
              {formatINR(summary.totalCreditCardOutstandingPaise)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Total outstanding liabilities</span>
            </p>
          </Card>
        </Link>

        {/* Card 3: Monthly Expenses */}
        <Link href="/expenses">
          <Card className="hover:border-indigo-300 transition group cursor-pointer h-full">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Spent This Month</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {formatINR(summary.totalExpensesThisMonthPaise)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Current month personal expenses</span>
            </p>
          </Card>
        </Link>

        {/* Card 4: Remaining Monthly Budget */}
        <Link href="/budgets">
          <Card className="hover:border-amber-300 transition group cursor-pointer h-full">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Remaining Budget</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div
              className={`text-2xl font-black ${
                summary.remainingMonthlyBudgetPaise < 0 ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {summary.monthlyBudgetTotalPaise > 0
                ? formatINR(summary.remainingMonthlyBudgetPaise)
                : "Not Set"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary.monthlyBudgetTotalPaise > 0
                ? `Budget: ${formatINR(summary.monthlyBudgetTotalPaise)}`
                : "Tap to set monthly budget"}
            </p>
          </Card>
        </Link>
      </div>

      {/* 3. Middle Section: Charts & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Category Spending</CardTitle>
              <CardDescription>Monthly expense distribution by category</CardDescription>
            </div>
            <Link href="/expenses" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center">
              View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No expenses recorded for this month yet.</p>
                <Link href="/expenses" className="inline-block mt-3">
                  <Button size="sm" variant="outline">
                    Record Expense
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Spent"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2">
                  {categoryBreakdown.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-slate-700">{cat.name}</span>
                        <span className="text-slate-400">({cat.count})</span>
                      </div>
                      <span className="font-bold text-slate-900">{formatINR(cat.amountPaise)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Summary / Status */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Overview Status</CardTitle>
            <CardDescription>Accounts & ledgers summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Lending Ledger</div>
                  <div className="text-xs text-slate-500">{data.peopleCount} people registered</div>
                </div>
              </div>
              <Link href="/lending">
                <Button size="sm" variant="ghost">
                  Open
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Credit Cards</div>
                  <div className="text-xs text-slate-500">{data.cardsCount} cards tracked</div>
                </div>
              </div>
              <Link href="/cards">
                <Button size="sm" variant="ghost">
                  Open
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <PieIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Budget Alerts</div>
                  <div className="text-xs text-slate-500">Monthly limits & alerts</div>
                </div>
              </div>
              <Link href="/budgets">
                <Button size="sm" variant="ghost">
                  Manage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Recent Activity Feed (SRS 7.2) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Consolidated chronological transaction stream</CardDescription>
          </div>
          <span className="text-xs text-slate-400 font-medium">Last 10 transactions</span>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((act) => {
                let badgeVariant: "success" | "danger" | "info" | "neutral" = "neutral";
                let sign = "";
                let amountColor = "text-slate-900";

                if (act.direction === "INCOMING") {
                  badgeVariant = "success";
                  sign = "+";
                  amountColor = "text-emerald-600";
                } else if (act.direction === "OUTGOING") {
                  badgeVariant = "danger";
                  sign = "-";
                  amountColor = "text-rose-600";
                } else {
                  badgeVariant = "info";
                  amountColor = "text-indigo-600";
                }

                return (
                  <div key={act.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ${
                          act.type === "LENT"
                            ? "bg-amber-100 text-amber-700"
                            : act.type === "REPAYMENT"
                            ? "bg-emerald-100 text-emerald-700"
                            : act.type === "CC_PAYMENT"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {act.type === "LENT" ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : act.type === "REPAYMENT" ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : act.type === "CC_PAYMENT" ? (
                          <CreditCard className="h-5 w-5" />
                        ) : (
                          <Receipt className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">{act.title}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{formatISTDate(act.date)}</span>
                          <span>•</span>
                          <span className="capitalize">{act.method || act.subtitle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-black text-sm ${amountColor}`}>
                        {sign}
                        {formatINR(act.amountPaise)}
                      </div>
                      <Badge variant={badgeVariant} className="text-[10px] uppercase font-bold tracking-wider mt-0.5">
                        {act.type.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

