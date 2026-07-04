import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export type AuthPayload = {
  userId: string;
  email: string;
};

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as AuthPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromCookie(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("lifequest_token")?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}