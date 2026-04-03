// apps/web/app/api/auth/me/route.ts
import { getAuthContext } from "@/lib/auth-context";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const ctx = getAuthContext(req);

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        lastLoginAt: true,
        organization: {
          select: { id: true, name: true, plan: true, slug: true, settings: true },
        },
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return Response.json(
      { error: error.message ?? "Unauthorized" },
      { status: error.status ?? 401 }
    );
  }
}
