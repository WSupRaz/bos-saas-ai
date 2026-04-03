// apps/web/app/api/analytics/dashboard/route.ts
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "reports:read");

    const now     = new Date();
    const today   = new Date(now); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const last30  = new Date(today); last30.setDate(last30.getDate() - 29);
    const last7   = new Date(today); last7.setDate(last7.getDate() - 6);

    const [
      totalLeads,
      newLeadsThisWeek,
      totalOrders,
      revenueToday,
      revenueThisMonth,
      pendingTasks,
      overdueTasks,
      reportsMissing,
      activeUsers,
      lowStockItems,
      recentOrders,
      leadsByStatus,
      ordersLast30Days,
    ] = await Promise.all([
      prisma.lead.count({ where: { organizationId: ctx.orgId } }),

      prisma.lead.count({
        where: { organizationId: ctx.orgId, createdAt: { gte: last7 } },
      }),

      prisma.order.count({ where: { organizationId: ctx.orgId } }),

      prisma.order.aggregate({
        where: { organizationId: ctx.orgId, createdAt: { gte: today, lt: tomorrow } },
        _sum: { totalAmount: true },
      }),

      prisma.order.aggregate({
        where: { organizationId: ctx.orgId, createdAt: { gte: last30 } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      prisma.task.count({
        where: { organizationId: ctx.orgId, status: { in: ["PENDING","IN_PROGRESS"] } },
      }),

      prisma.task.count({
        where: { organizationId: ctx.orgId, status: { in: ["PENDING","IN_PROGRESS"] }, dueAt: { lt: now } },
      }),

      // Employees who haven't submitted today
      (async () => {
        const users = await prisma.user.findMany({
          where: { organizationId: ctx.orgId, status: "ACTIVE", role: { in: ["EMPLOYEE","VENDOR","DISTRIBUTOR"] } },
          select: { id: true },
        });
        const submitted = await prisma.report.findMany({
          where: { organizationId: ctx.orgId, date: { gte: today, lt: tomorrow } },
          select: { submittedById: true },
        });
        const ids = new Set(submitted.map((r) => r.submittedById));
        return users.filter((u) => !ids.has(u.id)).length;
      })(),

      prisma.user.count({ where: { organizationId: ctx.orgId, status: "ACTIVE" } }),

      prisma.inventoryItem.count({
        where: {
          organizationId: ctx.orgId,
          minThreshold: { not: null },
          // Prisma doesn't support field comparisons directly — filter in app
        },
      }).then(async () => {
        const items = await prisma.inventoryItem.findMany({
          where: { organizationId: ctx.orgId, minThreshold: { not: null } },
          select: { quantity: true, minThreshold: true },
        });
        return items.filter((i) => i.quantity < i.minThreshold!).length;
      }),

      prisma.order.findMany({
        where: { organizationId: ctx.orgId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { orderNumber: true, totalAmount: true, status: true, createdAt: true },
      }),

      prisma.lead.groupBy({
        by: ["status"],
        where: { organizationId: ctx.orgId },
        _count: { id: true },
      }),

      // Orders per day for last 30 days chart
      prisma.order.findMany({
        where: { organizationId: ctx.orgId, createdAt: { gte: last30 } },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build daily revenue chart data
    const dailyRevenue: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(last30);
      d.setDate(d.getDate() + i);
      dailyRevenue[d.toISOString().slice(0, 10)] = 0;
    }
    for (const order of ordersLast30Days) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (key in dailyRevenue) dailyRevenue[key] += order.totalAmount;
    }

    return Response.json({
      stats: {
        totalLeads,
        newLeadsThisWeek,
        totalOrders,
        revenueToday:      revenueToday._sum.totalAmount ?? 0,
        revenueThisMonth:  revenueThisMonth._sum.totalAmount ?? 0,
        ordersThisMonth:   revenueThisMonth._count.id,
        pendingTasks,
        overdueTasks,
        reportsMissing,
        activeUsers,
        lowStockItems,
      },
      charts: {
        leadsByStatus: leadsByStatus.map((l) => ({ status: l.status, count: l._count.id })),
        dailyRevenue:  Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
      },
      recent: { orders: recentOrders },
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
