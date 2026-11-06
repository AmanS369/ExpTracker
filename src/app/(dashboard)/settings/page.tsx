"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Database,
  Clock,
  Coins,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleSeedDemoData = async () => {
    if (!confirm("This will add sample lending contacts, credit cards, and expenses to your account for demonstration. Proceed?")) {
      return;
    }
    setSeeding(true);
    try {
      // 1. Add people
      const p1Res = await fetch("/api/lending/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Rahul Sharma", phone: "9876543210", notes: "College friend" }),
      });
      const p1 = await p1Res.json();

      const p2Res = await fetch("/api/lending/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Priya Patel", phone: "9812345678", notes: "Flatmate" }),
      });
      const p2 = await p2Res.json();

      // 2. Add lending transactions
      if (p1.person?._id) {
        await fetch("/api/lending/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: p1.person._id,
            type: "LENT",
            amount: 5000,
            paymentMethod: "UPI",
            description: "Goa trip hotel advance",
            transactionDate: new Date().toISOString().split("T")[0],
          }),
        });
        await fetch("/api/lending/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: p1.person._id,
            type: "REPAYMENT",
            amount: 2000,
            paymentMethod: "UPI",
            description: "Partial refund via GPay",
            transactionDate: new Date().toISOString().split("T")[0],
          }),
        });
      }

      // 3. Add Credit Cards
      const cardRes = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName: "Amazon Pay ICICI",
          bankName: "ICICI Bank",
          creditLimit: 150000,
          statementDay: 15,
          dueDay: 5,
          openingOutstanding: 2600,
          lastFourDigits: "4022",
          color: "#0f172a",
        }),
      });
      const cardData = await cardRes.json();

      // 4. Add Categories & Expenses
      const catRes = await fetch("/api/categories");
      const catData = await catRes.json();
      const foodCat = catData.categories?.find((c: any) => c.name.includes("Food")) || catData.categories?.[0];

      if (foodCat) {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Weekend Dinner & Drinks",
            amount: 1450,
            categoryId: foodCat._id,
            paymentMethod: "UPI",
            transactionDate: new Date().toISOString().split("T")[0],
            notes: "Social dinner",
          }),
        });
      }

      // 5. Add Monthly Budget
      const now = new Date();
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Monthly Overall Budget",
          amount: 25000,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          categoryId: null,
        }),
      });

      setSeedSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (e) {
      alert("Seeding error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & Settings</h1>
        <p className="text-xs text-slate-500">Manage account information, preferences, and data security.</p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Your personal account credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
              <div className="font-bold text-slate-800 text-sm mt-0.5">{user?.name || "Personal User"}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
              <div className="font-bold text-slate-800 text-sm mt-0.5">{user?.email || "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Locale & Financial Rules</CardTitle>
          <CardDescription>System standards enforced by ledger</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
            <div className="flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-700">Currency</span>
            </div>
            <span className="font-bold text-slate-900">INR (₹) - Stored in Integer Paise</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-700">Timezone</span>
            </div>
            <span className="font-bold text-slate-900">Asia/Kolkata (IST)</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">Data Isolation</span>
            </div>
            <span className="font-bold text-emerald-700">Strict User-Level Database Isolation</span>
          </div>
        </CardContent>
      </Card>

      {/* Demo Data Seeder */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-950">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Quick Demo Data Generator
          </CardTitle>
          <CardDescription>
            Populate realistic sample records (lending contacts, credit cards, expenses, and budget) to test the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seedSuccess ? (
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sample data added successfully! Redirecting to dashboard...</span>
            </div>
          ) : (
            <Button
              onClick={handleSeedDemoData}
              isLoading={seeding}
              variant="outline"
              size="sm"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-100/50"
            >
              <Sparkles className="w-4 h-4 mr-1 text-indigo-600" />
              Generate Sample Demo Records
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Session Actions */}
      <div className="pt-2">
        <Button onClick={handleLogout} variant="danger" size="md">
          <LogOut className="w-4 h-4 mr-1.5" />
          Sign Out of Account
        </Button>
      </div>
    </div>
  );
}

