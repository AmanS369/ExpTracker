import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { CreditCardService } from "@/services/credit-card.service";
import { creditCardPaymentSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = creditCardPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    const tx = await CreditCardService.recordPayment(user.userId, parsed.data);
    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record payment" }, { status: 400 });
  }
}

