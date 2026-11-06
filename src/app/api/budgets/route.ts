import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { BudgetService } from "@/services/budget.service";
import { budgetSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : now.getMonth() + 1;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : now.getFullYear();

    const overview = await BudgetService.getMonthlyBudgetOverview(user.userId, month, year);
    return NextResponse.json(overview);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch budget" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = budgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    const budget = await BudgetService.setBudget(user.userId, parsed.data);
    return NextResponse.json({ budget }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save budget" }, { status: 400 });
  }
}

