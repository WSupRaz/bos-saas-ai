// apps/web/lib/jwt.ts
import jwt from "jsonwebtoken";
import type { JWTPayload } from "@bos/shared";

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

if (!ACCESS_SECRET) throw new Error("JWT_SECRET is not set");

export function signAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "7d" });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET ?? ACCESS_SECRET, {
    expiresIn: "30d",
  });
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, ACCESS_SECRET) as JWTPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_SECRET ?? ACCESS_SECRET) as {
    userId: string;
  };
}
