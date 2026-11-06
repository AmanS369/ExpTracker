"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  Phone,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { formatISTDate } from "@/lib/utils/date";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface PersonDetails {
  person: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
    createdAt: string;
  };
  summary: {
    totalLentPaise: number;
    totalReceivedPaise: number;
    outstandingPaise: number;
    transactionCount: number;
  };
  transactions: {
    _id: string;
    type: "LENT" | "REPAYMENT";
    amountPaise: number;
    paymentMethod: string;
    description?: string;
    notes?: string;
    transactionDate: string;
    createdAt: string;
  }[];
}

export default function PersonDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isEditPersonOpen, setIsEditPersonOpen] = useState(false);
  const [isDeletePersonOpen, setIsDeletePersonOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Forms
  const [personForm, setPersonForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [txForm, setTxForm] = useState({
    type: "LENT" as "LENT" | "REPAYMENT",
    amount: "",
    paymentMethod: "UPI" as "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER",
    description: "",
    notes: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lending/people/${id}`);
      if (!res.ok) throw new Error("Failed to load person details");
      const json = await res.json();
      setData(json);
      setPersonForm({
        name: json.person.name,
        phone: json.person.phone || "",
        email: json.person.email || "",
        notes: json.person.notes || "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load person");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const endpoint = editingTxId
        ? `/api/lending/transactions/${editingTxId}`
        : "/api/lending/transactions";
      const method = editingTxId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...txForm,
          personId: id,
          amount: parseFloat(txForm.amount),
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save transaction");

      setIsTxModalOpen(false);
      setEditingTxId(null);
      fetchDetails();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm("Are you sure you want to delete this transaction? Outstanding balance will recalculate.")) return;
    try {
      const res = await fetch(`/api/lending/transactions/${txId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transaction");
      fetchDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lending/people/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personForm),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update person");

      setIsEditPersonOpen(false);
      fetchDetails();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePerson = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lending/people/${id}`, { method: "DELETE" });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Cannot delete person");

      router.push("/lending");
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openAddTx = (type: "LENT" | "REPAYMENT") => {
    setEditingTxId(null);
    setTxForm({
      type,
      amount: "",
      paymentMethod: "UPI",
      description: "",
      notes: "",
      transactionDate: new Date().toISOString().split("T")[0],
    });
    setFormError("");
    setIsTxModalOpen(true);
  };

  const openEditTx = (tx: PersonDetails["transactions"][0]) => {
    setEditingTxId(tx._id);
    setTxForm({
      type: tx.type,
      amount: (tx.amountPaise / 100).toString(),
      paymentMethod: tx.paymentMethod as any,
      description: tx.description || "",
      notes: tx.notes || "",
      transactionDate: new Date(tx.transactionDate).toISOString().split("T")[0],
    });
    setFormError("");
    setIsTxModalOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading person details...</div>;
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Person not found</h2>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <Link href="/lending">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Lending
          </Button>
        </Link>
      </div>
    );
  }

  const { person, summary, transactions } = data;

  return (
    <div className="space-y-6">
      {/* Top bar with back button */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/lending"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to People</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setFormError("");
              setIsEditPersonOpen(true);
            }}
            variant="outline"
            size="sm"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Info
          </Button>
          <Button
            onClick={() => {
              setFormError("");
              setIsDeletePersonOpen(true);
            }}
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xl">
              {person.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{person.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                {person.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {person.phone}
                  </span>
                )}
                {person.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {person.email}
                  </span>
                )}
                {person.notes && <span className="italic">"{person.notes}"</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={() => openAddTx("LENT")} size="sm" className="bg-amber-600 hover:bg-amber-700">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            Lend Money
          </Button>
          <Button
            onClick={() => openAddTx("REPAYMENT")}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={summary.outstandingPaise <= 0}
          >
            <ArrowDownLeft className="w-4 h-4 mr-1" />
            Receive Repayment
          </Button>
        </div>
      </div>

      {/* 3 Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Lent</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatINR(summary.totalLentPaise)}</div>
        </Card>

        <Card>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Received</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{formatINR(summary.totalReceivedPaise)}</div>
        </Card>

        <Card
          className={
            summary.outstandingPaise > 0
              ? "border-amber-300 bg-amber-50/30"
              : "border-emerald-300 bg-emerald-50/30"
          }
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Outstanding</span>
          <div
            className={`text-2xl font-black mt-1 ${
              summary.outstandingPaise > 0 ? "text-amber-600" : "text-emerald-700"
            }`}
          >
            {formatINR(summary.outstandingPaise)}
          </div>
        </Card>
      </div>

      {/* Complete Transaction History (SRS 3.5) */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Transaction History</h2>
            <p className="text-xs text-slate-500">{transactions.length} total entries</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No transactions recorded with {person.name} yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isLent = tx.type === "LENT";
              return (
                <div key={tx._id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ${
                        isLent ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isLent ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {tx.description || (isLent ? "Money Lent" : "Repayment Received")}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{formatISTDate(tx.transactionDate)}</span>
                        <span>•</span>
                        <span className="capitalize">{tx.paymentMethod.replace("_", " ")}</span>
                        {tx.notes && <span>• {tx.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`text-base font-black ${isLent ? "text-slate-900" : "text-emerald-600"}`}
                      >
                        {isLent ? "-" : "+"}
                        {formatINR(tx.amountPaise)}
                      </div>
                      <Badge variant={isLent ? "warning" : "success"} className="text-[9px] uppercase font-bold">
                        {isLent ? "LENT" : "REPAYMENT"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditTx(tx)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(tx._id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal: Add/Edit Transaction */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title={editingTxId ? "Edit Transaction" : txForm.type === "LENT" ? "Lend Money" : "Record Repayment"}
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setTxForm({ ...txForm, type: "LENT" })}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                txForm.type === "LENT"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Money Lent
            </button>
            <button
              type="button"
              onClick={() => setTxForm({ ...txForm, type: "REPAYMENT" })}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                txForm.type === "REPAYMENT"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Repayment Received
            </button>
          </div>

          <Input
            label="Amount (₹) *"
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="e.g. 2000"
            value={txForm.amount}
            onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
          />

          <Select
            label="Payment Method *"
            value={txForm.paymentMethod}
            onChange={(e) => setTxForm({ ...txForm, paymentMethod: e.target.value as any })}
          >
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </Select>

          <Input
            label="Transaction Date *"
            type="date"
            required
            value={txForm.transactionDate}
            onChange={(e) => setTxForm({ ...txForm, transactionDate: e.target.value })}
          />

          <Input
            label="Description / Reason"
            placeholder="e.g. Trip expenses, lunch"
            value={txForm.description}
            onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsTxModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Person */}
      <Modal
        isOpen={isEditPersonOpen}
        onClose={() => setIsEditPersonOpen(false)}
        title="Edit Person Info"
      >
        <form onSubmit={handleUpdatePerson} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <Input
            label="Name *"
            required
            value={personForm.name}
            onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
          />

          <Input
            label="Phone"
            value={personForm.phone}
            onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
          />

          <Input
            label="Email"
            type="email"
            value={personForm.email}
            onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })}
          />

          <Input
            label="Notes"
            value={personForm.notes}
            onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditPersonOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Update
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Person Confirmation Safeguard */}
      <Modal
        isOpen={isDeletePersonOpen}
        onClose={() => setIsDeletePersonOpen(false)}
        title={`Delete ${person.name}?`}
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          {summary.outstandingPaise > 0 ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              Cannot delete <strong>{person.name}</strong> while there is an active outstanding balance of{" "}
              <strong>{formatINR(summary.outstandingPaise)}</strong>. Please settle all dues first.
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              This person is fully settled. Deleting will permanently remove them and all their transaction history.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsDeletePersonOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={summary.outstandingPaise > 0 || submitting}
              isLoading={submitting}
              onClick={handleDeletePerson}
            >
              Delete Person
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

