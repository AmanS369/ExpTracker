"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ChevronRight,
  AlertCircle,
  Phone,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface PersonItem {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  totalLentPaise: number;
  totalReceivedPaise: number;
  outstandingPaise: number;
  transactionCount: number;
}

interface LendingSummary {
  totalLentPaise: number;
  totalReceivedPaise: number;
  totalPendingPaise: number;
  peopleCount: number;
  pendingPeopleCount: number;
}

export default function LendingPage() {
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [summary, setSummary] = useState<LendingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "SETTLED">("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [selectedPersonForTx, setSelectedPersonForTx] = useState<string>("");

  // Form states
  const [personForm, setPersonForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [txForm, setTxForm] = useState({
    personId: "",
    type: "LENT" as "LENT" | "REPAYMENT",
    amount: "",
    paymentMethod: "UPI" as "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER",
    description: "",
    notes: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lending/people");
      if (!res.ok) throw new Error("Failed to load people");
      const json = await res.json();
      setPeople(json.people || []);
      setSummary(json.summary || null);
    } catch (err: any) {
      setError(err.message || "Failed to load lending data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/lending/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create person");

      setIsAddPersonOpen(false);
      setPersonForm({ name: "", phone: "", email: "", notes: "" });
      fetchPeople();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/lending/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...txForm,
          amount: parseFloat(txForm.amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save transaction");

      setIsRecordTxOpen(false);
      setTxForm({
        personId: "",
        type: "LENT",
        amount: "",
        paymentMethod: "UPI",
        description: "",
        notes: "",
        transactionDate: new Date().toISOString().split("T")[0],
      });
      fetchPeople();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openTxModalFor = (personId: string, type: "LENT" | "REPAYMENT") => {
    setTxForm({
      personId,
      type,
      amount: "",
      paymentMethod: "UPI",
      description: "",
      notes: "",
      transactionDate: new Date().toISOString().split("T")[0],
    });
    setFormError("");
    setIsRecordTxOpen(true);
  };

  // Filtered people
  const filteredPeople = people.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search)) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === "PENDING") {
      return p.outstandingPaise > 0;
    }
    if (filterTab === "SETTLED") {
      return p.outstandingPaise === 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Money Lending</h1>
          <p className="text-xs text-slate-500">Track loans to people, repayments received, and pending receivables.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setTxForm({
                personId: people[0]?._id || "",
                type: "LENT",
                amount: "",
                paymentMethod: "UPI",
                description: "",
                notes: "",
                transactionDate: new Date().toISOString().split("T")[0],
              });
              setFormError("");
              setIsRecordTxOpen(true);
            }}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1 text-indigo-600" />
            Record Transaction
          </Button>
          <Button
            onClick={() => {
              setFormError("");
              setIsAddPersonOpen(true);
            }}
            size="sm"
          >
            <Users className="w-4 h-4 mr-1" />
            Add Person
          </Button>
        </div>
      </div>

      {/* Lending Summary Cards (SRS 3.6) */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 sm:p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Lent</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatINR(summary.totalLentPaise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Cumulative amount lent</div>
          </Card>

          <Card className="p-4 sm:p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Received</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {formatINR(summary.totalReceivedPaise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Cumulative repayments</div>
          </Card>

          <Card className="p-4 sm:p-5 border-amber-200/80 bg-amber-50/20">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Total Pending</span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              {formatINR(summary.totalPendingPaise)}
            </div>
            <div className="text-[11px] text-amber-600/80 mt-1">Net pending receivable</div>
          </Card>

          <Card className="p-4 sm:p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Borrowers Pending</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {summary.pendingPeopleCount} <span className="text-sm font-medium text-slate-400">/ {summary.peopleCount}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">People with active dues</div>
          </Card>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/60 w-fit">
          <button
            onClick={() => setFilterTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterTab === "ALL" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All People ({people.length})
          </button>
          <button
            onClick={() => setFilterTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterTab === "PENDING" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending Dues ({people.filter((p) => p.outstandingPaise > 0).length})
          </button>
          <button
            onClick={() => setFilterTab("SETTLED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterTab === "SETTLED" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Settled ({people.filter((p) => p.outstandingPaise === 0).length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* People List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          <div className="h-44 rounded-2xl bg-slate-200" />
          <div className="h-44 rounded-2xl bg-slate-200" />
          <div className="h-44 rounded-2xl bg-slate-200" />
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 bg-white">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No people found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {search
              ? "No people match your search query."
              : "Start by adding a person you lend money to."}
          </p>
          {!search && (
            <Button onClick={() => setIsAddPersonOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add First Person
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeople.map((person) => {
            const isSettled = person.outstandingPaise === 0;
            return (
              <Card
                key={person._id}
                className="flex flex-col justify-between hover:border-indigo-300 transition duration-150"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <Link
                        href={`/lending/${person._id}`}
                        className="font-bold text-base text-slate-900 hover:text-indigo-600 transition flex items-center gap-1"
                      >
                        {person.name}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>
                      {(person.phone || person.email) && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          {person.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {person.phone}
                            </span>
                          )}
                          {person.email && (
                            <span className="flex items-center gap-1 truncate max-w-[140px]">
                              <Mail className="w-3 h-3" /> {person.email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {isSettled ? (
                      <Badge variant="success" className="text-[10px]">
                        Settled
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px]">
                        Due
                      </Badge>
                    )}
                  </div>

                  {/* Numbers */}
                  <div className="grid grid-cols-3 gap-2 py-3 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Lent</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {formatINR(person.totalLentPaise)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Received</div>
                      <div className="text-xs font-bold text-emerald-600 mt-0.5">
                        {formatINR(person.totalReceivedPaise)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Pending</div>
                      <div
                        className={`text-xs font-black mt-0.5 ${
                          person.outstandingPaise > 0 ? "text-amber-600" : "text-slate-400"
                        }`}
                      >
                        {formatINR(person.outstandingPaise)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2">
                  <Button
                    onClick={() => openTxModalFor(person._id, "LENT")}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs py-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Lend
                  </Button>
                  <Button
                    onClick={() => openTxModalFor(person._id, "REPAYMENT")}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs py-1.5"
                    disabled={person.outstandingPaise <= 0}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Receive
                  </Button>
                  <Link href={`/lending/${person._id}`} className="shrink-0">
                    <Button size="sm" variant="ghost" className="px-2">
                      Details
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Add Person (SRS 3.2) */}
      <Modal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        title="Add Person"
        description="Add a contact to track money lent and repayments."
      >
        <form onSubmit={handleCreatePerson} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          <Input
            label="Person Name *"
            required
            placeholder="e.g. Rahul Sharma"
            value={personForm.name}
            onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="e.g. 9876543210"
            value={personForm.phone}
            onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. rahul@example.com"
            value={personForm.email}
            onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })}
          />

          <Input
            label="Notes / Relationship"
            placeholder="e.g. College friend, flatmate"
            value={personForm.notes}
            onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddPersonOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Person
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Transaction (SRS 3.3 & 3.4) */}
      <Modal
        isOpen={isRecordTxOpen}
        onClose={() => setIsRecordTxOpen(false)}
        title={txForm.type === "LENT" ? "Record Money Lent" : "Record Repayment Received"}
        description={
          txForm.type === "LENT"
            ? "Record money you gave to someone."
            : "Record money returned back to you."
        }
      >
        <form onSubmit={handleRecordTx} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          )}

          {/* Type switcher */}
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

          <Select
            label="Person *"
            value={txForm.personId}
            onChange={(e) => setTxForm({ ...txForm, personId: e.target.value })}
            required
          >
            <option value="">Select Person</option>
            {people.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} {p.outstandingPaise > 0 ? `(Pending: ${formatINR(p.outstandingPaise)})` : ""}
              </option>
            ))}
          </Select>

          <Input
            label="Amount (₹) *"
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="e.g. 5000"
            value={txForm.amount}
            onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
          />

          <Select
            label="Payment Method *"
            value={txForm.paymentMethod}
            onChange={(e) => setTxForm({ ...txForm, paymentMethod: e.target.value as any })}
          >
            <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
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
            label="Reason / Description"
            placeholder="e.g. Dinner bill split, emergency loan"
            value={txForm.description}
            onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsRecordTxOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

