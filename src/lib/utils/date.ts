import { format, formatDistanceToNow, isAfter, isBefore, startOfDay } from "date-fns";

export const TIMEZONE = "Asia/Kolkata";

export function formatISTDate(date: Date | string | number, formatStr: string = "dd MMM yyyy"): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "-";
  return format(d, formatStr);
}

export function formatISTDateTime(date: Date | string | number): string {
  return formatISTDate(date, "dd MMM yyyy, hh:mm a");
}

export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "-";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getDaysRemaining(dueDate: Date | string): number {
  const target = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export type DueStatus = "PAID" | "OVERDUE" | "DUE_TODAY" | "DUE_SOON" | "UPCOMING";

export function calculateDueStatus(dueDate: Date | string, isPaid: boolean): { status: DueStatus; daysLeft: number; label: string } {
  if (isPaid) {
    return { status: "PAID", daysLeft: 0, label: "Paid" };
  }
  const days = getDaysRemaining(dueDate);
  if (days < 0) {
    return { status: "OVERDUE", daysLeft: days, label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}` };
  }
  if (days === 0) {
    return { status: "DUE_TODAY", daysLeft: 0, label: "Due Today" };
  }
  if (days <= 3) {
    return { status: "DUE_SOON", daysLeft: days, label: `Due in ${days} day${days === 1 ? "" : "s"}` };
  }
  return { status: "UPCOMING", daysLeft: days, label: `Due in ${days} days` };
}

