import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { AIChatService } from "@/modules/ai/services/ai-chat.service";
import { getAIConversationTTLSeconds } from "@/modules/ai/config/ai.config";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await AIChatService.getActiveSession(user.userId);
    return NextResponse.json({
      ...session,
      ttlSeconds: getAIConversationTTLSeconds(),
    });
  } catch (err: any) {
    console.error("[AI Session GET Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load active session" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await AIChatService.clearActiveSession(user.userId);
    return NextResponse.json({ success: true, message: "Active session cleared." });
  } catch (err: any) {
    console.error("[AI Session DELETE Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to clear active session" },
      { status: 500 }
    );
  }
}

