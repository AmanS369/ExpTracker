import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import {
  Wallet,
  Users,
  CreditCard,
  Receipt,
  PieChart,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-black text-lg tracking-tight text-slate-900">Expenser</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Server-Verified Ledger • Integer Paise Math • Mobile-First</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Take total control of your{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent">
              money & debts
            </span>
            .
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Eliminate manual calculations. Track money lent to friends, manage multiple credit card billing cycles,
            set monthly category budgets, and monitor your exact financial net position.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="px-8 shadow-lg shadow-indigo-500/25">
                <span>Start Free</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8">
                Sign In to Existing Account
              </Button>
            </Link>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left pt-10">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Money Lending Manager</h3>
              <p className="text-xs text-slate-500 mt-1">
                Record loans and partial repayments per individual with real-time outstanding balances.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Credit Card Liabilities</h3>
              <p className="text-xs text-slate-500 mt-1">
                Independent card balances, statement dates, due date countdowns, and payment ledgers.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Daily Expenses</h3>
              <p className="text-xs text-slate-500 mt-1">
                Filter by UPI, Cash, or Credit Card. Seamlessly links card purchases to card debt.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Budget Alerts</h3>
              <p className="text-xs text-slate-500 mt-1">
                Monthly and category-level budgets with visual consumption alerts at 70%, 90%, and 100%.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        Expenser • Personal Finance & Money Management Application (INR ₹)
      </footer>
    </div>
  );
}
