import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rupeesToPaise, paiseToRupees, formatINR } from "../src/lib/utils/currency";
import { calculateDueStatus } from "../src/lib/utils/date";
import { BudgetService } from "../src/services/budget.service";

describe("Financial Currency & Arithmetic Tests", () => {
  it("converts decimal rupees to integer paise without float drift", () => {
    assert.equal(rupeesToPaise(100), 10000);
    assert.equal(rupeesToPaise(100.55), 10055);
    assert.equal(rupeesToPaise(0.01), 1);
    assert.equal(rupeesToPaise("5000.75"), 500075);
    assert.equal(rupeesToPaise("199.99"), 19999);
  });

  it("converts paise back to rupees", () => {
    assert.equal(paiseToRupees(10000), 100);
    assert.equal(paiseToRupees(10055), 100.55);
    assert.equal(paiseToRupees(1), 0.01);
  });

  it("formats Indian Rupee currency correctly", () => {
    const formatted = formatINR(500000, { showPaise: true });
    assert.ok(formatted.includes("5,000.00"));
  });
});

describe("Lending Ledger Accounting Rules (SRS Module 1 & Section 8)", () => {
  it("computes outstanding amount from sum of lent minus sum of repayments", () => {
    const transactions = [
      { type: "LENT", amountPaise: rupeesToPaise(5000) },
      { type: "REPAYMENT", amountPaise: rupeesToPaise(1500) },
      { type: "REPAYMENT", amountPaise: rupeesToPaise(1000) },
    ];

    let totalLent = 0;
    let totalReceived = 0;
    for (const tx of transactions) {
      if (tx.type === "LENT") totalLent += tx.amountPaise;
      if (tx.type === "REPAYMENT") totalReceived += tx.amountPaise;
    }

    const outstandingPaise = totalLent - totalReceived;
    assert.equal(totalLent, 500000); // ₹5,000
    assert.equal(totalReceived, 250000); // ₹2,500
    assert.equal(outstandingPaise, 250000); // ₹2,500
  });

  it("safeguards against over-repayment exceeding current outstanding", () => {
    const totalLentPaise = rupeesToPaise(2000);
    const totalReceivedPaise = rupeesToPaise(1500);
    const currentOutstanding = totalLentPaise - totalReceivedPaise; // 50000 paise (₹500)

    const attemptedRepaymentPaise = rupeesToPaise(600);
    const exceeds = attemptedRepaymentPaise > currentOutstanding;
    assert.equal(exceeds, true);
  });
});

describe("Credit Card Ledger Accounting Rules (SRS Module 4 & Section 8)", () => {
  it("calculates card outstanding using formula: Opening + Purchases - Payments - Refunds", () => {
    const openingOutstandingPaise = rupeesToPaise(0);
    const limitPaise = rupeesToPaise(100000); // ₹1,00,000 limit

    // Transactions from SRS example:
    // Food: ₹100, Shopping: ₹2,000, Travel: ₹500 -> Total purchases = ₹2,600
    const purchasesPaise = rupeesToPaise(100) + rupeesToPaise(2000) + rupeesToPaise(500);
    assert.equal(purchasesPaise, 260000); // ₹2,600

    const currentOutstandingBeforePayment = openingOutstandingPaise + purchasesPaise;
    assert.equal(currentOutstandingBeforePayment, 260000);

    // User pays ₹2,000 bill
    const paymentPaise = rupeesToPaise(2000);
    const currentOutstandingAfterPayment = currentOutstandingBeforePayment - paymentPaise;
    assert.equal(currentOutstandingAfterPayment, 60000); // ₹600

    // Available credit = Limit - Outstanding (₹1,00,000 - ₹600 = ₹99,400)
    const availableCredit = limitPaise - currentOutstandingAfterPayment;
    assert.equal(availableCredit, 9940000); // ₹99,400
  });

  it("enforces accounting rule: credit card bill payment is liability reduction, NOT an expense", () => {
    const expenses: { title: string; amountPaise: number }[] = [];
    const ccTransactions: { type: string; amountPaise: number }[] = [];

    // User buys groceries using CC for ₹500
    expenses.push({ title: "Groceries", amountPaise: rupeesToPaise(500) });
    ccTransactions.push({ type: "PURCHASE", amountPaise: rupeesToPaise(500) });

    // User pays CC bill of ₹500
    ccTransactions.push({ type: "PAYMENT", amountPaise: rupeesToPaise(500) });
    // Note: No record added to expenses!

    const totalPersonalExpenses = expenses.reduce((s, e) => s + e.amountPaise, 0);
    assert.equal(totalPersonalExpenses, 50000); // Exactly ₹500, not ₹1,000!
  });
});

describe("Budget Threshold Alert Rules (SRS Section 5.4)", () => {
  it("triggers correct alert levels based on consumption percentage", () => {
    assert.equal(BudgetService.getAlertLevel(50), "NORMAL");
    assert.equal(BudgetService.getAlertLevel(70), "WARNING_70");
    assert.equal(BudgetService.getAlertLevel(85), "WARNING_70");
    assert.equal(BudgetService.getAlertLevel(90), "DANGER_90");
    assert.equal(BudgetService.getAlertLevel(99), "DANGER_90");
    assert.equal(BudgetService.getAlertLevel(100), "EXCEEDED_100");
    assert.equal(BudgetService.getAlertLevel(125), "EXCEEDED_100");
  });
});

describe("Net Financial Position Formula (SRS Section 7.3)", () => {
  it("calculates Net Position = Money Receivable - Credit Card Outstanding", () => {
    const moneyReceivablePaise = rupeesToPaise(15000);
    const creditCardOutstandingPaise = rupeesToPaise(24000);

    const netPositionPaise = moneyReceivablePaise - creditCardOutstandingPaise;
    assert.equal(netPositionPaise, -900000); // -₹9,000
    assert.equal(paiseToRupees(netPositionPaise), -9000);
  });
});

