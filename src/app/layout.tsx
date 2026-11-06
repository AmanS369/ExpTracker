import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expenser - Personal Finance & Money Management",
  description: "Track money lent, personal expenses, budgets, and credit cards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
