import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, TokenPayload, verifySessionToken } from "./jwt";

export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuthUser(): Promise<TokenPayload> {
  const user = await getSessionUser();
  if (!user || !user.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

