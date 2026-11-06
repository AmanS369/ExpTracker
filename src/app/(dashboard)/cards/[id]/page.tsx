"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard as CCIcon,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate } from "@/lib/utils/date";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface CardDetails {
  card: {
    _id: string;
    cardName: string;
    bankName: string;
    creditLimitPaise: number;
    statementDay: number;
    dueDay: number;
    openingOutstandingPaise: number;
    lastFourDigits?: string;
    notes?: string;
    color?: string;
    currentOutstandingPaise: number;
    availableCreditPaise: number;
    dueInfo: {
      dueDate: string;
      status: string;
      daysLeft: number;
      label: string;
    };
  };
  transactions: {
    _id: string;
    type: "PURCHASE" | "PAYMENT" | "REFUND" | "ADJUSTMENT";
    amountPaise: number;
    expenseId?: string | null;
    paymentSource?: string;
    transactionDate: string;
    description?: string;
    createdAt: string;
  }[];
}

export default function CreditCardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<CardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentSource: "BANK_ACCOUNT" as "CASH" | "BANK_ACCOUNT" | "UPI" | "OTHER",
    notes: "",
  });

  const [cardForm, setCardForm] = useState({
    cardName: "",
    bankName: "",
    creditLimit: "",
    statementDay: "15",
    dueDay: "5",
    openingOutstanding: "0",
    lastFourDigits: "",
    notes: "",
    color: "#1e293b",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cards/${id}`);
      if (!res.ok) throw new Error("Failed to load credit card");
      const json = await res.json();
      setData(json);
      setCardForm({
        cardName: json.card.cardName,
        bankName: json.card.bankName,
        creditLimit: (json.card.creditLimitPaise / 100).toString(),
        statementDay: json.card.statementDay.toString(),
        dueDay: json.card.dueDay.toString(),
        openingOutstanding: (json.card.openingOutstandingPaise / 100).toString(),
        lastFourDigits: json.card.lastFourDigits || "",
        notes: json.card.notes || "",
        color: json.card.color || "#1e293b",
      });
      setPaymentForm({
        amount: (json.card.currentOutstandingPaise / 100).toString(),
        paymentDate: new Date().toISOString().split("T")[0],
        paymentSource: "BANK_ACCOUNT",
        notes: `Bill payment for ${json.card.cardName}`,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load card");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/cards/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditCardId: id,
          amount: parseFloat(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentSource: paymentForm.paymentSource,
          notes: paymentForm.notes,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to record payment");

      setIsPaymentOpen(false);
      fetchDetails();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cardForm,
          creditLimit: parseFloat(cardForm.creditLimit),
          statementDay: parseInt(cardForm.statementDay),
          dueDay: parseInt(cardForm.dueDay),
          openingOutstanding: parseFloat(cardForm.openingOutstanding || "0"),
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update card");

      setIsEditOpen(false);
      fetchDetails();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async () => {
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Cannot delete card");

      router.push("/cards");
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePaymentTx = async (txId: string) => {
    if (!confirm("Are you sure you want to delete this payment record? Outstanding liability will recalculate.")) {
      return;
    }
    try {
      const res = await fetch(`/api/cards/transactions/${txId}`, { method: "DELETE" });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to delete transaction");
      fetchDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading credit card details...</div>;
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Card not found</h2>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <Link href="/cards">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cards
          </Button>
        </Link>
      </div>
    );
  }

  const { card, transactions } = data;

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/cards"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Cards</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setFormError("");
              setIsEditOpen(true);
            }}
            variant="outline"
            size="sm"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Card
          </Button>
          <Button
            onClick={() => {
              setFormError("");
              setIsDeleteOpen(true);
            }}
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Card Showcase */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Visual Card */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
          style={{ backgroundColor: card.color || "#1e293b" }}
        >
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-white/70">{card.bankName}</div>
              <div className="text-2xl font-black tracking-tight mt-1">{card.cardName}</div>
            </div>
            <CCIcon className="w-8 h-8 text-white/60" />
          </div>

          <div className="mt-10 flex items-center justify-between text-sm text-white/90 relative z-10 font-mono">
            <span>•••• •••• •••• {card.lastFourDigits || "••••"}</span>
            <span className="text-xs font-sans font-medium text-white/80">
              Limit: {formatINR(card.creditLimitPaise)}
            </span>
          </div>

          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* Card Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700">
                Current Outstanding
              </span>
              <div className="text-2xl font-black text-rose-600 mt-0.5">
                {formatINR(card.currentOutstandingPaise)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                Available Credit
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">
                {formatINR(card.availableCreditPaise)}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-500 font-medium">Billing Cycle</div>
              <div className="font-bold text-slate-800 mt-0.5">
                Statement: Day {card.statementDay} • Due: Day {card.dueDay}
              </div>
            </div>
            <Badge variant={card.dueInfo.status === "PAID" ? "success" : "warning"}>
              {card.dueInfo.label}
            </Badge>
          </div>

          <Button
            onClick={() => {
              setFormError("");
              setIsPaymentOpen(true);
            }}
            disabled={card.currentOutstandingPaise <= 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Record Bill Payment
          </Button>
        </div>
      </div>

      {/* Transaction Ledger */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Card Transaction Ledger</h2>
            <p className="text-xs text-slate-500">
              Formula: Outstanding = Opening + Purchases - Payments - Refunds
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{transactions.length} entries</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No card transactions recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isPurchase = tx.type === "PURCHASE";
              const isPayment = tx.type === "PAYMENT";

              return (
                <div key={tx._id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ${
                        isPurchase
                          ? "bg-rose-100 text-rose-700"
                          : isPayment
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {isPurchase ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownLeft className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {tx.description || (isPurchase ? "Card Purchase" : "Bill Payment")}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{formatISTDate(tx.transactionDate)}</span>
                        {tx.paymentSource && <span>• Via {tx.paymentSource.replace("_", " ")}</span>}
                        {tx.expenseId && <span className="text-indigo-600 font-medium">• Linked Expense</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`text-base font-black ${
                          isPurchase ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {isPurchase ? "+" : "-"}
                        {formatINR(tx.amountPaise)}
                      </div>
                      <Badge
                        variant={isPurchase ? "danger" : isPayment ? "success" : "info"}
                        className="text-[9px] uppercase font-bold"
                      >
                        {tx.type}
                      </Badge>
                    </div>

                    {isPayment && (
                      <button
                        onClick={() => handleDeletePaymentTx(tx._id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal: Record Bill Payment */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Record Bill Payment"
        description="Reduces card liability. Not counted as an additional expense."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <Input
            label="Payment Amount (₹) *"
            type="number"
            step="0.01"
            min="1"
            required
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          />

          <Select
            label="Payment Source *"
            value={paymentForm.paymentSource}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentSource: e.target.value as any })}
          >
            <option value="BANK_ACCOUNT">Bank Account (Netbanking / Autopay)</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
          </Select>

          <Input
            label="Payment Date *"
            type="date"
            required
            value={paymentForm.paymentDate}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
          />

          <Input
            label="Notes"
            placeholder="e.g. Reference number, paid via CRED"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Card */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Credit Card Info">
        <form onSubmit={handleUpdateCard} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Card Name *"
              required
              value={cardForm.cardName}
              onChange={(e) => setCardForm({ ...cardForm, cardName: e.target.value })}
            />
            <Input
              label="Bank Name *"
              required
              value={cardForm.bankName}
              onChange={(e) => setCardForm({ ...cardForm, bankName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Credit Limit (₹) *"
              type="number"
              min="1"
              required
              value={cardForm.creditLimit}
              onChange={(e) => setCardForm({ ...cardForm, creditLimit: e.target.value })}
            />
            <Input
              label="Opening Outstanding (₹)"
              type="number"
              min="0"
              value={cardForm.openingOutstanding}
              onChange={(e) => setCardForm({ ...cardForm, openingOutstanding: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Statement Day (1-31) *"
              type="number"
              min="1"
              max="31"
              required
              value={cardForm.statementDay}
              onChange={(e) => setCardForm({ ...cardForm, statementDay: e.target.value })}
            />
            <Input
              label="Payment Due Day (1-31) *"
              type="number"
              min="1"
              max="31"
              required
              value={cardForm.dueDay}
              onChange={(e) => setCardForm({ ...cardForm, dueDay: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Last 4 Digits"
              maxLength={4}
              value={cardForm.lastFourDigits}
              onChange={(e) => setCardForm({ ...cardForm, lastFourDigits: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Accent Color
              </label>
              <input
                type="color"
                value={cardForm.color}
                onChange={(e) => setCardForm({ ...cardForm, color: e.target.value })}
                className="h-10 w-full rounded-xl cursor-pointer border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Update Card
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Card Safeguard (SRS 6.2) */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={`Delete ${card.cardName}?`}
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          {card.currentOutstandingPaise > 0 ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              Cannot delete <strong>{card.cardName}</strong> because it has an active outstanding balance of{" "}
              <strong>{formatINR(card.currentOutstandingPaise)}</strong>. Outstanding balance must be ₹0.
            </div>
          ) : transactions.length > 0 ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              This card has {transactions.length} unresolved transactions. Please remove linked transactions
              before deleting the card.
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this credit card? This action cannot be undone.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={card.currentOutstandingPaise > 0 || transactions.length > 0 || submitting}
              isLoading={submitting}
              onClick={handleDeleteCard}
            >
              Delete Card
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

