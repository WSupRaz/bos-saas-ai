// apps/web/app/api/leads/[id]/route.ts
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { fireAutomation } from "@/services/automation.service";

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "leads:read");

    const lead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
      include: {
        activities: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
        messages:   { orderBy: { createdAt: "desc" }, take: 20 },
        tasks:      { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

    return Response.json(lead);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

const updateSchema = z.object({
  name:         z.string().min(1).optional(),
  phone:        z.string().optional().nullable(),
  email:        z.string().email().optional().nullable(),
  company:      z.string().optional().nullable(),
  status:       z.enum(["NEW","CONTACTED","QUALIFIED","PROPOSAL","NEGOTIATION","CLOSED_WON","CLOSED_LOST"]).optional(),
  source:       z.string().optional().nullable(),
  tags:         z.array(z.string()).optional(),
  notes:        z.string().optional().nullable(),
  value:        z.number().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  followUpAt:   z.string().datetime().optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "leads:write");

    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });
    if (!existing) return Response.json({ error: "Lead not found" }, { status: 404 });

    const body = updateSchema.parse(await req.json());

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...body,
        followUpAt: body.followUpAt ? new Date(body.followUpAt) : body.followUpAt,
      },
    });

    // Fire status change event if status was updated
    if (body.status && body.status !== existing.status) {
      void fireAutomation("LEAD_STATUS_CHANGED", {
        orgId:     ctx.orgId,
        leadId:    updated.id,
        phone:     updated.phone ?? "",
        name:      updated.name,
        oldStatus: existing.status,
        newStatus: updated.status,
        triggeredByUserId: ctx.userId,
      });
    }

    return Response.json(updated);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "leads:delete");

    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });
    if (!existing) return Response.json({ error: "Lead not found" }, { status: 404 });

    await prisma.lead.delete({ where: { id: params.id } });

    return Response.json({ message: "Lead deleted" });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
