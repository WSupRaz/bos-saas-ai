// apps/web/app/api/inventory/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { fireAutomation } from "@/services/automation.service";

const createSchema = z.object({
  name:         z.string().min(1),
  sku:          z.string().optional(),
  description:  z.string().optional(),
  quantity:     z.number().nonnegative().default(0),
  unit:         z.string().default("units"),
  minThreshold: z.number().nonnegative().optional(),
  costPrice:    z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  category:     z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "inventory:read");

    const { searchParams } = new URL(req.url);
    const search   = searchParams.get("search");
    const category = searchParams.get("category");
    const lowStock = searchParams.get("lowStock") === "true";
    const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit    = Math.min(100, Number(searchParams.get("limit") ?? 25));

    const where = {
      organizationId: ctx.orgId,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku:  { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    let items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
    });

    if (lowStock) {
      items = items.filter(
        (i) => i.minThreshold !== null && i.quantity < i.minThreshold
      );
    }

    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return Response.json({ data: paginated, total, page, limit });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "inventory:write");

    const body = createSchema.parse(await req.json());

    const item = await prisma.inventoryItem.create({
      data: { ...body, organizationId: ctx.orgId },
    });

    return Response.json(item, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
