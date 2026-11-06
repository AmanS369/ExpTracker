import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { LendingService } from "@/services/lending.service";
import { personSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const details = await LendingService.getPersonDetails(user.userId, id);
    return NextResponse.json(details);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch person details" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const parsed = personSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    const updated = await LendingService.updatePerson(user.userId, id, parsed.data);
    return NextResponse.json({ person: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update person" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    await LendingService.deletePerson(user.userId, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete person" }, { status: 400 });
  }
}

