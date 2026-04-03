// apps/web/app/api/orders/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { fireAutomation } from "@/services/automation.service";

const orderItemSchema = z.object({
  name:            z.string(),
  qty:             z.number().positive(),
  unit:            z.string(),
  price:           z.number().nonnegative(),
  inventoryItemId: z.string().optional(),
});

const createSchema = z.object({
  items:         z.array(orderItemSchema).min(1),
  notes:         z.string().optional(),
  vendorId:      z.string().optional(),
  distributorId: z.string().optional(),
  tax:           z.number().nonnegative().default(0),
});

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${date}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "orders:read");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit  = Math.min(50, Number(searchParams.get("limit") ?? 20));

    const where = {
      organizationId: ctx.orgId,
      ...(status ? { status: status as never } : {}),
      // Vendors/distributors see only their assigned orders
      ...(ctx.role === "VENDOR"
        ? { vendorId: ctx.userId }
        : ctx.role === "DISTRIBUTOR"
        ? { distributorId: ctx.userId }
        : {}),
    };

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return Response.json({ data: orders, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "orders:write");

    const body = createSchema.parse(await req.json());

    const subtotal    = body.items.reduce((s, i) => s + i.qty * i.price, 0);
    const totalAmount = subtotal + body.tax;

    const order = await prisma.order.create({
      data: {
        orderNumber:    generateOrderNumber(),
        items:          body.items,
        subtotal,
        tax:            body.tax,
        totalAmount,
        notes:          body.notes ?? null,
        vendorId:       body.vendorId ?? null,
        distributorId:  body.distributorId ?? null,
        organizationId: ctx.orgId,
      },
    });

    void fireAutomation("ORDER_PLACED", {
      orgId:   ctx.orgId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total:   order.totalAmount,
      triggeredByUserId: ctx.userId,
    });

    return Response.json(order, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
