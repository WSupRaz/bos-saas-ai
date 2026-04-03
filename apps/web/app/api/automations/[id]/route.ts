// apps/web/app/api/automations/[id]/route.ts
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "automations:write");

    const existing = await prisma.automation.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    const updated = await prisma.automation.update({
      where: { id: params.id },
      data:  {
        ...(body.name        !== undefined ? { name: body.name }               : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.active      !== undefined ? { active: body.active }           : {}),
        ...(body.trigger     !== undefined ? { trigger: body.trigger }         : {}),
        ...(body.actions     !== undefined ? { actions: body.actions }         : {}),
      },
    });

    return Response.json(updated);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "automations:write");

    const existing = await prisma.automation.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    await prisma.automation.delete({ where: { id: params.id } });
    return Response.json({ message: "Deleted" });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
