import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { registerSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { ExpenseService } from "@/services/expense.service";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rateCheck = checkRateLimit(`register:${ip}`, 5, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    });

    // Seed default expense categories for new user
    await ExpenseService.ensureDefaultCategories(user._id.toString());

    const token = await createSessionToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}

