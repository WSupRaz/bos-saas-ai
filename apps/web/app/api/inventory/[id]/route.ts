// apps/web/app/api/inventory/[id]/route.ts
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { fireAutomation } from "@/services/automation.service";
import { notifyOrgManagers } from "@/services/notification.service";

type Params = { params: { id: string } };

const updateSchema = z.object({
  name:         z.string().min(1).optional(),
  quantity:     z.number().nonnegative().optional(),
  minThreshold: z.number().nonnegative().optional().nullable(),
  costPrice:    z.number().nonnegative().optional().nullable(),
  sellingPrice: z.number().nonnegative().optional().nullable(),
  category:     z.string().optional().nullable(),
  sku:          z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "inventory:write");

    const existing = await prisma.inventoryItem.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });
    if (!existing) return Response.json({ error: "Item not found" }, { status: 404 });

    const body = updateSchema.parse(await req.json());

    const updated = await prisma.inventoryItem.update({
      where: { id: params.id },
      data:  body,
    });

    // Check threshold after quantity update
    if (
      body.quantity !== undefined &&
      updated.minThreshold !== null &&
      updated.quantity < updated.minThreshold
    ) {
      void fireAutomation("STOCK_LOW", {
        orgId:     ctx.orgId,
        itemId:    updated.id,
        itemName:  updated.name,
        quantity:  updated.quantity,
        threshold: updated.minThreshold,
        unit:      updated.unit,
        triggeredByUserId: ctx.userId,
      });

      await notifyOrgManagers({
        orgId:  ctx.orgId,
        title:  "Low Stock Alert",
        body:   `${updated.name} is at ${updated.quantity} ${updated.unit} (min: ${updated.minThreshold})`,
        type:   "warning",
        link:   "/inventory",
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
    requirePermission(ctx, "inventory:write");

    const existing = await prisma.inventoryItem.findFirst({
      where: { id: params.id, organizationId: ctx.orgId },
    });
    if (!existing) return Response.json({ error: "Item not found" }, { status: 404 });

    await prisma.inventoryItem.delete({ where: { id: params.id } });
    return Response.json({ message: "Deleted" });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
