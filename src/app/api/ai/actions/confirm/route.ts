import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ToolExecutionService } from "@/modules/ai/services/tool-execution.service";
import { z } from "zod";

const confirmSchema = z.object({
  actionId: z.string().min(1, "Action ID is required"),
  confirmed: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    if (parsed.data.confirmed) {
      const result = await ToolExecutionService.confirmPendingAction(user.userId, parsed.data.actionId);
      return NextResponse.json({
        success: true,
        status: "CONFIRMED",
        message: "Transaction successfully executed and confirmed.",
        details: result,
      });
    } else {
      const result = await ToolExecutionService.cancelPendingAction(user.userId, parsed.data.actionId);
      return NextResponse.json({
        success: true,
        status: "CANCELLED",
        message: "Action cancelled.",
        details: result,
      });
    }
  } catch (err: any) {
    console.error("[Action Confirmation Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to process action" }, { status: 400 });
  }
}

