// apps/web/middleware.ts
import { NextRequest, NextResponse } from "next/server";

// ─── DO NOT import from ./lib/jwt ────────────────────────────────────────────
// jwt.ts uses `jsonwebtoken` which depends on Node.js `crypto`.
// Next.js middleware runs on the Edge runtime — Node.js APIs are NOT available.
// Importing jsonwebtoken here causes a silent crash → every request redirects
// to /login even with a valid cookie. Use the Web Crypto API instead.
// ─────────────────────────────────────────────────────────────────────────────

type JWTPayload = {
  userId: string;
  orgId:  string;
  role:   string;
  exp?:   number;
  iat?:   number;
};

/**
 * Verify a HS256 JWT using the Web Crypto API (Edge-compatible).
 * Returns the decoded payload on success, null on any failure.
 */
async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // base64url → base64 → plain string
    const b64 = (s: string) =>
      s.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (s.length % 4)) % 4);

    // Decode payload
    const payload = JSON.parse(atob(b64(parts[1]))) as JWTPayload;

    // Check expiry before hitting crypto (fast path)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Verify HMAC-SHA256 signature with Web Crypto API
    const enc       = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = Uint8Array.from(atob(b64(parts[2])), (c) =>
      c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      sigBytes,
      enc.encode(`${parts[0]}.${parts[1]}`)
    );

    return valid ? payload : null;
  } catch {
    return null;
  }
}

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/_next",
  "/favicon.ico",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/webhooks",
  "/api/health",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths immediately
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Extract token: Authorization header takes precedence, then cookie
  const authHeader  = req.headers.get("authorization");
  const cookieToken = req.cookies.get("bos_token")?.value;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  // No token at all
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Verify the token
  const payload = await verifyJWT(token, process.env.JWT_SECRET ?? "");

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Token expired or invalid" },
        { status: 401 }
      );
    }
    // Clear the stale cookie and redirect
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("bos_token", "", { path: "/", maxAge: 0 });
    return res;
  }

  // Inject auth context headers for API route handlers
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-user-id",   payload.userId);
  reqHeaders.set("x-org-id",    payload.orgId);
  reqHeaders.set("x-user-role", payload.role);

  return NextResponse.next({ request: { headers: reqHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
