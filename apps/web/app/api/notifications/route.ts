// apps/web/app/api/notifications/route.ts
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";

export async function GET(req: Request) {
  try {
    const ctx = getAuthContext(req);

    const notifications = await prisma.notification.findMany({
      where:   { userId: ctx.userId, organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      take:    50,
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return Response.json({ data: notifications, unreadCount });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = getAuthContext(req);
    const { ids, markAll } = await req.json() as { ids?: string[]; markAll?: boolean };

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: ctx.userId, organizationId: ctx.orgId, read: false },
        data:  { read: true },
      });
    } else if (ids?.length) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: ctx.userId },
        data:  { read: true },
      });
    }

    return Response.json({ message: "Updated" });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
