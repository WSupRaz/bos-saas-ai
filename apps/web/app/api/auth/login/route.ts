// apps/web/app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/db";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: { id: true, name: true, plan: true, slug: true },
        },
      },
    });

    if (!user) {
      // Timing-safe: still hash to prevent user enumeration
      await bcrypt.hash(password, 12);
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return Response.json(
        { error: "Your account has been suspended. Contact your administrator." },
        { status: 403 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken  = signAccessToken({
      userId: user.id,
      orgId: user.organizationId,
      role: user.role,
    });
    const refreshToken = signRefreshToken(user.id);

    return Response.json({
      accessToken,
      refreshToken,
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
  } catch (err) {
    console.error("[Login]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
