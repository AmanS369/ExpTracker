"use client";

import React, { useEffect, useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard as CCIcon,
  Trash2,
  Edit2,
  AlertCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate } from "@/lib/utils/date";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface CategoryItem {
  _id: string;
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
}

interface CreditCardOption {
  _id: string;
  cardName: string;
  bankName: string;
  lastFourDigits?: string;
  color?: string;
}

interface ExpenseItem {
  _id: string;
  title: string;
  amountPaise: number;
  paymentMethod: string;
  transactionDate: string;
  notes?: string;
  category: {
    _id: string;
    name: string;
    icon?: string;
    color?: string;
  } | null;
  creditCard: {
    _id: string;
    cardName: string;
    bankName: string;
    lastFourDigits?: string;
    color?: string;
  } | null;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [cards, setCards] = useState<CreditCardOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    categoryId: "",
    paymentMethod: "UPI" as "CASH" | "UPI" | "BANK_TRANSFER" | "DEBIT_CARD" | "CREDIT_CARD",
    creditCardId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [customCatForm, setCustomCatForm] = useState({ name: "", color: "#6366f1" });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCategoriesAndCards = async () => {
    try {
      const [catRes, cardRes] = await Promise.all([fetch("/api/categories"), fetch("/api/cards")]);
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
      if (cardRes.ok) {
        const cardData = await cardRes.json();
        setCards(cardData.cards || []);
      }
    } catch (e) {
      console.error("Failed to load options", e);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory) params.set("categoryId", selectedCategory);
      if (selectedMethod) params.set("paymentMethod", selectedMethod);
      if (selectedCard) params.set("creditCardId", selectedCard);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("sort", sort);
      params.set("page", page.toString());
      params.set("limit", "25");

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load expenses");
      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriesAndCards();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [search, selectedCategory, selectedMethod, selectedCard, startDate, endDate, sort, page]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const endpoint = editingExpenseId ? `/api/expenses/${editingExpenseId}` : "/api/expenses";
      const method = editingExpenseId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
          creditCardId: expenseForm.paymentMethod === "CREDIT_CARD" ? expenseForm.creditCardId : null,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save expense");

      setIsAddExpenseOpen(false);
      setEditingExpenseId(null);
      resetExpenseForm();
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense? Any linked credit card balance will be updated.")) {
      return;
    }
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense");
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customCatForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");

      setIsCategoryModalOpen(false);
      setCustomCatForm({ name: "", color: "#6366f1" });
      await fetchCategoriesAndCards();
      setExpenseForm((prev) => ({ ...prev, categoryId: data.category._id }));
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      title: "",
      amount: "",
      categoryId: categories[0]?._id || "",
      paymentMethod: "UPI",
      creditCardId: cards[0]?._id || "",
      transactionDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const openAddModal = () => {
    setEditingExpenseId(null);
    resetExpenseForm();
    setFormError("");
    setIsAddExpenseOpen(true);
  };

  const openEditModal = (exp: ExpenseItem) => {
    setEditingExpenseId(exp._id);
    setExpenseForm({
      title: exp.title,
      amount: (exp.amountPaise / 100).toString(),
      categoryId: exp.category?._id || "",
      paymentMethod: exp.paymentMethod as any,
      creditCardId: exp.creditCard?._id || "",
      transactionDate: new Date(exp.transactionDate).toISOString().split("T")[0],
      notes: exp.notes || "",
    });
    setFormError("");
    setIsAddExpenseOpen(true);
  };

  const totalFilteredPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Expenses</h1>
          <p className="text-xs text-slate-500">Track and manage your daily personal expenditures.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setFormError("");
              setIsCategoryModalOpen(true);
            }}
            variant="outline"
            size="sm"
          >
            <Tag className="w-4 h-4 mr-1 text-indigo-600" />
            New Category
          </Button>
          <Button onClick={openAddModal} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>

          <select
            value={selectedCard}
            onChange={(e) => setSelectedCard(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Credit Cards</option>
            {cards.map((c) => (
              <option key={c._id} value={c._id}>
                {c.cardName} ({c.bankName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
            />
            {(startDate || endDate || selectedCategory || selectedMethod || selectedCard || search) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSelectedCategory("");
                  setSelectedMethod("");
                  setSelectedCard("");
                  setSearch("");
                }}
                className="text-xs font-semibold text-rose-600 hover:underline ml-2"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-600">
              Total Listed: <strong className="text-slate-900">{formatINR(totalFilteredPaise)}</strong>
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Expense List */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-16 rounded-2xl bg-slate-200" />
          <div className="h-16 rounded-2xl bg-slate-200" />
          <div className="h-16 rounded-2xl bg-slate-200" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 bg-white">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No expenses found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Record your daily expenditures to maintain an accurate budget and expense history.
          </p>
          <Button onClick={openAddModal} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Expense
          </Button>
        </div>
      ) : (
        <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
          {expenses.map((exp) => (
            <div
              key={exp._id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center font-bold text-white text-xs shadow-xs"
                  style={{ backgroundColor: exp.category?.color || "#6366f1" }}
                >
                  {exp.category?.name?.slice(0, 2).toUpperCase() || "EX"}
                </div>

                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">{exp.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-600">{exp.category?.name || "General"}</span>
                    <span>•</span>
                    <span>{formatISTDate(exp.transactionDate)}</span>
                    {exp.creditCard && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">
                          <CCIcon className="w-3 h-3" />
                          {exp.creditCard.cardName}
                        </span>
                      </>
                    )}
                    {exp.notes && <span className="italic truncate max-w-[150px]">"{exp.notes}"</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-base font-black text-slate-900">-{formatINR(exp.amountPaise)}</div>
                  <Badge variant="neutral" className="text-[10px] uppercase font-bold">
                    {exp.paymentMethod.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(exp)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(exp._id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Modal: Add / Edit Expense (SRS 4.3) */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title={editingExpenseId ? "Edit Expense" : "Record Expense"}
        description="Add a daily personal expense with category and payment method."
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <Input
            label="Expense Title *"
            required
            placeholder="e.g. Swiggy order, Grocery haul, Fuel"
            value={expenseForm.title}
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
          />

          <Input
            label="Amount (₹) *"
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="e.g. 450"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
          />

          <Select
            label="Category *"
            value={expenseForm.categoryId}
            onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
            required
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Payment Method *"
            value={expenseForm.paymentMethod}
            onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
          >
            <option value="UPI">UPI</option>
            <option value="CREDIT_CARD">Credit Card (Links to CC Liability)</option>
            <option value="CASH">Cash</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </Select>

          {/* If Credit Card chosen, require selecting the credit card (SRS 4.3) */}
          {expenseForm.paymentMethod === "CREDIT_CARD" && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2">
              <Select
                label="Select Credit Card *"
                value={expenseForm.creditCardId}
                onChange={(e) => setExpenseForm({ ...expenseForm, creditCardId: e.target.value })}
                required
              >
                <option value="">Choose Card</option>
                {cards.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.cardName} ({c.bankName})
                  </option>
                ))}
              </Select>
              {cards.length === 0 && (
                <p className="text-xs text-amber-700">
                  No credit cards added yet. Please add a credit card in the Cards tab first.
                </p>
              )}
              <p className="text-[11px] text-indigo-700">
                Notice: This purchase will automatically increase this credit card's outstanding balance.
              </p>
            </div>
          )}

          <Input
            label="Date *"
            type="date"
            required
            value={expenseForm.transactionDate}
            onChange={(e) => setExpenseForm({ ...expenseForm, transactionDate: e.target.value })}
          />

          <Input
            label="Notes"
            placeholder="Optional additional details"
            value={expenseForm.notes}
            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddExpenseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingExpenseId ? "Update Expense" : "Save Expense"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Custom Category */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="New Custom Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <Input
            label="Category Name *"
            required
            placeholder="e.g. Pet Care, Fitness & Gym, Gadgets"
            value={customCatForm.name}
            onChange={(e) => setCustomCatForm({ ...customCatForm, name: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customCatForm.color}
                onChange={(e) => setCustomCatForm({ ...customCatForm, color: e.target.value })}
                className="h-9 w-12 rounded-lg cursor-pointer border border-slate-300"
              />
              <span className="text-xs text-slate-500 font-mono">{customCatForm.color}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

