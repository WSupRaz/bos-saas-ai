// apps/web/services/notification.service.ts
import prisma from "@/lib/db";

export async function createNotification(params: {
  userId: string;
  orgId: string;
  title: string;
  body: string;
  type?: "info" | "warning" | "error" | "success";
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      organizationId: params.orgId,
      title: params.title,
      body: params.body,
      type: params.type ?? "info",
      link: params.link ?? null,
    },
  });
}

export async function notifyOrgManagers(params: {
  orgId: string;
  title: string;
  body: string;
  type?: "info" | "warning" | "error" | "success";
  link?: string;
}) {
  const managers = await prisma.user.findMany({
    where: {
      organizationId: params.orgId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: managers.map((m) => ({
      userId: m.id,
      organizationId: params.orgId,
      title: params.title,
      body: params.body,
      type: params.type ?? "info",
      link: params.link ?? null,
    })),
  });
}
