import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AIConversation, AIChatMessage, AIPendingAction } from "@/models";
import mongoose from "mongoose";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    await connectToDatabase();
    const uId = new mongoose.Types.ObjectId(user.userId);
    const convId = new mongoose.Types.ObjectId(id);

    const conv = await AIConversation.findOne({ _id: convId, userId: uId });
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    await AIChatMessage.deleteMany({ conversationId: convId, userId: uId });
    await AIPendingAction.deleteMany({ conversationId: convId, userId: uId });

    return NextResponse.json({ success: true, message: "Conversation history cleared" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to clear conversation" }, { status: 500 });
  }
}

