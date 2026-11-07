import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { AIChatService } from "@/modules/ai/services/ai-chat.service";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000),
  conversationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`ai-chat:${user.userId}`, 25, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many AI requests. Please slow down and try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid chat request" },
        { status: 400 }
      );
    }

    const result = await AIChatService.sendMessage({
      userId: user.userId,
      conversationId: parsed.data.conversationId,
      message: parsed.data.message,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Chat API Error]:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while communicating with AI assistant." },
      { status: 500 }
    );
  }
}
