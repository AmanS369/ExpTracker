import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/models";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rateCheck = checkRateLimit(`login:${ip}`, 7, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    await connectToDatabase();
    // Generic error message to prevent account enumeration (SRS 10.7)
    const invalidCredentialsMsg = "Invalid email or password";

    const user = await User.findOne({ email: parsed.data.email });
    if (!user) {
      return NextResponse.json({ error: invalidCredentialsMsg }, { status: 401 });
    }

    const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: invalidCredentialsMsg }, { status: 401 });
    }

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
    console.error("Login error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

