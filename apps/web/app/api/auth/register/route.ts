// apps/web/app/api/auth/register/route.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/db";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";

const schema = z.object({
  orgName:  z.string().min(2, "Organisation name must be at least 2 characters"),
  name:     z.string().min(2, "Name must be at least 2 characters"),
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone:    z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orgName, name, email, password, phone } = result.data;

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Generate slug from org name
    const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++attempt}`;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create org + owner in a single transaction
    const { org, user } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          plan: "FREE",
          settings: {
            timezone: "Asia/Kolkata",
            currency: "INR",
          },
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          phone: phone ?? null,
          role: "OWNER",
          organizationId: org.id,
        },
      });

      return { org, user };
    });

    const accessToken  = signAccessToken({ userId: user.id, orgId: org.id, role: user.role });
    const refreshToken = signRefreshToken(user.id);

    return Response.json(
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          orgId: org.id,
          orgName: org.name,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Register]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
