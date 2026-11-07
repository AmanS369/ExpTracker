import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AIConversation, AIChatMessage, AIPendingAction } from "@/models";
import mongoose from "mongoose";

export async function GET(
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

    const conversation = await AIConversation.findOne({ _id: convId, userId: uId }).lean();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await AIChatMessage.find({
      userId: uId,
      conversationId: convId,
      role: { $in: ["user", "assistant"] },
    })
      .sort({ createdAt: 1 })
      .populate("pendingActionId")
      .lean();

    // Display only user-visible messages (user queries, final assistant answers, or action confirmations)
    const visibleMessages = messages.filter(
      (m) =>
        m.role === "user" ||
        (m.role === "assistant" && (m.content?.trim().length > 0 || m.pendingActionId))
    );

    return NextResponse.json({
      conversation: {
        id: conversation._id.toString(),
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: visibleMessages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        pendingAction: m.pendingActionId
          ? {
              id: (m.pendingActionId as any)._id.toString(),
              actionType: (m.pendingActionId as any).actionType,
              summaryText: (m.pendingActionId as any).summaryText,
              arguments: (m.pendingActionId as any).arguments,
              status: (m.pendingActionId as any).status,
              expiresAt: (m.pendingActionId as any).expiresAt,
            }
          : null,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load conversation" }, { status: 500 });
  }
}

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

    const res = await AIConversation.deleteOne({ _id: convId, userId: uId });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    await AIChatMessage.deleteMany({ conversationId: convId, userId: uId });
    await AIPendingAction.deleteMany({ conversationId: convId, userId: uId });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete conversation" }, { status: 500 });
  }
}

