// apps/web/app/api/reports/summary/route.ts
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const ctx = getAuthContext(req);
    requirePermission(ctx, "reports:read");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // All active employees/vendors/distributors who should submit
    const reporters = await prisma.user.findMany({
      where: {
        organizationId: ctx.orgId,
        status: "ACTIVE",
        role: { in: ["EMPLOYEE", "VENDOR", "DISTRIBUTOR", "MANAGER"] },
      },
      select: { id: true, name: true, role: true, avatarUrl: true },
    });

    // Who submitted today
    const todayReports = await prisma.report.findMany({
      where: {
        organizationId: ctx.orgId,
        date: { gte: today, lt: tomorrow },
      },
      select: { submittedById: true, type: true },
    });

    const submittedIds = new Set(todayReports.map((r) => r.submittedById));

    const submitted = reporters.filter((u) => submittedIds.has(u.id));
    const missing   = reporters.filter((u) => !submittedIds.has(u.id));

    // Count per report type today
    const typeCounts = todayReports.reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1;
      return acc;
    }, {});

    return Response.json({
      date:       today.toISOString(),
      total:      reporters.length,
      submitted:  submitted.length,
      missing:    missing.length,
      submittedUsers: submitted,
      missingUsers:   missing,
      typeCounts,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
