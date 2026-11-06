import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { DashboardService } from "@/services/dashboard.service";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await DashboardService.getDashboardData(user.userId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load dashboard data" }, { status: 500 });
  }
}

