/**
 * Monetary utilities: All monetary amounts in database are stored as integer Paise (1 INR = 100 Paise).
 * This eliminates floating-point precision issues and complies with financial ledger integrity requirements.
 */

export function rupeesToPaise(rupees: number | string): number {
  const numeric = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (isNaN(numeric)) {
    throw new Error("Invalid rupee amount");
  }
  return Math.round(numeric * 100);
}

export function paiseToRupees(paise: number): number {
  if (isNaN(paise)) return 0;
  return paise / 100;
}

export function formatINR(
  paise: number,
  options?: {
    showPaise?: boolean;
    showSign?: boolean;
    compact?: boolean;
  }
): string {
  const val = (paise || 0) / 100;
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: options?.showPaise ? 2 : 0,
    maximumFractionDigits: options?.showPaise ? 2 : 0,
    notation: options?.compact ? "compact" : "standard",
  });

  const formatted = formatter.format(absVal);
  if (options?.showSign && val > 0) {
    return `+${formatted}`;
  }
  return isNegative ? `-${formatted}` : formatted;
}

