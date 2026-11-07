# Expenser — Personal Finance & Money Management Application (Version 2.0)

A simple, secure, mobile-first personal finance management application with an **AI-Powered Financial Assistant**, built in strict accordance with the **Software Requirements Specification (SRS v1.0 & v2.0)**.

---

## 🌟 Version 2.0 Highlights: AI-Powered Financial Assistant

Version 2.0 introduces a conversational AI assistant (`/ai`) that allows users to query, analyze, and manage their finances using natural language.

### 🤖 Capabilities

1. **Natural Language Financial Queries (Read Operations):**
   - **Expenses:** *"How much did I spend this month?"*, *"How much did I spend on food last month?"*, *"Show my recent transactions"*
   - **Lending & Debtors:** *"Who owes me money?"*, *"How much does Rahul owe me?"*, *"Show all pending repayments"*
   - **Credit Cards:** *"What is my total credit card outstanding?"*, *"Which credit card payment is due next?"*, *"What is my available credit limit on ICICI?"*
   - **Budgets:** *"How much budget do I have remaining?"*, *"Have I exceeded my food budget?"*
   - **Consolidated Position:** *"Give me my complete financial summary"*, *"What is my net position?"*

2. **AI-Powered Write Operations with Explicit User Confirmation:**
   - *"Add an expense of ₹500 for groceries"*
   - *"I lent Rahul ₹2,000 through UPI"*
   - *"Rahul returned ₹1,000 in cash"*
   - *"I spent ₹1,500 on Amazon using my ICICI credit card"*
   - *"Set my monthly budget to ₹30,000"*
   - **Confirmation Cards:** The assistant creates a server-verified **Pending Action** (with a 10-minute expiry). The user reviews the exact transaction details and clicks **"Confirm & Record"** or **"Cancel"**.

3. **Multi-User Isolation & Security:**
   - Every authenticated user has their own isolated AI context and chat history.
   - The LLM **NEVER has direct access to MongoDB**. All operations run through authorized, user-scoped backend tools.
   - Scope restrictions politely decline out-of-scope inquiries (e.g. general knowledge, programming, poetry).
   - Strict prompt injection safeguards.

4. **Strategy Pattern for LLM Providers:**
   - Provider interface (`LLMProvider`) decoupling AI business logic from underlying models.
   - **Groq API** active as the primary provider with LLaMA 3.3.
   - Planned adapter contract for **Google Gemini** and future LLMs.

---

## 🚀 Core Financial Modules (V1.0 + V2.0)

### 1. Money Lending Manager
- Track loans and repayments per individual contact.
- Outstanding balance calculated as $\sum \text{Lent} - \sum \text{Received}$.
- Over-repayment prevention and deletion safeguards.

### 2. Expense & Debt Manager
- Multi-payment tracking: Cash, UPI, Bank Transfer, Debit Card, Credit Card.
- Automatic linkage: Credit card purchases automatically update the card's liability without double-counting.
- 12 default Indian categories + custom categories.

### 3. Credit Card Management
- Multi-card tracking with individual billing cycles, statement dates, and payment due dates.
- Dynamic status indicators (`Paid`, `Due Today`, `Due Soon`, `Overdue`, `Upcoming`).
- Accounting rule: Credit card bill payments reduce liability and are not counted as personal expenses.

### 4. Budget Management
- Monthly overall limits and category-specific allocations.
- Visual consumption alerts at 70%, 90%, and 100%+.

### 5. Unified Dashboard
- Partial net financial position: $\text{Receivables} - \text{Credit Card Dues}$.
- Category spending distribution charts via Recharts.
- Chronological multi-module activity feed.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) with TypeScript & React 19 |
| Styling | Tailwind CSS |
| Animations | Framer Motion (respects reduced motion) |
| Icons | Lucide React |
| Charts | Recharts |
| Markdown | React Markdown |
| Database | MongoDB & Mongoose |
| AI Integration | Groq SDK (`groq-sdk`), Strategy Pattern |
| Security | Bcrypt (12 rounds), JOSE Edge-compatible JWT, Rate Limiting |
| Validation | Zod server-side validation |
| Currency | Indian Rupee (INR ₹), stored in integer Paise |
| Timezone | Asia/Kolkata (IST) |

---

## 🏃 Getting Started

### 1. Installation
```bash
git clone <repo-url>
cd expenser
npm install
```

### 2. Environment Configuration
Create `.env.local`:
```bash
# Database
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/expenser?retryWrites=true&w=majority

# Authentication Secret
JWT_SECRET=supersecret-jwt-key-change-in-production-expenser-2026-min-32-chars

# App Locale
NEXT_PUBLIC_APP_TIMEZONE=Asia/Kolkata
NEXT_PUBLIC_APP_CURRENCY=INR

# AI Provider Configuration
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. Running Locally
```bash
# Development mode
npm run dev

# Production build and run
npm run build
npm run start
```

### 4. Running Tests
Run automated unit tests for financial math, ledger accounting rules, AI guardrails, and provider factories:
```bash
npm test
```
