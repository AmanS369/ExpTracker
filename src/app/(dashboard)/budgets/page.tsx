"use client";

import React, { useEffect, useState } from "react";
import {
  PieChart as PieIcon,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface CategoryBudget {
  _id?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  budgetAmountPaise: number;
  spentAmountPaise: number;
  remainingPaise: number;
  percentageUsed: number;
  alertLevel: "NORMAL" | "WARNING_70" | "DANGER_90" | "EXCEEDED_100";
}

interface BudgetOverview {
  month: number;
  year: number;
  totalBudgetPaise: number;
  totalSpentPaise: number;
  remainingPaise: number;
  percentageUsed: number;
  alertLevel: "NORMAL" | "WARNING_70" | "DANGER_90" | "EXCEEDED_100";
  categoryBudgets: CategoryBudget[];
}

interface CategoryOption {
  _id: string;
  name: string;
}

export default function BudgetsPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    categoryId: "", // empty = overall monthly budget
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/budgets?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to load budget overview");
      const json = await res.json();
      setOverview(json);
    } catch (err: any) {
      setError(err.message || "Failed to load budget");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || (form.categoryId ? "Category Budget" : "Overall Monthly Budget"),
          amount: parseFloat(form.amount),
          month: selectedMonth,
          year: selectedYear,
          categoryId: form.categoryId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save budget");

      setIsModalOpen(false);
      setForm({ name: "", amount: "", categoryId: "" });
      fetchOverview();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm("Are you sure you want to remove this category budget?")) return;
    try {
      const res = await fetch(`/api/budgets/${budgetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete budget");
      fetchOverview();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openSetOverall = () => {
    setForm({
      name: "Monthly Overall Budget",
      amount: overview?.totalBudgetPaise ? (overview.totalBudgetPaise / 100).toString() : "",
      categoryId: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openSetCategoryBudget = () => {
    setForm({
      name: "",
      amount: "",
      categoryId: categories[0]?._id || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Budgets</h1>
          <p className="text-xs text-slate-500">Monitor spending limits and get consumption alerts.</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-bold text-slate-800 min-w-[130px] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={openSetOverall} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Set Budget
          </Button>
        </div>
      </div>

      {/* Main Budget Progress Card (SRS 5.3 & 5.4) */}
      {overview && (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Monthly Budget
                </span>
                {overview.alertLevel === "EXCEEDED_100" && (
                  <Badge variant="danger" className="text-[10px]">
                    100% Exceeded!
                  </Badge>
                )}
                {overview.alertLevel === "DANGER_90" && (
                  <Badge variant="warning" className="text-[10px]">
                    90% Warning
                  </Badge>
                )}
                {overview.alertLevel === "WARNING_70" && (
                  <Badge variant="info" className="text-[10px]">
                    70% Consumed
                  </Badge>
                )}
              </div>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {overview.totalBudgetPaise > 0 ? formatINR(overview.totalBudgetPaise) : "No Budget Configured"}
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-xs font-medium text-slate-400">Spent So Far</span>
                <div className="text-xl font-black text-slate-900">{formatINR(overview.totalSpentPaise)}</div>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Remaining</span>
                <div
                  className={`text-xl font-black ${
                    overview.remainingPaise < 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {formatINR(overview.remainingPaise)}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar & Alert Banner */}
          <div className="pt-6 space-y-3">
            <ProgressBar value={overview.percentageUsed} max={100} showLabel />

            {/* Visual Alert Notice (SRS 5.4) */}
            {overview.alertLevel === "EXCEEDED_100" && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 flex items-center gap-3 text-xs text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>
                  <strong>Budget Limit Exceeded:</strong> You have consumed {overview.percentageUsed}% of your
                  budget for {monthNames[selectedMonth - 1]}. Consider reviewing discretionary expenses.
                </span>
              </div>
            )}

            {overview.alertLevel === "DANGER_90" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 flex items-center gap-3 text-xs text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  <strong>90% Threshold Warning:</strong> You have consumed {overview.percentageUsed}% of your
                  monthly budget with {formatINR(overview.remainingPaise)} remaining.
                </span>
              </div>
            )}

            {overview.alertLevel === "WARNING_70" && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3.5 flex items-center gap-3 text-xs text-indigo-800">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>
                  <strong>70% Consumed:</strong> You have reached {overview.percentageUsed}% of your planned
                  spending for this month.
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Category-Specific Budgets (SRS 5.2) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Category Budgets</h2>
            <p className="text-xs text-slate-500">Track limits for specific expenditure categories.</p>
          </div>
          <Button onClick={openSetCategoryBudget} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1 text-indigo-600" />
            Add Category Budget
          </Button>
        </div>

        {overview?.categoryBudgets.length === 0 ? (
          <div className="text-center py-12 rounded-3xl border border-dashed border-slate-200 bg-white">
            <PieIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No category budgets set for this month</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Set targeted budgets for Food, Shopping, Travel, etc. to monitor specific categories.
            </p>
            <Button onClick={openSetCategoryBudget} size="sm" variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-1" />
              Set First Category Budget
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview?.categoryBudgets.map((cb) => (
              <Card key={cb.categoryId} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                        style={{ backgroundColor: cb.categoryColor || "#6366f1" }}
                      >
                        {cb.categoryName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{cb.categoryName}</div>
                        <div className="text-xs text-slate-400">
                          Budget: {formatINR(cb.budgetAmountPaise)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          cb.alertLevel === "EXCEEDED_100"
                            ? "danger"
                            : cb.alertLevel === "DANGER_90"
                            ? "warning"
                            : cb.alertLevel === "WARNING_70"
                            ? "info"
                            : "success"
                        }
                        className="text-[10px]"
                      >
                        {cb.percentageUsed}%
                      </Badge>
                      {cb._id && (
                        <button
                          onClick={() => handleDeleteBudget(cb._id!)}
                          className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <ProgressBar value={cb.percentageUsed} max={100} className="my-2" />
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 text-slate-500">
                  <span>Spent: <strong className="text-slate-800">{formatINR(cb.spentAmountPaise)}</strong></span>
                  <span>
                    Remaining:{" "}
                    <strong className={cb.remainingPaise < 0 ? "text-rose-600" : "text-emerald-600"}>
                      {formatINR(cb.remainingPaise)}
                    </strong>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Set Budget */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.categoryId ? "Category Budget" : "Overall Monthly Budget"}
        description={`Set planned spending for ${monthNames[selectedMonth - 1]} ${selectedYear}.`}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <Select
            label="Budget Scope *"
            value={form.categoryId}
            onChange={(e) => {
              const val = e.target.value;
              setForm({
                ...form,
                categoryId: val,
                name: val
                  ? `${categories.find((c) => c._id === val)?.name || "Category"} Budget`
                  : "Overall Monthly Budget",
              });
            }}
          >
            <option value="">Overall Monthly Budget (All Expenses)</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                Category: {c.name}
              </option>
            ))}
          </Select>

          <Input
            label="Budget Name *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            label="Budget Limit Amount (₹) *"
            type="number"
            min="1"
            required
            placeholder="e.g. 25000"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

