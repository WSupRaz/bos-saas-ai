// apps/web/app/api/reports/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";
import { fireAutomation } from "@/services/automation.service";
import { notifyOrgManagers } from "@/services/notification.service";

const submitSchema = z.object({
  type: z.enum(["DAILY_WORK","VENDOR_RATE","DISTRIBUTOR_SALES","STOCK_UPDATE","EXPENSE"]),
  data: z.record(z.unknown()),
  notes: z.string().optional(),
  date:  z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "reports:read");

    const { searchParams } = new URL(req.url);
    const type        = searchParams.get("type");
    const submittedById = searchParams.get("userId");
    const dateFrom    = searchParams.get("from");
    const dateTo      = searchParams.get("to");
    const page        = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit       = Math.min(50, Number(searchParams.get("limit") ?? 20));

    const where = {
      organizationId: ctx.orgId,
      ...(type ? { type: type as never } : {}),
      ...(submittedById ? { submittedById } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo   ? { lte: new Date(dateTo) }   : {}),
            },
          }
        : {}),
    };

    const [reports, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          submittedBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return Response.json({ data: reports, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "reports:submit");

    const body = submitSchema.parse(await req.json());

    const report = await prisma.report.create({
      data: {
        type:           body.type,
        data:           body.data,
        notes:          body.notes ?? null,
        date:           body.date ? new Date(body.date) : new Date(),
        submittedById:  ctx.userId,
        organizationId: ctx.orgId,
        source:         "APP",
      },
      include: {
        submittedBy: { select: { name: true, role: true } },
      },
    });

    // Fire automation event
    void fireAutomation("REPORT_SUBMITTED", {
      orgId:             ctx.orgId,
      reportId:          report.id,
      type:              report.type,
      submittedById:     ctx.userId,
      triggeredByUserId: ctx.userId,
    });

    // If stock update, check thresholds and fire STOCK_LOW if needed
    if (body.type === "STOCK_UPDATE") {
      const stockData = body.data as { itemId?: string; quantity?: number };
      if (stockData.itemId && stockData.quantity !== undefined) {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: stockData.itemId },
        });
        if (item) {
          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: stockData.quantity },
          });

          if (item.minThreshold && stockData.quantity < item.minThreshold) {
            void fireAutomation("STOCK_LOW", {
              orgId:     ctx.orgId,
              itemId:    item.id,
              itemName:  item.name,
              quantity:  stockData.quantity,
              threshold: item.minThreshold,
              unit:      item.unit,
              triggeredByUserId: ctx.userId,
            });

            await notifyOrgManagers({
              orgId:  ctx.orgId,
              title:  "Low Stock Alert",
              body:   `${item.name} is at ${stockData.quantity} ${item.unit} (min: ${item.minThreshold})`,
              type:   "warning",
              link:   "/inventory",
            });
          }
        }
      }
    }

    return Response.json(report, { status: 201 });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
