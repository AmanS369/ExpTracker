# Expenser — Personal Finance & Money Management Application

A simple, secure, mobile-first personal finance management application built in accordance with the Software Requirements Specification (SRS v1.0).

## 🚀 Key Features

### Module 1: Money Lending Manager
- **Contact Management:** Add, edit, and safely manage people you lend money to.
- **Lending & Repayment Tracking:** Record loans and partial/full repayments with payment methods (UPI, Cash, Bank Transfer, Other).
- **Dynamic Ledger Math:**
  $$\text{Outstanding Balance} = \text{Total Lent} - \text{Total Received}$$
- **Safeguards:** Prevents repayments from exceeding outstanding amounts; blocks deletion of contacts with active balances.
- **Detailed Person Ledger:** Individual ledger pages displaying full chronological transaction histories.

### Module 2: Expense & Debt Manager
- **Multi-Method Tracking:** Record expenses using Cash, UPI, Bank Transfer, Debit Card, or Credit Card.
- **Automated Credit Card Linkage:** Charging an expense to a Credit Card automatically creates a linked purchase entry and increases the card's liability without double-counting.
- **Category System:** 12 default Indian expense categories plus user-defined custom categories with color customization.
- **Powerful Filtering & Search:** Filter by date range, payment method, category, and credit card with instant summary totals.

### Module 3: Budget Management
- **Monthly Budgets:** Configure overall monthly budget limits and category-specific allocations.
- **Real-Time Consumption Tracking:** Live progress bars tracking spent percentage and remaining budget.
- **Visual Alert Thresholds:**
  - `70%`: Consumption warning
  - `90%`: Critical threshold alert
  - `100%+`: Budget exceeded notification

### Module 4: Credit Card Liabilities Manager
- **Multi-Card Management:** Track card limits, statement billing dates, and payment due dates.
- **Ledger Formula:**
  $$\text{Outstanding} = \text{Opening Balance} + \text{Purchases} - \text{Payments} - \text{Refunds}$$
  $$\text{Available Credit} = \text{Credit Limit} - \text{Outstanding}$$
- **Due Date Countdown:** Dynamic status indicators (`Paid`, `Due Today`, `Due Soon`, `Overdue`, `Upcoming`).
- **Strict Accounting Rule:** Credit card bill payments reduce liability and are strictly **not** counted as personal expenses.

### Unified Dashboard
- **Partial Net Financial Position:**
  $$\text{Net Position} = \text{Money People Owe You} - \text{Credit Card Liabilities}$$
- **Key Metric Cards:** Money owed to you, credit card dues, monthly expenses, and remaining budget.
- **Interactive Recharts Visualizations:** Category distribution breakdown.
- **Chronological Feed:** Unified stream of all activity across lending, expenses, and card payments.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) with TypeScript & React 19 |
| Styling | Tailwind CSS |
| Animations | Framer Motion (respects reduced motion) |
| Icons | Lucide React |
| Charts | Recharts |
| Database | MongoDB & Mongoose |
| Security | Argon2/Bcrypt password hashing, JOSE JWT HTTP-only cookies, Rate Limiting |
| Validation | Zod server-side validation |
| Currency | Indian Rupee (INR ₹), stored in integer Paise |
| Timezone | Asia/Kolkata (IST) |

---

## 🔒 Financial & Security Architecture

1. **Integer Paise Representation:** All monetary fields (`amountPaise`, `creditLimitPaise`, etc.) are stored as integers (1 INR = 100 paise) to eliminate floating-point drift.
2. **Server-Side Ledgers:** Balances are dynamically aggregated from transaction records on the server—never trusted from client counters.
3. **NoSQL Injection Defense:** Strict Zod schemas, MongoDB ObjectId validation, and rejection of query operator objects (`$gt`, `$ne`, etc.).
4. **Data Isolation:** Every Mongoose model enforces user ownership with compound indexes on `userId`.
5. **No Credential Storage:** Full 16-digit card numbers, CVVs, PINs, and banking credentials are never requested or stored.

---

## 🏃 Getting Started

### Prerequisites
- Node.js >= 18.18.0
- npm >= 9.0.0

### Installation
```bash
git clone <repo-url>
cd expenser
npm install
```

### Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
# Optional: If MONGODB_URI is left empty, the app runs an in-memory MongoDB server for testing
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/expenser?retryWrites=true&w=majority
JWT_SECRET=supersecret-jwt-key-change-in-production-expenser-2026-min-32-chars
NEXT_PUBLIC_APP_TIMEZONE=Asia/Kolkata
NEXT_PUBLIC_APP_CURRENCY=INR
```

### Running Locally
```bash
# Development mode
npm run dev

# Production build and start
npm run build
npm run start
```

### Running Tests
Unit tests for financial calculations, ledger balance formulas, and alert thresholds:
```bash
npm test
```
