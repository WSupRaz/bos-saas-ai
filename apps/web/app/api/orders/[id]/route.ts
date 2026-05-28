// apps/web/app/api/orders/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { fireAutomation } from "@/services/automation.service";

const patchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  notes:  z.string().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx   = getAuthContext(req);
    requirePermission(ctx, "orders:read");

    const order = await prisma.order.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });

    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    return Response.json(order);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx  = getAuthContext(req);
    requirePermission(ctx, "orders:write");

    const body = patchSchema.parse(await req.json());

    const existing = await prisma.order.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });

    if (!existing) return Response.json({ error: "Order not found" }, { status: 404 });

    const order = await prisma.order.update({
      where: { id: params.id },
      data:  body,
    });

    if (body.status && body.status !== existing.status) {
      void fireAutomation("ORDER_STATUS_CHANGED", {
        orgId:             ctx.orgId,
        orderId:           order.id,
        orderNumber:       order.orderNumber,
        oldStatus:         existing.status,
        newStatus:         body.status,
        triggeredByUserId: ctx.userId,
      });
    }

    return Response.json(order);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "orders:delete");

    const existing = await prisma.order.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });

    if (!existing) return Response.json({ error: "Order not found" }, { status: 404 });

    await prisma.order.delete({ where: { id: params.id } });
    return Response.json({ message: "Order deleted" });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
