// apps/web/app/api/auth/refresh/route.ts
import { NextRequest } from "next/server";
import { verifyRefreshToken, signAccessToken } from "@/lib/jwt";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json() as { refreshToken?: string };

    if (!refreshToken) {
      return Response.json({ error: "Refresh token required" }, { status: 400 });
    }

    const { userId } = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: { select: { id: true, name: true, plan: true, slug: true } },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return Response.json({ error: "User not found or inactive" }, { status: 401 });
    }

    const accessToken = signAccessToken({
      userId: user.id,
      orgId: user.organizationId,
      role: user.role,
    });

    return Response.json({
      accessToken,
      user: {
        id:      user.id,
        name:    user.name,
        email:   user.email,
        role:    user.role,
        phone:   user.phone,
        orgId:   user.organizationId,
        orgName: user.organization.name,
        orgPlan: user.organization.plan,
        orgSlug: user.organization.slug,
      },
    });
  } catch {
    return Response.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }
}
