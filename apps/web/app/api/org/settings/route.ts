// apps/web/app/api/org/settings/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const ctx = getAuthContext(req);

    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { id: true, name: true, slug: true, plan: true, logoUrl: true, settings: true },
    });

    if (!org) return Response.json({ error: "Organisation not found" }, { status: 404 });

    return Response.json(org);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

const updateSchema = z.object({
  name:     z.string().min(2).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "settings:manage");

    const body = updateSchema.parse(await req.json());

    const current = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { settings: true },
    });

    const currentSettings = (current?.settings as Record<string, unknown>) ?? {};

    const org = await prisma.organization.update({
      where: { id: ctx.orgId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        settings: {
          ...currentSettings,
          ...(body.timezone ? { timezone: body.timezone } : {}),
          ...(body.currency ? { currency: body.currency } : {}),
        },
      },
      select: { id: true, name: true, slug: true, plan: true, settings: true },
    });

    return Response.json(org);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
