import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ExpenseService } from "@/services/expense.service";
import { expenseSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const result = await ExpenseService.getExpenses(user.userId, {
      search: searchParams.get("search") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      paymentMethod: searchParams.get("paymentMethod") || undefined,
      creditCardId: searchParams.get("creditCardId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sort: (searchParams.get("sort") as any) || "newest",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    const expense = await ExpenseService.createExpense(user.userId, parsed.data);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create expense" }, { status: 400 });
  }
}

