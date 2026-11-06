"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard as CCIcon,
  Plus,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  TrendingDown,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate } from "@/lib/utils/date";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface CardItem {
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
    status: "PAID" | "OVERDUE" | "DUE_TODAY" | "DUE_SOON" | "UPCOMING";
    daysLeft: number;
    label: string;
  };
}

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState<string>("");

  // Forms
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

  const [paymentForm, setPaymentForm] = useState({
    creditCardId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentSource: "BANK_ACCOUNT" as "CASH" | "BANK_ACCOUNT" | "UPI" | "OTHER",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cards");
      if (!res.ok) throw new Error("Failed to load cards");
      const data = await res.json();
      setCards(data.cards || []);
    } catch (err: any) {
      setError(err.message || "Failed to load credit cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cardForm,
          creditLimit: parseFloat(cardForm.creditLimit),
          statementDay: parseInt(cardForm.statementDay),
          dueDay: parseInt(cardForm.dueDay),
          openingOutstanding: parseFloat(cardForm.openingOutstanding || "0"),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create card");

      setIsAddCardOpen(false);
      setCardForm({
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
      fetchCards();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/cards/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      setIsPaymentModalOpen(false);
      setPaymentForm({
        creditCardId: "",
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentSource: "BANK_ACCOUNT",
        notes: "",
      });
      fetchCards();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentFor = (card: CardItem) => {
    setPaymentForm({
      creditCardId: card._id,
      amount: (card.currentOutstandingPaise / 100).toString(),
      paymentDate: new Date().toISOString().split("T")[0],
      paymentSource: "BANK_ACCOUNT",
      notes: `Bill payment for ${card.cardName}`,
    });
    setFormError("");
    setIsPaymentModalOpen(true);
  };

  // Consolidated statistics (SRS 6.5)
  const totalLimitPaise = cards.reduce((sum, c) => sum + c.creditLimitPaise, 0);
  const totalOutstandingPaise = cards.reduce((sum, c) => sum + c.currentOutstandingPaise, 0);
  const totalAvailablePaise = cards.reduce((sum, c) => sum + c.availableCreditPaise, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Credit Cards</h1>
          <p className="text-xs text-slate-500">
            Track credit limits, individual billing cycles, due dates, and liabilities.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError("");
            setIsAddCardOpen(true);
          }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Credit Card
        </Button>
      </div>

      {/* Consolidated Summary Cards (SRS 6.5) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-rose-200/80 bg-rose-50/20">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Total Outstanding</span>
          <div className="text-2xl font-black text-rose-600 mt-1">{formatINR(totalOutstandingPaise)}</div>
          <div className="text-[11px] text-rose-500 mt-1">Consolidated debt across all cards</div>
        </Card>

        <Card>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Available Credit</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{formatINR(totalAvailablePaise)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Remaining borrowing limit</div>
        </Card>

        <Card>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Credit Limit</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatINR(totalLimitPaise)}</div>
          <div className="text-[11px] text-slate-400 mt-1">{cards.length} cards active</div>
        </Card>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-56 rounded-3xl bg-slate-200" />
          <div className="h-56 rounded-3xl bg-slate-200" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 bg-white">
          <CCIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No credit cards added</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Add your credit cards to automatically monitor liabilities and billing cycle due dates.
          </p>
          <Button onClick={() => setIsAddCardOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add First Card
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => {
            const isDueSoon =
              card.dueInfo.status === "DUE_SOON" ||
              card.dueInfo.status === "DUE_TODAY" ||
              card.dueInfo.status === "OVERDUE";

            return (
              <div
                key={card._id}
                className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Visual Header */}
                  <div
                    className="rounded-2xl p-4 text-white shadow-md relative overflow-hidden"
                    style={{ backgroundColor: card.color || "#1e293b" }}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-white/70">
                          {card.bankName}
                        </div>
                        <div className="text-lg font-black tracking-tight">{card.cardName}</div>
                      </div>
                      <CCIcon className="w-6 h-6 text-white/60" />
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs text-white/80 relative z-10 font-mono">
                      <span>•••• •••• •••• {card.lastFourDigits || "••••"}</span>
                      <span className="text-[11px] font-sans font-medium text-white/70">
                        Limit: {formatINR(card.creditLimitPaise)}
                      </span>
                    </div>

                    <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  </div>

                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Current Outstanding
                      </span>
                      <div
                        className={`text-xl font-black mt-0.5 ${
                          card.currentOutstandingPaise > 0 ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {formatINR(card.currentOutstandingPaise)}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Available Credit
                      </span>
                      <div className="text-xl font-black text-emerald-600 mt-0.5">
                        {formatINR(card.availableCreditPaise)}
                      </div>
                    </div>
                  </div>

                  {/* Due Date & Billing Cycle (SRS 6.6) */}
                  <div className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        Due: <strong>{formatISTDate(card.dueInfo.dueDate)}</strong> (Day {card.dueDay})
                      </span>
                    </div>

                    <Badge
                      variant={
                        card.dueInfo.status === "PAID"
                          ? "success"
                          : card.dueInfo.status === "OVERDUE"
                          ? "danger"
                          : card.dueInfo.status === "DUE_SOON" || card.dueInfo.status === "DUE_TODAY"
                          ? "warning"
                          : "info"
                      }
                      className="text-[10px] font-bold"
                    >
                      {card.dueInfo.label}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2">
                  <Button
                    onClick={() => openPaymentFor(card)}
                    size="sm"
                    className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700"
                    disabled={card.currentOutstandingPaise <= 0}
                  >
                    Record Bill Payment
                  </Button>
                  <Link href={`/cards/${card._id}`} className="shrink-0">
                    <Button size="sm" variant="outline" className="text-xs">
                      Ledger History
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Credit Card (SRS 6.2) */}
      <Modal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        title="Add Credit Card"
        description="Enter credit limit, statement day, and payment due date."
      >
        <form onSubmit={handleCreateCard} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Card Name *"
              required
              placeholder="e.g. Amazon Pay ICICI"
              value={cardForm.cardName}
              onChange={(e) => setCardForm({ ...cardForm, cardName: e.target.value })}
            />
            <Input
              label="Bank Name *"
              required
              placeholder="e.g. ICICI Bank, HDFC, SBI"
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
              placeholder="e.g. 150000"
              value={cardForm.creditLimit}
              onChange={(e) => setCardForm({ ...cardForm, creditLimit: e.target.value })}
            />
            <Input
              label="Opening Outstanding (₹)"
              type="number"
              min="0"
              placeholder="0 if newly added"
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
              placeholder="e.g. 4022"
              value={cardForm.lastFourDigits}
              onChange={(e) => setCardForm({ ...cardForm, lastFourDigits: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Card Accent Color
              </label>
              <input
                type="color"
                value={cardForm.color}
                onChange={(e) => setCardForm({ ...cardForm, color: e.target.value })}
                className="h-10 w-full rounded-xl cursor-pointer border border-slate-300"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Security Guarantee: Complete 16-digit card numbers, CVV, or PINs are never requested or stored.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddCardOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Credit Card
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Bill Payment (SRS 6.4) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Credit Card Payment"
        description="Reduces the credit card liability. Will not be counted as a second expense."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <Select
            label="Credit Card *"
            value={paymentForm.creditCardId}
            onChange={(e) => setPaymentForm({ ...paymentForm, creditCardId: e.target.value })}
            required
          >
            <option value="">Select Card</option>
            {cards.map((c) => (
              <option key={c._id} value={c._id}>
                {c.cardName} (Outstanding: {formatINR(c.currentOutstandingPaise)})
              </option>
            ))}
          </Select>

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
            label="Notes / Transaction ID"
            placeholder="e.g. Reference number, paid via CRED"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

