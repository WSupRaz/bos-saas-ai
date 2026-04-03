// apps/web/app/api/users/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

const inviteSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  role:     z.enum(["ADMIN","MANAGER","EMPLOYEE","VENDOR","DISTRIBUTOR"]),
  phone:    z.string().optional(),
  password: z.string().min(8).default("Bos@12345"),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "users:read");

    const { searchParams } = new URL(req.url);
    const role   = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const users = await prisma.user.findMany({
      where: {
        organizationId: ctx.orgId,
        ...(role   ? { role: role as never }     : {}),
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { name:  { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id:          true,
        name:        true,
        email:       true,
        role:        true,
        status:      true,
        phone:       true,
        avatarUrl:   true,
        lastLoginAt: true,
        createdAt:   true,
      },
      orderBy: { name: "asc" },
    });

    return Response.json({ data: users });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "users:manage");

    const body = inviteSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name:           body.name,
        email:          body.email,
        passwordHash:   await bcrypt.hash(body.password, 12),
        role:           body.role,
        phone:          body.phone ?? null,
        organizationId: ctx.orgId,
      },
      select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    });

    // TODO: Send invite email with credentials

    return Response.json(user, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
