// apps/web/app/api/rates/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

const createSchema = z.object({
  item:        z.string().min(1),
  rate:        z.number().positive(),
  unit:        z.string().default("kg"),
  source:      z.string().min(1),
  sourceType:  z.enum(["mandi","supplier","distributor"]).default("supplier"),
  recordedAt:  z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "rates:read");

    const { searchParams } = new URL(req.url);
    const item        = searchParams.get("item");
    const dateFrom    = searchParams.get("from");
    const dateTo      = searchParams.get("to");
    const sourceType  = searchParams.get("sourceType");
    const compareToday = searchParams.get("compareToday") === "true";

    const where = {
      organizationId: ctx.orgId,
      ...(item       ? { item: { contains: item, mode: "insensitive" as const } } : {}),
      ...(sourceType ? { sourceType } : {}),
      ...(dateFrom || dateTo
        ? {
            recordedAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo   ? { lte: new Date(dateTo) }   : {}),
            },
          }
        : {}),
    };

    const rates = await prisma.marketRate.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: compareToday ? 500 : 100,
    });

    // If compare mode: group by item, find best rate per item today
    if (compareToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRates = rates.filter((r) => r.recordedAt >= today);
      const grouped = todayRates.reduce<Record<string, typeof todayRates>>((acc, r) => {
        if (!acc[r.item]) acc[r.item] = [];
        acc[r.item].push(r);
        return acc;
      }, {});

      const comparison = Object.entries(grouped).map(([itemName, itemRates]) => {
        const sorted = [...itemRates].sort((a, b) => a.rate - b.rate);
        return {
          item:    itemName,
          best:    sorted[0],
          worst:   sorted[sorted.length - 1],
          all:     sorted,
          savings: sorted.length > 1 ? sorted[sorted.length - 1].rate - sorted[0].rate : 0,
        };
      });

      return Response.json({ comparison, date: today });
    }

    return Response.json({ data: rates });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "rates:submit");

    const body = createSchema.parse(await req.json());

    const rate = await prisma.marketRate.create({
      data: {
        ...body,
        recordedAt:     body.recordedAt ? new Date(body.recordedAt) : new Date(),
        organizationId: ctx.orgId,
        submittedById:  ctx.userId,
      },
    });

    return Response.json(rate, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
