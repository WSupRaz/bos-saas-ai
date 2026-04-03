// apps/web/lib/auth-context.ts
import { type Role } from "@prisma/client";

export type AuthContext = {
  userId: string;
  orgId: string;
  role: Role;
};

/**
 * Extracts the auth context injected by middleware into request headers.
 * Use in API route handlers.
 */
export function getAuthContext(req: Request): AuthContext {
  const headers = req.headers;
  const userId = headers.get("x-user-id");
  const orgId = headers.get("x-org-id");
  const role = headers.get("x-user-role") as Role;

  if (!userId || !orgId || !role) {
    throw new AuthError("Unauthorized: missing auth context");
  }

  return { userId, orgId, role };
}

export class AuthError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Wraps an API handler with standardised error handling */
export function withErrorHandler(
  handler: (req: Request, ctx?: unknown) => Promise<Response>
) {
  return async (req: Request, ctx?: unknown): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      const status = error.status ?? 500;
      const message = error.message ?? "Internal server error";

      if (status === 500) {
        console.error("[API Error]", err);
      }

      return Response.json({ error: message }, { status });
    }
  };
}
