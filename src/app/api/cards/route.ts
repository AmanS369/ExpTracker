import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { CreditCardService } from "@/services/credit-card.service";
import { creditCardSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cards = await CreditCardService.getCardsWithLedger(user.userId);
    return NextResponse.json({ cards });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch credit cards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = creditCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    const card = await CreditCardService.createCard(user.userId, parsed.data);
    return NextResponse.json({ card }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create credit card" }, { status: 400 });
  }
}

