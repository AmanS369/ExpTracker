import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { LendingService } from "@/services/lending.service";
import { personSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const people = await LendingService.getPeopleWithBalances(user.userId);
    const summary = await LendingService.getLendingDashboardSummary(user.userId);

    return NextResponse.json({ people, summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch people" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = personSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    const person = await LendingService.createPerson(user.userId, parsed.data);
    return NextResponse.json({ person }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create person" }, { status: 400 });
  }
}

